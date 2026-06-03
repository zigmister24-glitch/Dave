import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Brain, Eye, Film, Flame, Gauge, Lock, MessageSquare, Plus, Radio, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import './styles.css';

type Project = { id: number; name: string; artist?: string; notes?: string };
type Review = { id: number; reviewer: string; raw_text: string; summary: string; source_url?: string; created_at: string };
type Scorecard = { id: number; review_id: number; card_key: string; card_name: string; score: number; confidence: number; reasoning: string; reviewer: string; raw_text: string; source_url?: string; review_created_at: string };
type Evidence = { id: number; scorecard_id: number; card_key: string; card_name: string; review_id: number; reviewer: string; quote: string; sentiment: string; source_url?: string; review_created_at: string };
type Dashboard = { project: Project | null; reviews: Review[]; cards: Scorecard[]; evidence: Evidence[] };

const APP_VERSION = '0.2-token-debug';
const TOKEN = import.meta.env.VITE_APP_TOKEN || '2343546';
const TOKEN_PARAM = import.meta.env.VITE_TOKEN_PARAM || 'x';

function maskValue(value: string | null) {
  if (!value) return '(missing)';
  if (value.length <= 4) return '••••';
  return `${value.slice(0, 2)}${'•'.repeat(Math.max(2, value.length - 4))}${value.slice(-2)}`;
}

function tokenDiagnostics() {
  const params = new URLSearchParams(window.location.search);
  const actual = params.get(TOKEN_PARAM);
  const allParams = [...params.entries()].map(([key, value]) => ({ key, value }));
  return {
    tokenParam: TOKEN_PARAM,
    expectedTokenLength: TOKEN.length,
    actualTokenLength: actual?.length || 0,
    actualMasked: maskValue(actual),
    match: actual === TOKEN,
    allParams
  };
}

const iconMap: Record<string, React.ReactNode> = {
  song: <Radio size={18} />, entertainment: <Sparkles size={18} />, world: <Film size={18} />, curiosity: <Eye size={18} />,
  story: <MessageSquare size={18} />, memorability: <Brain size={18} />, synergy: <BarChart3 size={18} />, resistance: <Flame size={18} />,
  friction: <Gauge size={18} />, porter: <Gauge size={18} />
};

function gateOpen() {
  return tokenDiagnostics().match;
}
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { 'content-type': 'application/json', ...(options?.headers || {}) } });
  if (!res.ok) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(data.error || res.statusText);
}
  return res.json();
}
function scoreClass(score: number, key?: string) {
  if (key === 'friction') return score >= 70 ? 'bad' : score >= 40 ? 'warn' : 'good';
  return score >= 85 ? 'great' : score >= 70 ? 'good' : score >= 50 ? 'warn' : 'bad';
}
function avg(nums: number[]) { return nums.length ? Math.round(nums.reduce((a,b)=>a+b,0) / nums.length) : 0; }
function groupCards(cards: Scorecard[]) {
  const map = new Map<string, { key: string; name: string; avg: number; confidence: number; reasoning: string; count: number }>();
  const keys = [...new Set(cards.map(c => c.card_key))];
  keys.forEach(key => {
    const list = cards.filter(c => c.card_key === key);
    map.set(key, { key, name: list[0]?.card_name || key, avg: avg(list.map(c => c.score)), confidence: avg(list.map(c => c.confidence)), reasoning: list[0]?.reasoning || '', count: list.length });
  });
  return [...map.values()].sort((a,b) => (a.key === 'porter' ? -1 : b.avg - a.avg));
}
function seedText() {
  return `Andy Dolphin\nR7: well that was a treat! Nice catchy melody and mix sounds spot on, everything clear and in its place. The talking during the song could be met with mixed opinions, but I see it as if it’s a scene in a film with a song playing over. And yes, I get the ‘hello darling’ bit 😄`;
}

