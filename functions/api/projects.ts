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
  const res = await env.DB.prepare('INSERT INTO projects (name, artist, notes, youtube_url, release_date) VALUES (?, ?, ?, ?, ?)')
    .bind(name, artist, notes, youtubeUrl, releaseDate).run();
  return json({ id: res.meta.last_row_id, name, artist, notes, youtube_url: youtubeUrl, release_date: releaseDate });
};
