-- 1. Fix infinite recursion (42P17): these policies queried user_projects from
--    a policy on user_projects. is_project_admin() is SECURITY DEFINER, so it
--    reads the table without re-entering RLS. FOR ALL also covers SELECT, so the
--    separate read policy is no longer needed.
drop policy if exists "Project admins manage project memberships" on public.user_projects;
drop policy if exists "Project admins read project memberships" on public.user_projects;

create policy "Project admins manage project memberships"
  on public.user_projects
  for all
  to authenticated
  using (public.is_project_admin(project))
  with check (public.is_project_admin(project));

-- 2. Accept admin/member, and write auth rows in the shape GoTrue expects:
--    empty-string tokens (NULL breaks sign-in), lowercase email, and
--    provider_id = user id.
create or replace function portfolio.admin_create_user(
  p_email text,
  p_password text,
  p_display_name text default null::text,
  p_role text default 'member'::text,
  p_permissions jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_id  uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_role  text := case when p_role = 'admin' then 'admin' else 'member' end;
begin
  if not portfolio.is_admin() then
    raise exception 'Admin access required';
  end if;

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
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', coalesce(p_display_name, '')),
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

  -- Row created by trigger. profiles still uses the legacy role values.
  update portfolio.profiles
  set role         = case when v_role = 'admin' then 'admin' else 'viewer' end,
      display_name = coalesce(p_display_name, ''),
      permissions  = coalesce(p_permissions, '{}'::jsonb)
  where id = new_id;

  insert into public.user_projects (user_id, project, role, email)
  values (new_id, 'portfolio', v_role, v_email)
  on conflict (user_id, project) do update
    set role = excluded.role, email = excluded.email;

  return new_id;
end;
$function$;

-- 3. auth.users is shared across apps and its foreign keys cascade, so remove
--    the portfolio membership only. Delete the account just when no other
--    project still uses it.
create or replace function portfolio.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not portfolio.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Cannot delete your own account';
  end if;

  delete from public.user_projects
  where user_id = p_user_id and project = 'portfolio';

  delete from portfolio.profiles where id = p_user_id;

  if not exists (select 1 from public.user_projects where user_id = p_user_id) then
    delete from auth.users where id = p_user_id;
  end if;
end;
$function$;
