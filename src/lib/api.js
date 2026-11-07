/**
 * src/lib/api.js
 *
 * Public reads use raw fetch (bypasses Supabase JS client init issues).
 * Admin writes still use the Supabase client (needs auth session).
 * Column-name mapping:
 *   DB `description`  →  JS `desc`     (projects)
 *   DB `read_time`    →  JS `readTime` (blogs)
 */
import { supabase, supabasePublic } from "./supabase";

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

// ── User management (admin only) ────────────────────────────

export async function getUsers() {
  const { data, error } = await supabasePublic
    .from("user_projects")
    .select("user_id, email, role, created_at")
    .eq("project", "portfolio")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, id: row.user_id }));
}

export async function updateUser(userId, updates) {
  const allowed = {};
  if (updates.role !== undefined) allowed.role = updates.role;
  const { data, error } = await supabasePublic
    .from("user_projects")
    .update(allowed)
    .eq("user_id", userId)
    .eq("project", "portfolio")
    .select("user_id, email, role, created_at")
    .single();
  if (error) throw error;
  return { ...data, id: data.user_id };
}

export async function adminCreateUser(email, password, role) {
  const { data: signUpData, error: signUpError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (signUpError) throw signUpError;
  const userId = signUpData.user.id;
  const resolvedRole = role === "admin" ? "admin" : "member";
  const { error: upsertError } = await supabasePublic
    .from("user_projects")
    .upsert(
      { user_id: userId, project: "portfolio", email, role: resolvedRole },
      { onConflict: "user_id,project" },
    );
  if (upsertError) throw upsertError;
  return signUpData.user;
}

export async function adminDeleteUser(userId) {
  const { error } = await supabase.rpc("admin_delete_user", {
    p_user_id: userId,
  });
  if (error) throw error;
}
