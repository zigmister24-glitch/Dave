interface Env { DB: D1Database }
const json = (data: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(data), { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } });
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY updated_at DESC, id DESC').all();
  return json({ projects: results });
};
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<any>();
  const name = String(body.name || '').trim();
  if (!name) return json({ error: 'Project name is required' }, { status: 400 });
  const artist = String(body.artist || '').trim();
  const notes = String(body.notes || '').trim();
  const res = await env.DB.prepare('INSERT INTO projects (name, artist, notes) VALUES (?, ?, ?)').bind(name, artist, notes).run();
  return json({ id: res.meta.last_row_id, name, artist, notes });
};
