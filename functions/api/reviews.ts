import { analyzeReview } from '../_utils/analyzer';
interface Env { DB: D1Database }
const json = (data: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(data), { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } });
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get('project_id'));
  if (!projectId) return json({ error: 'project_id is required' }, { status: 400 });
  const { results: reviews } = await env.DB.prepare('SELECT * FROM reviews WHERE project_id = ? ORDER BY id DESC').bind(projectId).all();
  return json({ reviews });
};
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<any>();
  const projectId = Number(body.project_id);
  const raw = String(body.raw_text || '').trim();
  const sourceUrl = String(body.source_url || '').trim();
  if (!projectId || !raw) return json({ error: 'project_id and raw_text are required' }, { status: 400 });
  const analysis = analyzeReview(raw);
  const reviewer = String(body.reviewer || analysis.reviewer || 'Unknown Reviewer').trim();
  const reviewRes = await env.DB.prepare('INSERT INTO reviews (project_id, reviewer, source_url, raw_text, summary) VALUES (?, ?, ?, ?, ?)')
    .bind(projectId, reviewer, sourceUrl, raw, analysis.summary).run();
  const reviewId = reviewRes.meta.last_row_id as number;
  for (const card of analysis.cards) {
    const cardRes = await env.DB.prepare('INSERT INTO scorecards (review_id, card_key, card_name, score, confidence, reasoning) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(reviewId, card.key, card.name, card.score, card.confidence, card.reasoning).run();
    const cardId = cardRes.meta.last_row_id as number;
    for (const ev of card.evidence) {
      await env.DB.prepare('INSERT INTO evidence (scorecard_id, quote, sentiment) VALUES (?, ?, ?)').bind(cardId, ev.quote, ev.sentiment).run();
    }
  }
  await env.DB.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(projectId).run();
  return json({ review_id: reviewId, reviewer, analysis });
};
