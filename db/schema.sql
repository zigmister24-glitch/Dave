CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  artist TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  release_date TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  reviewer TEXT DEFAULT 'Unknown Reviewer',
  source_url TEXT DEFAULT '',
  raw_text TEXT NOT NULL,
  summary TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scorecards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL,
  card_key TEXT NOT NULL,
  card_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  confidence INTEGER NOT NULL,
  reasoning TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(review_id) REFERENCES reviews(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scorecard_id INTEGER NOT NULL,
  quote TEXT NOT NULL,
  sentiment TEXT DEFAULT 'neutral',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(scorecard_id) REFERENCES scorecards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_project ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_review ON scorecards(review_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_key ON scorecards(card_key);
