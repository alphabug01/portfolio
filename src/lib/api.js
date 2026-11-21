/**
 * src/lib/api.js
 *
 * Public reads use raw fetch (bypasses Supabase JS client init issues).
 * Admin writes still use the Supabase client (needs auth session).
 * Column-name mapping:
 *   DB `description`  →  JS `desc`     (projects)
 *   DB `read_time`    →  JS `readTime` (blogs)
 */
import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Raw authenticated fetch to Supabase REST API (no JS client needed). */
async function restFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Accept-Profile": "portfolio",
    },
  });
  if (!res.ok)
    throw new Error(`Supabase REST error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── helpers ──────────────────────────────────────────────────

/** Convert a DB project row to the shape components expect. */
function toProject(row) {
  if (!row) return null;
  const { description: desc, ...rest } = row;
  return { ...rest, desc };
}

/** Convert a DB blog row to the shape components expect. */
function toBlog(row) {
  if (!row) return null;
  const { read_time: readTime, ...rest } = row;
  return { ...rest, readTime };
}

/** Convert a component project object to DB columns before insert/update. */
function fromProject({ desc, ...rest }) {
  return { ...rest, description: desc ?? "" };
}

/** Convert a component blog object to DB columns before insert/update. */
function fromBlog({ readTime, ...rest }) {
  return { ...rest, read_time: readTime ?? "5 min read" };
}

/**
 * Fetch the signed-in user's portfolio role (or null) and whether they are a
 * platform admin, who manages users across every app.
 * Uses raw fetch with the session token: this runs inside the
 * onAuthStateChange callback, where a Supabase client query deadlocks on the
 * auth lock.
 */
export async function getMyAccess(userId, accessToken) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`,
  };
  const [roleRes, adminRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/user_projects?select=role&user_id=eq.${userId}&project=eq.portfolio&limit=1`,
      { headers: { ...headers, "Accept-Profile": "public" } },
    ),
    fetch(`${SUPABASE_URL}/rest/v1/rpc/is_platform_admin`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Profile": "public",
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
  ]);
  if (!roleRes.ok)
    throw new Error(`Supabase REST error ${roleRes.status}: ${await roleRes.text()}`);
  const rows = await roleRes.json();
  return {
    role: rows[0]?.role ?? null,
    isPlatformAdmin: adminRes.ok ? (await adminRes.json()) === true : false,
  };
}

// ── Public reads ─────────────────────────────────────────────

export async function getProjects() {
  const data = await restFetch("projects?select=*&order=sort_order.asc");
  return (data ?? []).map(toProject);
}

export async function getProjectBySlug(slug) {
  const data = await restFetch(
    `projects?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  if (!data?.length) throw new Error("Project not found");
  return toProject(data[0]);
}

export async function getBlogs() {
  const data = await restFetch("blogs?select=*&order=sort_order.asc");
  return (data ?? []).map(toBlog);
}

export async function getBlogBySlug(slug) {
  const data = await restFetch(
    `blogs?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  if (!data?.length) throw new Error("Blog post not found");
  return toBlog(data[0]);
}

// ── Admin writes (require authenticated Supabase session) ────

export async function createProject(projectData) {
  const payload = fromProject(projectData);
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return toProject(data);
}

export async function updateProject(slug, updates) {
  const payload = fromProject(updates);
  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("slug", slug)
    .select()
    .single();
  if (error) throw error;
  return toProject(data);
}

export async function deleteProject(slug) {
  const { error } = await supabase.from("projects").delete().eq("slug", slug);
  if (error) throw error;
}

export async function createBlog(blogData) {
  const payload = fromBlog(blogData);
  const { data, error } = await supabase
    .from("blogs")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return toBlog(data);
}

export async function updateBlog(slug, updates) {
  const payload = fromBlog(updates);
  const { data, error } = await supabase
    .from("blogs")
    .update(payload)
    .eq("slug", slug)
    .select()
    .single();
  if (error) throw error;
  return toBlog(data);
}

export async function deleteBlog(slug) {
  const { error } = await supabase.from("blogs").delete().eq("slug", slug);
  if (error) throw error;
}

// ── User & app access (platform admins) ─────────────────────
// The shared tables live in the `public` schema of the core project.
// public.user_projects is the only record of who may use which app.

const core = () => supabase.schema("public");

/** All registered apps, oldest first. */
export async function getApps() {
  const { data, error } = await core()
    .from("apps")
    .select("slug, name, url, self_signup, active, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createApp({ slug, name, url, self_signup }) {
  const { data, error } = await core()
    .from("apps")
    .insert({ slug, name, url: url || null, self_signup: !!self_signup })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** updates: any of { name, url, self_signup, active }. */
export async function updateApp(slug, updates) {
  const { data, error } = await core()
    .from("apps")
    .update(updates)
    .eq("slug", slug)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Every account in the core project with its access:
 * { id, email, created_at, last_sign_in_at, is_platform_admin, access: { [app]: 'admin' | 'member' } }
 */
export async function getPlatformUsers() {
  const { data, error } = await core().rpc("admin_list_users");
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, id: row.user_id }));
}

/** role: 'admin' | 'member' grants or changes access; null removes it. */
export async function setUserAccess(userId, app, role) {
  const { error } = await core().rpc("admin_set_access", {
    p_user_id: userId,
    p_app: app,
    p_role: role || null,
  });
  if (error) throw error;
}

/** Pending requests from people who signed in to an invite-only app. */
export async function getAccessRequests() {
  const { data, error } = await core()
    .from("access_requests")
    .select("user_id, app, email, requested_at")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Approve with setUserAccess(userId, app, role); this denies the request. */
export async function denyAccessRequest(userId, app) {
  const { error } = await core().rpc("admin_deny_request", {
    p_user_id: userId,
    p_app: app,
  });
  if (error) throw error;
}

/** access: { [app]: 'admin' | 'member' }. Apps left out get no access. */
export async function adminCreateUser(email, password, access) {
  const { data, error } = await core().rpc("admin_create_user", {
    p_email: email,
    p_password: password,
    p_access: access,
  });
  if (error) throw error;
  return data;
}

/** Deletes the account from every app. */
export async function adminDeleteUser(userId) {
  const { error } = await core().rpc("admin_delete_user", {
    p_user_id: userId,
  });
  if (error) throw error;
}
