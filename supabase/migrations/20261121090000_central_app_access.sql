-- Central app access for the shared core project.
--
-- public.user_projects is the only record of who may use which app. Nothing is
-- granted automatically: a new account has no access until an admin grants it,
-- or the account joins an app that allows self sign-up (public.join_app).
-- Every app's RLS checks public.has_app_access(), so an account made for one
-- app cannot read or write another app's data.

-- ── 1. App registry ─────────────────────────────────────────────────────────

create table if not exists public.apps (
  slug        text primary key check (slug ~ '^[a-z][a-z0-9_-]{1,31}$'),
  name        text not null,
  url         text,
  self_signup boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.apps enable row level security;

insert into public.apps (slug, name, self_signup) values
  ('portfolio', 'Portfolio', false),
  ('bookshelf', 'Bookshelf', false),
  ('jlptprep',  'JLPT Prep', true)   -- keeps its current open sign-up
on conflict (slug) do nothing;

-- Adding an app is now an insert, not a constraint change.
alter table public.user_projects drop constraint if exists user_projects_project_check;
alter table public.user_projects drop constraint if exists user_projects_project_fkey;
alter table public.user_projects
  add constraint user_projects_project_fkey
  foreign key (project) references public.apps (slug) on update cascade;

-- ── 2. Platform admins (manage users across every app) ──────────────────────

create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

insert into public.platform_admins (user_id)
select user_id from public.user_projects
where project = 'portfolio' and role = 'admin'
on conflict (user_id) do nothing;

-- ── 3. Access helpers ───────────────────────────────────────────────────────

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function public.is_project_admin(p_project text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_projects
    where user_id = auth.uid() and project = p_project and role = 'admin'
  );
$$;

create or replace function public.has_app_access(p_app text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.user_projects up
    join public.apps a on a.slug = up.project
    where up.user_id = auth.uid() and up.project = p_app and a.active
  );
$$;

-- ── 3b. Access requests ─────────────────────────────────────────────────────
-- Signing in to an invite-only app without access leaves a pending request
-- for the admins. Requests are written only by the functions below.

create table if not exists public.access_requests (
  user_id      uuid not null references auth.users (id) on delete cascade,
  app          text not null references public.apps (slug) on update cascade on delete cascade,
  email        text not null default '',
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'denied')),
  requested_at timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references auth.users (id) on delete set null,
  primary key (user_id, app)
);

alter table public.access_requests enable row level security;

create index if not exists access_requests_pending_idx
  on public.access_requests (app) where status = 'pending';

