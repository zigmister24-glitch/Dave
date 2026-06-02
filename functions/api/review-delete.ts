interface Env { DB: D1Database }
const json = (data: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(data), { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } });
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<any>();
  const id = Number(body.id);
  if (!id) return json({ error: 'id is required' }, { status: 400 });
  await env.DB.prepare('DELETE FROM evidence WHERE scorecard_id IN (SELECT id FROM scorecards WHERE review_id = ?)').bind(id).run();
  await env.DB.prepare('DELETE FROM scorecards WHERE review_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
  return json({ ok: true });
};