function App() {
  const [locked] = useState(!gateOpen());
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [newProject, setNewProject] = useState('Escape');
  const [artist, setArtist] = useState('The Unspoken Misfits');
  const [raw, setRaw] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [dashboard, setDashboard] = useState<Dashboard>({ project: null, reviews: [], cards: [], evidence: [] });
  const [selected, setSelected] = useState<string>('porter');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedEvidence = useMemo(() => dashboard.evidence.filter(e => e.card_key === selected), [dashboard.evidence, selected]);
  const selectedCards = useMemo(() => dashboard.cards.filter(c => c.card_key === selected), [dashboard.cards, selected]);
  const cardGroups = useMemo(() => groupCards(dashboard.cards), [dashboard.cards]);
  const overall = useMemo(() => {
    const list = cardGroups.filter(c => !['friction'].includes(c.key));
    return avg(list.map(c => c.avg));
  }, [cardGroups]);

  async function loadProjects() {
    if (locked) return;
    const data = await api<{projects: Project[]}>('/api/projects');
    setProjects(data.projects);
    if (!projectId && data.projects[0]) setProjectId(data.projects[0].id);
  }
  async function loadDashboard(id = projectId) {
    if (!id) return;
    const data = await api<Dashboard>(`/api/dashboard?project_id=${id}`);
    setDashboard(data);
    if (!selected && data.cards[0]) setSelected(data.cards[0].card_key);
  }
  async function createProject() {
    setBusy(true); setError('');
    try {
      const p = await api<Project>('/api/projects', { method: 'POST', body: JSON.stringify({ name: newProject, artist }) });
      await loadProjects(); setProjectId(p.id); await loadDashboard(p.id);
    } catch (e:any) { setError(e.message); } finally { setBusy(false); }
  }
  async function addReview() {
    if (!projectId || !raw.trim()) return;
    setBusy(true); setError('');
    try {
      await api('/api/reviews', { method: 'POST', body: JSON.stringify({ project_id: projectId, raw_text: raw, reviewer, source_url: sourceUrl }) });
      setRaw(''); setReviewer(''); setSourceUrl(''); await loadDashboard(projectId);
    } catch (e:any) { setError(e.message); } finally { setBusy(false); }
  }
  async function deleteReview(id: number) {
    if (!confirm('Delete this review and its scorecards?')) return;
    setBusy(true);
    try { await api('/api/review-delete', { method: 'POST', body: JSON.stringify({ id }) }); await loadDashboard(projectId); }
    finally { setBusy(false); }
  }

  useEffect(() => { loadProjects().catch(e => setError(e.message)); }, []);
  useEffect(() => { if (projectId) loadDashboard(projectId).catch(e => setError(e.message)); }, [projectId]);

  if (locked) {
    const diag = tokenDiagnostics();
    return <div className="locked">
      <div className="lockPanel">
        <div className="lockIcon"><Lock size={22} /></div>
        <h1>Dave is locked</h1>
        <p>The URL token did not match the Cloudflare build variables.</p>
        <div className="diagGrid">
          <div><span>App version</span><b>{APP_VERSION}</b></div>
          <div><span>Expected param name</span><b>{diag.tokenParam}</b></div>
          <div><span>Expected token length</span><b>{diag.expectedTokenLength}</b></div>
          <div><span>URL token length</span><b>{diag.actualTokenLength}</b></div>
          <div><span>URL token masked</span><b>{diag.actualMasked}</b></div>
          <div><span>Token match</span><b>{diag.match ? 'YES' : 'NO'}</b></div>
        </div>
        <div className="paramBox">
          <b>URL parameters seen by Dave</b>
          {diag.allParams.length === 0
            ? <code>none</code>
            : diag.allParams.map(({ key, value }) => <code key={key}>{key}={maskValue(value)}</code>)}
        </div>
        <p className="lockHint">Cloudflare Pages note: VITE_* values are baked in at build time. After changing Variables and Secrets, redeploy the site. For your current URL, Cloudflare should have <code>VITE_TOKEN_PARAM=darling</code> and <code>VITE_APP_TOKEN=BigDaveRules2026</code>.</p>
      </div>
    </div>;
  }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandMark">D</div><div><h1>Dave</h1><p>Audience Decoder {APP_VERSION}</p></div></div>
      <label>Project</label>
      <select value={projectId || ''} onChange={e => setProjectId(Number(e.target.value))}>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="newProject">
        <input value={newProject} onChange={e => setNewProject(e.target.value)} placeholder="Project name" />
        <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist" />
        <button onClick={createProject} disabled={busy}><Plus size={16}/> New Project</button>
      </div>
      <button className="ghost" onClick={() => projectId && loadDashboard(projectId)}><RefreshCw size={16}/> Refresh</button>
      <div className="hint"><b>URL gate:</b><br/>Set <code>VITE_APP_TOKEN</code> and open with <code>?{TOKEN_PARAM}=token</code>.</div>
    </aside>

    <main>
      <section className="hero">
        <div><p className="eyebrow">{dashboard.project?.artist || 'Audience signal'}</p><h2>{dashboard.project?.name || 'No Project Selected'}</h2></div>
        <div className={`overall ${scoreClass(overall)}`}><span>{overall}%</span><small>Overall Signal</small></div>
      </section>
      {error && <div className="error">{error}</div>}

      <section className="grid cards">
        {cardGroups.map(card => <button key={card.key} className={`card ${scoreClass(card.avg, card.key)} ${selected === card.key ? 'selected' : ''}`} onClick={() => setSelected(card.key)}>
          <div className="cardTop"><span>{iconMap[card.key] || <Gauge size={18}/>}</span><b>{card.name}</b></div>
          <div className="score">{card.avg}%</div>
          <div className="mini">{card.count} reviews · confidence {card.confidence}%</div>
          <p>{card.reasoning}</p>
        </button>)}
      </section>

      <section className="panel twoCol">
        <div>
          <h3>Paste Feedback</h3>
          <p className="muted">Paste the raw Facebook review. First line can be the reviewer name. The app will score and store the evidence.</p>
          <div className="row"><input value={reviewer} onChange={e=>setReviewer(e.target.value)} placeholder="Reviewer override (optional)"/><input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="Link to full feedback (optional)"/></div>
          <textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder={seedText()} />
          <div className="actions"><button onClick={addReview} disabled={busy || !projectId || !raw.trim()}><Sparkles size={16}/> Add & Analyse</button><button className="ghost" onClick={()=>setRaw(seedText())}>Load example</button></div>
        </div>
        <div>
          <h3>{cardGroups.find(c=>c.key===selected)?.name || 'Evidence'} Evidence</h3>
          <p className="muted">Snippets that generated this card. Click source links when you add them.</p>
          <div className="evidenceList">
            {selectedEvidence.length === 0 && <div className="empty">No evidence yet. Paste a review and let Dave have a look.</div>}
            {selectedEvidence.map(e => <div className={`evidence ${e.sentiment}`} key={e.id}>
              <div><b>{e.reviewer}</b><span>{new Date(e.review_created_at).toLocaleString()}</span></div>
              <p>“{e.quote}”</p>
              {e.source_url && <a href={e.source_url} target="_blank">Open full feedback</a>}
            </div>)}
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Reviews</h3>
        <div className="reviewList">
          {dashboard.reviews.map(r => <article key={r.id} className="review">
            <div className="reviewHead"><b>{r.reviewer}</b><span>{new Date(r.created_at).toLocaleString()}</span><button onClick={()=>deleteReview(r.id)} className="iconBtn"><Trash2 size={15}/></button></div>
            <p className="summary">{r.summary}</p>
            <details><summary>Full feedback</summary><pre>{r.raw_text}</pre></details>
          </article>)}
        </div>
      </section>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
