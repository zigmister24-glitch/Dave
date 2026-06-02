interface Env { DB: D1Database }
const json = (data: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(data), { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } });
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get('project_id'));
  if (!projectId) return json({ error: 'project_id is required' }, { status: 400 });
  const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first();
  const { results: reviews } = await env.DB.prepare('SELECT * FROM reviews WHERE project_id = ? ORDER BY id DESC').bind(projectId).all();
  const { results: cards } = await env.DB.prepare(`
    SELECT s.*, r.reviewer, r.raw_text, r.source_url, r.created_at AS review_created_at
    FROM scorecards s JOIN reviews r ON r.id = s.review_id
    WHERE r.project_id = ?
    ORDER BY s.card_name, r.id DESC
  `).bind(projectId).all();
  const { results: evidence } = await env.DB.prepare(`
    SELECT e.*, s.card_key, s.card_name, s.review_id, r.reviewer, r.source_url, r.created_at AS review_created_at
    FROM evidence e
    JOIN scorecards s ON s.id = e.scorecard_id
    JOIN reviews r ON r.id = s.review_id
    WHERE r.project_id = ?
    ORDER BY e.id DESC
  `).bind(projectId).all();
  return json({ project, reviews, cards, evidence });
};
