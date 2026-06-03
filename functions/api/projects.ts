interface Env { DB: D1Database }
const json = (data: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(data), { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } });

async function ensureProjectColumns(db: D1Database) {
  await db.prepare("ALTER TABLE projects ADD COLUMN youtube_url TEXT DEFAULT ''").run().catch(() => {});
  await db.prepare("ALTER TABLE projects ADD COLUMN release_date TEXT DEFAULT ''").run().catch(() => {});
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  await ensureProjectColumns(env.DB);
  const { results } = await env.DB.prepare(`
    SELECT
      p.*,
      COUNT(DISTINCT r.id) AS review_count,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key != 'friction' THEN s.score END)), 0) AS overall_signal,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key != 'friction' THEN s.confidence END)), 0) AS confidence,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key = 'porter' THEN s.score END)), 0) AS porter,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key = 'curiosity' THEN s.score END)), 0) AS curiosity,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key = 'story' THEN s.score END)), 0) AS story,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key = 'synergy' THEN s.score END)), 0) AS synergy,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key = 'resistance' THEN s.score END)), 0) AS resistance,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key = 'entertainment' THEN s.score END)), 0) AS entertainment,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key = 'world' THEN s.score END)), 0) AS world,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key = 'memorability' THEN s.score END)), 0) AS memorability,
      COALESCE(ROUND(AVG(CASE WHEN s.card_key = 'friction' THEN s.score END)), 0) AS friction,
      MAX(r.created_at) AS last_reviewed_at
    FROM projects p
    LEFT JOIN reviews r ON r.project_id = p.id
    LEFT JOIN scorecards s ON s.review_id = r.id
    GROUP BY p.id
    ORDER BY overall_signal DESC, review_count DESC, p.updated_at DESC, p.id DESC
  `).all();
  return json({ projects: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  await ensureProjectColumns(env.DB);
  const body = await request.json<any>();
  const name = String(body.name || '').trim();
  if (!name) return json({ error: 'Project name is required' }, { status: 400 });
  const artist = String(body.artist || '').trim();
  const notes = String(body.notes || '').trim();
  const youtubeUrl = String(body.youtube_url || '').trim();
  const releaseDate = String(body.release_date || '').trim();

  const existing = await env.DB.prepare('SELECT * FROM projects WHERE lower(name) = lower(?) LIMIT 1').bind(name).first<any>();
  if (existing?.id) {
    await env.DB.prepare(`
      UPDATE projects
      SET name = ?,
          artist = CASE WHEN ? != '' THEN ? ELSE artist END,
          notes = CASE WHEN ? != '' THEN ? ELSE notes END,
          youtube_url = CASE WHEN ? != '' THEN ? ELSE youtube_url END,
          release_date = CASE WHEN ? != '' THEN ? ELSE release_date END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, artist, artist, notes, notes, youtubeUrl, youtubeUrl, releaseDate, releaseDate, existing.id).run();
    const project = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(existing.id).first();
    return json(project);
  }

  const res = await env.DB.prepare('INSERT INTO projects (name, artist, notes, youtube_url, release_date) VALUES (?, ?, ?, ?, ?)')
    .bind(name, artist, notes, youtubeUrl, releaseDate).run();
  return json({ id: res.meta.last_row_id, name, artist, notes, youtube_url: youtubeUrl, release_date: releaseDate });
};