-- Called by an app after sign-in. Returns the caller's role, joining as a
-- member only when the app allows self sign-up. Returns null when there is no
-- access, so the app can show a "no access" screen; for an invite-only app it
-- also files an access request (once — a denied request stays denied).
create or replace function public.join_app(p_app text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if not exists (select 1 from public.apps where slug = p_app and active) then
    return null;
  end if;

  select role into v_role
  from public.user_projects
  where user_id = v_uid and project = p_app;

  if v_role is not null then
    return v_role;
  end if;

  if not exists (select 1 from public.apps where slug = p_app and self_signup) then
    insert into public.access_requests (user_id, app, email)
    select v_uid, p_app, coalesce(u.email, '')
    from auth.users u where u.id = v_uid
    on conflict (user_id, app) do nothing;
    return null;
  end if;

  insert into public.user_projects (user_id, project, role, email)
  select v_uid, p_app, 'member', coalesce(u.email, '')
  from auth.users u where u.id = v_uid
  on conflict (user_id, project) do nothing;

  return 'member';
end;
$$;

-- ── 4. Mirror memberships into the JWT (app_metadata.apps) ─────────────────
-- Apps can gate routes from the session without a query (bookshelf already
-- does). The claim refreshes with the token; RLS uses the table, so a revoke
-- takes effect on data immediately.

create or replace function public.sync_app_claims()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid;
  v_apps jsonb;
begin
  v_uid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;

  select coalesce(jsonb_agg(project order by project), '[]'::jsonb)
  into v_apps
  from public.user_projects
  where user_id = v_uid;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                          || jsonb_build_object('apps', v_apps)
  where id = v_uid
    and (raw_app_meta_data -> 'apps') is distinct from v_apps;

  return null;
end;
$$;

drop trigger if exists user_projects_sync_claims on public.user_projects;
create trigger user_projects_sync_claims
  after insert or update of project, user_id or delete on public.user_projects
  for each row execute function public.sync_app_claims();

update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('apps', coalesce(
       (select jsonb_agg(up.project order by up.project)
        from public.user_projects up where up.user_id = u.id),
       '[]'::jsonb))
where (u.raw_app_meta_data -> 'apps') is distinct from coalesce(
       (select jsonb_agg(up.project order by up.project)
        from public.user_projects up where up.user_id = u.id),
       '[]'::jsonb);

-- ── 5. Stop granting access to every new account ───────────────────────────
-- bookshelf's triggers stay: they only seed bookshelf.users once the
-- "bookshelf" claim is present, which now follows a granted membership.

drop trigger if exists on_auth_user_created_portfolio on auth.users;
drop trigger if exists on_auth_user_created_jlptprep  on auth.users;
drop function if exists portfolio.handle_new_user();
drop function if exists jlptprep.handle_new_user();

alter function bookshelf.handle_new_user() set search_path = '';

-- ── 6. RLS on the shared tables ────────────────────────────────────────────

drop policy if exists "Project admins manage project memberships" on public.user_projects;
drop policy if exists "Users read own memberships"                on public.user_projects;
drop policy if exists "Members read own memberships"              on public.user_projects;
drop policy if exists "Admins manage memberships"                 on public.user_projects;

create policy "Members read own memberships"
  on public.user_projects for select to authenticated
  using (user_id = (select auth.uid()));

-- Platform admins manage every app; an app admin manages only their app.
create policy "Admins manage memberships"
  on public.user_projects for all to authenticated
  using      (public.is_platform_admin() or public.is_project_admin(project))
  with check (public.is_platform_admin() or public.is_project_admin(project));

drop policy if exists "Signed-in users read apps"   on public.apps;
drop policy if exists "Platform admins manage apps" on public.apps;

create policy "Signed-in users read apps"
  on public.apps for select to authenticated
  using (true);

create policy "Platform admins manage apps"
  on public.apps for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Platform admins read platform admins" on public.platform_admins;
create policy "Platform admins read platform admins"
  on public.platform_admins for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "Users read own access requests" on public.access_requests;
drop policy if exists "Admins read access requests"    on public.access_requests;

create policy "Users read own access requests"
  on public.access_requests for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins read access requests"
  on public.access_requests for select to authenticated
  using (public.is_platform_admin() or public.is_project_admin(app));

revoke all on public.user_projects, public.apps, public.platform_admins, public.access_requests from anon;
revoke truncate, references, trigger on public.user_projects, public.apps from authenticated;
revoke all on public.platform_admins, public.access_requests from authenticated;
grant select on public.platform_admins, public.access_requests to authenticated;

-- ── 7. Every app's data requires membership of that app ────────────────────

alter policy "jlptprep members manage own review history" on jlptprep.review_history
  to authenticated
  using      (user_id = (select auth.uid()) and (select public.has_app_access('jlptprep')))
  with check (user_id = (select auth.uid()) and (select public.has_app_access('jlptprep')));

alter policy "jlptprep members manage own study items" on jlptprep.study_items
  to authenticated
  using      (user_id = (select auth.uid()) and (select public.has_app_access('jlptprep')))
  with check (user_id = (select auth.uid()) and (select public.has_app_access('jlptprep')));

alter policy "users can read own preferences" on jlptprep.user_preferences
  to authenticated
  using (user_id = (select auth.uid()) and (select public.has_app_access('jlptprep')));

alter policy "users can update own preferences" on jlptprep.user_preferences
  to authenticated
  using (user_id = (select auth.uid()) and (select public.has_app_access('jlptprep')));

alter policy "users can upsert own preferences" on jlptprep.user_preferences
  to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_app_access('jlptprep')));

