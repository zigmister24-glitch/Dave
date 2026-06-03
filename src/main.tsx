import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Brain, ExternalLink, Eye, Film, Flame, Gauge, Lock, MessageSquare, Plus, Radio, Sparkles, Trash2 } from 'lucide-react';
import './styles.css';

type Project = { id: number; name: string; artist?: string; notes?: string; youtube_url?: string; release_date?: string; review_count?: number; overall_signal?: number; last_reviewed_at?: string };
type Review = { id: number; reviewer: string; raw_text: string; summary: string; source_url?: string; created_at: string };
type Scorecard = { id: number; review_id: number; card_key: string; card_name: string; score: number; confidence: number; reasoning: string; reviewer: string; raw_text: string; source_url?: string; review_created_at: string };
type Evidence = { id: number; scorecard_id: number; card_key: string; card_name: string; review_id: number; reviewer: string; quote: string; sentiment: string; source_url?: string; review_created_at: string };
type Dashboard = { project: Project | null; reviews: Review[]; cards: Scorecard[]; evidence: Evidence[] };

const TOKEN = import.meta.env.VITE_APP_TOKEN || '2343546';
const TOKEN_PARAM = import.meta.env.VITE_TOKEN_PARAM || 'x';

const iconMap: Record<string, React.ReactNode> = {
  song: <Radio size={18} />, entertainment: <Sparkles size={18} />, world: <Film size={18} />, curiosity: <Eye size={18} />,
  story: <MessageSquare size={18} />, memorability: <Brain size={18} />, synergy: <BarChart3 size={18} />, resistance: <Flame size={18} />,
  friction: <Gauge size={18} />, porter: <Gauge size={18} />
};

function gateOpen() {
  const params = new URLSearchParams(window.location.search);
  return params.get(TOKEN_PARAM) === TOKEN;
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
function safeDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function youtubeHref(url?: string) {
  if (!url) return '';
  try { return new URL(url).toString(); } catch { return ''; }
}

function App() {
  const [locked] = useState(!gateOpen());
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [newProject, setNewProject] = useState('Escape');
  const [artist, setArtist] = useState('The Unspoken Misfits');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [raw, setRaw] = useState('');
  const [dashboard, setDashboard] = useState<Dashboard>({ project: null, reviews: [], cards: [], evidence: [] });
  const [selected, setSelected] = useState<string>('porter');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedEvidence = useMemo(() => dashboard.evidence.filter(e => e.card_key === selected), [dashboard.evidence, selected]);
  const cardGroups = useMemo(() => groupCards(dashboard.cards), [dashboard.cards]);
  const overall = useMemo(() => {
    const list = cardGroups.filter(c => !['friction'].includes(c.key));
    return avg(list.map(c => c.avg));
  }, [cardGroups]);
  const projectVideo = youtubeHref(dashboard.project?.youtube_url);

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
      const p = await api<Project>('/api/projects', { method: 'POST', body: JSON.stringify({ name: newProject, artist, youtube_url: youtubeUrl, release_date: releaseDate }) });
      setNewProject(''); setYoutubeUrl(''); setReleaseDate('');
      await loadProjects(); setProjectId(p.id); await loadDashboard(p.id);
    } catch (e:any) { setError(e.message); } finally { setBusy(false); }
  }
  async function addReview() {
    if (!projectId || !raw.trim()) return;
    setBusy(true); setError('');
    try {
      await api('/api/reviews', { method: 'POST', body: JSON.stringify({ project_id: projectId, raw_text: raw, reviewer: '', source_url: '' }) });
      setRaw(''); await loadDashboard(projectId); await loadProjects();
    } catch (e:any) { setError(e.message); } finally { setBusy(false); }
  }
  async function deleteReview(id: number) {
    if (!confirm('Delete this review and its scorecards?')) return;
    setBusy(true);
    try { await api('/api/review-delete', { method: 'POST', body: JSON.stringify({ id }) }); await loadDashboard(projectId); await loadProjects(); }
    finally { setBusy(false); }
  }

  useEffect(() => { loadProjects().catch(e => setError(e.message)); }, []);
  useEffect(() => { if (projectId) loadDashboard(projectId).catch(e => setError(e.message)); }, [projectId]);

  if (locked) return <div className="locked"><Lock size={22} /></div>;

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandMark">D</div><div><h1>Dave</h1><p>Audience Decoder v0.4</p></div></div>
      <label>Projects</label>
      <div className="projectList">
        {projects.map(p => <button key={p.id} className={`projectRow ${projectId === p.id ? 'active' : ''} ${scoreClass(Number(p.overall_signal || 0))}`} onClick={() => setProjectId(p.id)}>
          <span><b>{p.name}</b><small>{p.artist || 'Unknown artist'} · {Number(p.review_count || 0)} reviews</small></span>
          <strong>{Number(p.overall_signal || 0)}%</strong>
        </button>)}
      </div>
      <div className="newProject">
        <label>New project</label>
        <input value={newProject} onChange={e => setNewProject(e.target.value)} placeholder="Project name" />
        <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist" />
        <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="YouTube URL" />
        <input value={releaseDate} onChange={e => setReleaseDate(e.target.value)} placeholder="Release date" type="date" />
        <button onClick={createProject} disabled={busy || !newProject.trim()}><Plus size={16}/> New Project</button>
      </div>
    </aside>

    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">{dashboard.project?.artist || 'Audience signal'}</p>
          <h2>{dashboard.project?.name || 'No Project Selected'}</h2>
          {projectVideo && <a className="watchLink" href={projectVideo} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Open on YouTube</a>}
        </div>
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
          <p className="muted">Paste the raw review. First line can be the reviewer name. Dave will score and store the evidence.</p>
          <textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder={seedText()} />
          <div className="actions"><button onClick={addReview} disabled={busy || !projectId || !raw.trim()}><Sparkles size={16}/> Add & Analyse</button></div>
        </div>
        <div>
          <h3>{cardGroups.find(c=>c.key===selected)?.name || 'Evidence'} Evidence</h3>
          <p className="muted">Snippets that generated this card. The witness statements, basically.</p>
          <div className="evidenceList">
            {selectedEvidence.length === 0 && <div className="empty">No evidence yet. Dave remains unconvinced.</div>}
            {selectedEvidence.map(e => <div className={`evidence ${e.sentiment}`} key={e.id}>
              <div><b>{e.reviewer}</b>{safeDate(e.review_created_at) && <span>{safeDate(e.review_created_at)}</span>}</div>
              <p>“{e.quote}”</p>
            </div>)}
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Reviews</h3>
        <div className="reviewList">
          {dashboard.reviews.map(r => <article key={r.id} className="review">
            <div className="reviewHead"><b>{r.reviewer}</b>{safeDate(r.created_at) && <span>{safeDate(r.created_at)}</span>}<button onClick={()=>deleteReview(r.id)} className="iconBtn"><Trash2 size={15}/></button></div>
            <p className="summary">{r.summary}</p>
            <details><summary>Full feedback</summary><pre>{r.raw_text}</pre></details>
          </article>)}
        </div>
      </section>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
