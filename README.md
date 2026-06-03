# Dave v0.1

A private Cloudflare Pages + D1 app for pasting audience feedback, scoring review signals, and tracking what actually landed.

## What it does

- Create projects such as `Escape`, `The Others`, `Let Them Eat Cake`
- Paste raw review text directly into the app
- Auto-detect reviewer name when possible
- Generate scorecards:
  - Song Stands Alone
  - Entertainment
  - World-building
  - Curiosity
  - Story Pull
  - Memorability
  - Synergy
  - Resistance Overcome
  - Friction
  - Porter Score
- Click a card to see reviewer evidence snippets, date/time, and optional source link
- Store everything in Cloudflare D1
- Simple URL token gate using `?x=TOKEN`

## Local install

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173/?x=2343546
```

The default local token is `2343546` unless changed with `VITE_APP_TOKEN`.

## Cloudflare setup

Create a D1 database:

```bash
npx wrangler d1 create dave-db
```

Copy the returned database id into `wrangler.toml`.

Initialize the database:

```bash
npx wrangler d1 execute dave-db --remote --file=./db/schema.sql
```

Set Cloudflare Pages environment variables:

```text
VITE_APP_TOKEN=your-secret-url-token
VITE_TOKEN_PARAM=x
```

Deploy to Cloudflare Pages as normal.

Open with:

```text
https://your-site.pages.dev/?x=your-secret-url-token
```

Without the right URL parameter, the app renders a blank lock screen.

## Notes

This first version uses a local heuristic analyser rather than a paid LLM API. That makes it fast, private-ish, and free to run. The scoring criteria are intentionally easy to tune over time.
# Dave
# Dave


## Token debug build

If Dave shows a locked page, it now displays safe diagnostics for the URL gate.

For the current public URL, Cloudflare Pages should have these build variables set before deploy:

- `VITE_TOKEN_PARAM=darling`
- `VITE_APP_TOKEN=BigDaveRules2026`

Important: Vite variables are baked into the client bundle at build time. After changing Cloudflare Variables and Secrets, redeploy the Pages project.