alter policy "users: own row only" on bookshelf.users
  to authenticated
  using (id = (select auth.uid()) and (select public.has_app_access('bookshelf')));

alter policy "books: own rows only" on bookshelf.books
  to authenticated
  using (user_id = (select auth.uid()) and (select public.has_app_access('bookshelf')));

alter policy "copies: own rows only" on bookshelf.copies
  to authenticated
  using (
    (select public.has_app_access('bookshelf'))
    and book_id in (select b.id from bookshelf.books b where b.user_id = (select auth.uid()))
  );

alter policy "read_cycles: own rows only" on bookshelf.read_cycles
  to authenticated
  using (
    (select public.has_app_access('bookshelf'))
    and book_id in (select b.id from bookshelf.books b where b.user_id = (select auth.uid()))
  );

alter policy "lent_cycles: own rows only" on bookshelf.lent_cycles
  to authenticated
  using (
    (select public.has_app_access('bookshelf'))
    and copy_id in (
      select c.id from bookshelf.copies c
      join bookshelf.books b on b.id = c.book_id
      where b.user_id = (select auth.uid())
    )
  );

alter policy "borrow_cycles: own rows only" on bookshelf.borrow_cycles
  to authenticated
  using (
    (select public.has_app_access('bookshelf'))
    and copy_id in (
      select c.id from bookshelf.copies c
      join bookshelf.books b on b.id = c.book_id
      where b.user_id = (select auth.uid())
    )
  );

alter policy "given_records: own rows only" on bookshelf.given_records
  to authenticated
  using (
    (select public.has_app_access('bookshelf'))
    and copy_id in (
      select c.id from bookshelf.copies c
      join bookshelf.books b on b.id = c.book_id
      where b.user_id = (select auth.uid())
    )
  );

-- portfolio.profiles is admin-only; anon never needs it.
alter policy "Admins read all profiles" on portfolio.profiles to authenticated;
alter policy "Admins update profiles"   on portfolio.profiles to authenticated;
alter policy "Admins delete profiles"   on portfolio.profiles to authenticated;
alter policy "Users read own profile"   on portfolio.profiles to authenticated;

-- anon only ever reads published portfolio content.
revoke insert, update, delete, truncate, references, trigger
  on portfolio.blogs, portfolio.projects from anon;
revoke all on portfolio.profiles from anon;
revoke all on all tables in schema jlptprep  from anon;
revoke all on all tables in schema bookshelf from anon;

-- ── 8. Admin RPCs (platform admins) ────────────────────────────────────────
-- Replace the portfolio-only versions.

drop function if exists portfolio.admin_create_user(text, text, text, text, jsonb);
drop function if exists portfolio.admin_delete_user(uuid);

create or replace function public.admin_list_users()
returns table (
  user_id           uuid,
  email             text,
  created_at        timestamptz,
  last_sign_in_at   timestamptz,
  is_platform_admin boolean,
  access            jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin access required' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    exists (select 1 from public.platform_admins pa where pa.user_id = u.id),
    coalesce(
      (select jsonb_object_agg(up.project, up.role)
       from public.user_projects up where up.user_id = u.id),
      '{}'::jsonb)
  from auth.users u
  order by u.created_at;
end;
$$;

-- p_role: 'admin' | 'member' grants or changes access; null removes it.
create or replace function public.admin_set_access(p_user_id uuid, p_app text, p_role text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not (public.is_platform_admin() or public.is_project_admin(p_app)) then
    raise exception 'Admin access to % required', p_app using errcode = '42501';
  end if;

  if p_user_id = auth.uid() and p_app = 'portfolio' then
    raise exception 'You cannot change your own portfolio access';
  end if;

  if p_role is not null and p_role not in ('admin', 'member') then
    raise exception 'Invalid role: %', p_role;
  end if;

  if not exists (select 1 from public.apps where slug = p_app) then
    raise exception 'Unknown app: %', p_app;
  end if;

  if p_role is null then
    delete from public.user_projects where user_id = p_user_id and project = p_app;
    return;
  end if;

  insert into public.user_projects (user_id, project, role, email)
  select u.id, p_app, p_role, coalesce(u.email, '')
  from auth.users u where u.id = p_user_id
  on conflict (user_id, project) do update
    set role = excluded.role, email = excluded.email, updated_at = now();

  if not found then
    raise exception 'User not found';
  end if;

  -- Granting access answers any open request for it.
  update public.access_requests
  set status = 'approved', decided_at = now(), decided_by = auth.uid()
  where user_id = p_user_id and app = p_app and status = 'pending';
end;
$$;

-- Approve a request with admin_set_access(user, app, role); this denies it.
create or replace function public.admin_deny_request(p_user_id uuid, p_app text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not (public.is_platform_admin() or public.is_project_admin(p_app)) then
    raise exception 'Admin access to % required', p_app using errcode = '42501';
  end if;

  update public.access_requests
  set status = 'denied', decided_at = now(), decided_by = auth.uid()
  where user_id = p_user_id and app = p_app and status = 'pending';
end;
$$;

-- p_access: {"<app slug>": "admin" | "member", ...}
-- Writes auth rows in the shape GoTrue expects: empty-string tokens (NULL
-- breaks sign-in), lowercase email, provider_id = user id.
create or replace function public.admin_create_user(
  p_email    text,
  p_password text,
  p_access   jsonb default '{}'::jsonb
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  new_id  uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_app   text;
  v_role  text;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin access required' using errcode = '42501';
  end if;

  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'A valid email is required';
  end if;

  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'An account with this email already exists. Change its access in the table instead.';
  end if;

  for v_app, v_role in select key, value from jsonb_each_text(coalesce(p_access, '{}'::jsonb)) loop
    if v_role not in ('admin', 'member') then
      raise exception 'Invalid role % for %', v_role, v_app;
    end if;
    if not exists (select 1 from public.apps where slug = v_app) then
      raise exception 'Unknown app: %', v_app;
    end if;
  end loop;

  insert into auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    created_at, updated_at
  ) values (
    new_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"apps":[]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '',
    now(), now()
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data,
    provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), new_id, new_id::text,
    jsonb_build_object(
      'sub', new_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email', now(), now(), now()
  );

  insert into public.user_projects (user_id, project, role, email)
  select new_id, key, value, v_email
  from jsonb_each_text(coalesce(p_access, '{}'::jsonb));

  return new_id;
end;
$$;

-- Deletes the account everywhere (auth.users cascades to memberships and
-- per-app profile rows). To take away one app only, use admin_set_access.
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin access required' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

-- ── 9. Function privileges ──────────────────────────────────────────────────
-- Supabase grants EXECUTE to anon by default; nothing here is for anon.

revoke execute on function
  public.is_platform_admin(),
  public.is_project_admin(text),
  public.has_app_access(text),
  public.join_app(text),
  public.admin_list_users(),
  public.admin_set_access(uuid, text, text),
  public.admin_deny_request(uuid, text),
  public.admin_create_user(text, text, jsonb),
  public.admin_delete_user(uuid),
  public.sync_app_claims(),
  public.rls_auto_enable(),
  portfolio.is_admin(),
  bookshelf.is_admin(),
  jlptprep.is_admin(),
  bookshelf.handle_new_user()
from public, anon;

grant execute on function
  public.is_platform_admin(),
  public.is_project_admin(text),
  public.has_app_access(text),
  public.join_app(text),
  public.admin_list_users(),
  public.admin_set_access(uuid, text, text),
  public.admin_deny_request(uuid, text),
  public.admin_create_user(text, text, jsonb),
  public.admin_delete_user(uuid),
  portfolio.is_admin(),
  bookshelf.is_admin(),
  jlptprep.is_admin()
to authenticated;

revoke execute on function
  public.sync_app_claims(),
  public.rls_auto_enable(),
  bookshelf.handle_new_user()
from authenticated;

alter function portfolio.is_admin() set search_path = '';
alter function bookshelf.is_admin() set search_path = '';
alter function jlptprep.is_admin()  set search_path = '';
