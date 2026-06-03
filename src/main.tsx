import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Brain, ChevronLeft, ExternalLink, Eye, Film, Flame, Gauge, Lock, MessageSquare, Plus, Radio, Save, Sparkles, Trash2, X } from 'lucide-react';
import './styles.css';

type Project = {
  id: number; name: string; artist?: string; notes?: string; youtube_url?: string; release_date?: string;
  review_count?: number; overall_signal?: number; confidence?: number; last_reviewed_at?: string;
  porter?: number; curiosity?: number; story?: number; synergy?: number; resistance?: number; entertainment?: number; world?: number; memorability?: number; friction?: number;
};
type Review = { id: number; reviewer: string; raw_text: string; summary: string; source_url?: string; created_at: string };
type Scorecard = { id: number; review_id: number; card_key: string; card_name: string; score: number; confidence: number; reasoning: string; reviewer: string; raw_text: string; source_url?: string; review_created_at: string };
type Evidence = { id: number; scorecard_id: number; card_key: string; card_name: string; review_id: number; reviewer: string; quote: string; sentiment: string; source_url?: string; review_created_at: string };
type Dashboard = { project: Project | null; reviews: Review[]; cards: Scorecard[]; evidence: Evidence[] };
type SortKey = 'overall_signal' | 'review_count' | 'confidence' | 'release_date' | 'porter' | 'curiosity' | 'story' | 'synergy' | 'resistance' | 'entertainment' | 'world' | 'memorability' | 'friction' | 'name';

const TOKEN = import.meta.env.VITE_APP_TOKEN || '2343546';
const TOKEN_PARAM = import.meta.env.VITE_TOKEN_PARAM || 'x';
const VERSION = 'v0.5';

const iconMap: Record<string, React.ReactNode> = {
  song: <Radio size={18} />, entertainment: <Sparkles size={18} />, world: <Film size={18} />, curiosity: <Eye size={18} />,
  story: <MessageSquare size={18} />, memorability: <Brain size={18} />, synergy: <BarChart3 size={18} />, resistance: <Flame size={18} />,
  friction: <Gauge size={18} />, porter: <Gauge size={18} />
};
const summaryColumns: { key: SortKey; label: string; metric?: boolean }[] = [
  { key: 'overall_signal', label: 'Signal', metric: true }, { key: 'porter', label: 'Porter', metric: true }, { key: 'curiosity', label: 'Curiosity', metric: true },
  { key: 'story', label: 'Story', metric: true }, { key: 'synergy', label: 'Synergy', metric: true }, { key: 'resistance', label: 'Resistance', metric: true },
  { key: 'entertainment', label: 'Fun', metric: true }, { key: 'world', label: 'World', metric: true }, { key: 'memorability', label: 'Memory', metric: true },
  { key: 'friction', label: 'Friction', metric: true }, { key: 'review_count', label: 'Reviews' }, { key: 'confidence', label: 'Conf.', metric: true }
];

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
  return score >= 90 ? 'gold' : score >= 80 ? 'great' : score >= 70 ? 'good' : score >= 60 ? 'steady' : score >= 50 ? 'warn' : 'bad';
}
function avg(nums: number[]) { return nums.length ? Math.round(nums.reduce((a,b)=>a+b,0) / nums.length) : 0; }
function groupCards(cards: Scorecard[], selectedReviewers: string[]) {
  const filtered = selectedReviewers.length ? cards.filter(c => selectedReviewers.includes(c.reviewer)) : cards;
  const map = new Map<string, { key: string; name: string; avg: number; confidence: number; reasoning: string; count: number }>();
  const keys = [...new Set(filtered.map(c => c.card_key))];
  keys.forEach(key => {
    const list = filtered.filter(c => c.card_key === key);
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
function metric(p: Project, key: SortKey) { return Number((p as any)[key] || 0); }
function verdict(cardGroups: ReturnType<typeof groupCards>, evidence: Evidence[], reviews: Review[]) {
  if (!reviews.length) return 'Dave has no witness statements yet. Add feedback and he will form an opinion.';
  const positives = cardGroups.filter(c => c.key !== 'friction').sort((a,b)=>b.avg-a.avg);
  const top = positives[0]; const second = positives[1];
  const friction = cardGroups.find(c => c.key === 'friction');
  const line1 = top ? `The strongest audience signal is ${top.name.toLowerCase()} at ${top.avg}%, with ${second ? `${second.name.toLowerCase()} also showing up strongly` : 'early supporting evidence'}.` : 'The audience signal is still forming.';
  const evidenceLine = evidence[0]?.quote ? `The clearest witness statement so far is: “${evidence[0].quote}”` : 'There is not enough specific evidence yet for a confident quote.';
  const frictionLine = friction && friction.avg >= 55 ? `The main watch-out is friction at ${friction.avg}%, so at least some viewers are pushing back or getting distracted.` : 'Friction is not dominating the feedback, which suggests the experience is landing more than it is confusing people.';
  return `${line1} ${frictionLine} ${evidenceLine}`;
}

function App() {
  const [locked] = useState(!gateOpen());
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [newProject, setNewProject] = useState('');
  const [artist, setArtist] = useState('The Unspoken Misfits');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [raw, setRaw] = useState('');
  const [dashboard, setDashboard] = useState<Dashboard>({ project: null, reviews: [], cards: [], evidence: [] });
  const [selected, setSelected] = useState<string>('porter');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('overall_signal');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [openReviewId, setOpenReviewId] = useState<number | null>(null);

  const reviewers = useMemo(() => [...new Set(dashboard.reviews.map(r => r.reviewer || 'Unknown Reviewer'))], [dashboard.reviews]);
  const selectedEvidence = useMemo(() => dashboard.evidence.filter(e => e.card_key === selected && (!selectedReviewers.length || selectedReviewers.includes(e.reviewer))), [dashboard.evidence, selected, selectedReviewers]);
  const cardGroups = useMemo(() => groupCards(dashboard.cards, selectedReviewers), [dashboard.cards, selectedReviewers]);
  const overall = useMemo(() => {
    const list = cardGroups.filter(c => !['friction'].includes(c.key));
    return avg(list.map(c => c.avg));
  }, [cardGroups]);
  const projectVideo = youtubeHref(dashboard.project?.youtube_url);
  const sortedProjects = useMemo(() => {
    const list = [...projects];
    list.sort((a,b) => {
      if (sortKey === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortKey === 'release_date') return sortDir === 'asc' ? String(a.release_date || '').localeCompare(String(b.release_date || '')) : String(b.release_date || '').localeCompare(String(a.release_date || ''));
      return sortDir === 'asc' ? metric(a, sortKey) - metric(b, sortKey) : metric(b, sortKey) - metric(a, sortKey);
    });
    return list;
  }, [projects, sortKey, sortDir]);
  const filteredReviews = useMemo(() => selectedReviewers.length ? dashboard.reviews.filter(r => selectedReviewers.includes(r.reviewer)) : dashboard.reviews, [dashboard.reviews, selectedReviewers]);

  function changeSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }
  async function loadProjects() {
    if (locked) return;
    const data = await api<{projects: Project[]}>('/api/projects');
    setProjects(data.projects);
  }
  async function loadDashboard(id = projectId) {
    if (!id) return;
    const data = await api<Dashboard>(`/api/dashboard?project_id=${id}`);
    setDashboard(data);
    setSelectedReviewers([]);
    if (data.cards[0]) setSelected(data.cards[0].card_key);
  }
  async function saveProject() {
    setBusy(true); setError('');
    try {
      const p = await api<Project>('/api/projects', { method: 'POST', body: JSON.stringify({ name: newProject, artist, youtube_url: youtubeUrl, release_date: releaseDate }) });
      setNewProject(''); setYoutubeUrl(''); setReleaseDate(''); setShowProjectForm(false);
      await loadProjects(); setProjectId(p.id); await loadDashboard(p.id);
    } catch (e:any) { setError(e.message); } finally { setBusy(false); }
  }
  async function addReview() {
    if (!projectId || !raw.trim()) return;
    setBusy(true); setError('');
    try {
      await api('/api/reviews', { method: 'POST', body: JSON.stringify({ project_id: projectId, raw_text: raw, reviewer: '', source_url: '' }) });
      setRaw(''); setShowFeedbackForm(false); await loadDashboard(projectId); await loadProjects();
    } catch (e:any) { setError(e.message); } finally { setBusy(false); }
  }
  async function deleteReview(id: number) {
    if (!confirm('Delete this review and its scorecards?')) return;
    setBusy(true);
    try { await api('/api/review-delete', { method: 'POST', body: JSON.stringify({ id }) }); await loadDashboard(projectId); await loadProjects(); }
    finally { setBusy(false); }
  }
  function toggleReviewer(name: string) {
    setSelectedReviewers(list => list.includes(name) ? list.filter(x=>x!==name) : [...list, name]);
  }

  useEffect(() => { loadProjects().catch(e => setError(e.message)); }, []);
  useEffect(() => { if (projectId) loadDashboard(projectId).catch(e => setError(e.message)); }, [projectId]);

  if (locked) return <div className="locked"><Lock size={22} /></div>;

  if (!projectId) return <div className="appShell">
    <header className="topbar"><div className="brand"><div className="brandMark">D</div><div><h1>Dave</h1><p>Audience Decoder {VERSION}</p></div></div></header>
    <main className="wide">
      {error && <div className="error">{error}</div>}
      <div className="summaryHead"><div><p className="eyebrow">Projects summary</p><h2>Audience portfolio</h2></div><button onClick={()=>setShowProjectForm(v=>!v)}><Plus size={16}/> New Project</button></div>
      {showProjectForm && <ProjectForm {...{newProject,setNewProject,artist,setArtist,youtubeUrl,setYoutubeUrl,releaseDate,setReleaseDate,busy,saveProject,setShowProjectForm}} />}
      <ProjectTable projects={sortedProjects} sortKey={sortKey} sortDir={sortDir} changeSort={changeSort} openProject={(id)=>setProjectId(id)} />
    </main>
  </div>;

  return <div className="appShell">
    <header className="topbar"><button className="ghost" onClick={()=>setProjectId(null)}><ChevronLeft size={16}/> Projects</button><div className="brand compact"><div className="brandMark">D</div><div><h1>Dave</h1><p>Audience Decoder {VERSION}</p></div></div></header>
    <main className="wide">
      <section className="hero">
        <div>
          <p className="eyebrow">{dashboard.project?.artist || 'Audience signal'}</p>
          <div className="titleRow"><h2>{dashboard.project?.name || 'No Project Selected'}</h2>{projectVideo && <a className="playButton" href={projectVideo} target="_blank" rel="noreferrer" title="Open on YouTube">▶</a>}</div>
          <div className="projectMeta">{safeDate(dashboard.project?.release_date) || 'No release date'} · {dashboard.reviews.length} reviews</div>
        </div>
        <div className={`overall ${scoreClass(overall)}`}><span>{overall}%</span><small>Overall Signal</small></div>
      </section>
      {error && <div className="error">{error}</div>}

      <section className="panel verdictPanel"><h3>Dave's Verdict</h3><p>{verdict(cardGroups, selectedEvidence.length ? selectedEvidence : dashboard.evidence, filteredReviews)}</p></section>

      <section className="toolbar"><button onClick={()=>setShowFeedbackForm(v=>!v)}><Plus size={16}/> Add Feedback</button>{projectVideo && <a className="watchLink" href={projectVideo} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Open on YouTube</a>}</section>
      {showFeedbackForm && <section className="panel"><div className="panelTitle"><h3>Paste Feedback</h3><button className="iconBtn" onClick={()=>setShowFeedbackForm(false)}><X size={15}/></button></div><p className="muted">Paste the raw review. First line can be the reviewer name. Dave will score and store the evidence.</p><textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder={seedText()} /><div className="actions"><button onClick={addReview} disabled={busy || !projectId || !raw.trim()}><Sparkles size={16}/> Save & Analyse</button></div></section>}

      <section className="reviewerBar"><button className={selectedReviewers.length === 0 ? 'active' : ''} onClick={()=>setSelectedReviewers([])}>All reviewers</button>{reviewers.map(name => <button key={name} className={selectedReviewers.includes(name) ? 'active' : ''} onClick={()=>toggleReviewer(name)}>{name}</button>)}</section>

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
        <div>
          <h3>Reviewer Notes</h3>
          <p className="muted">Compact view. Click a name to open the full witness statement.</p>
          <div className="reviewerTiles">
            {filteredReviews.map(r => <article key={r.id} className="reviewTile">
              <button className="reviewName" onClick={()=>setOpenReviewId(openReviewId === r.id ? null : r.id)}>{r.reviewer}<small>{safeDate(r.created_at)}</small></button>
              {openReviewId === r.id && <div className="reviewOpen"><p className="summary">{r.summary}</p><pre>{r.raw_text}</pre><button onClick={()=>deleteReview(r.id)} className="danger"><Trash2 size={15}/> Delete</button></div>}
            </article>)}
          </div>
        </div>
      </section>
    </main>
  </div>;
}

function ProjectForm(props: any) {
  const { newProject,setNewProject,artist,setArtist,youtubeUrl,setYoutubeUrl,releaseDate,setReleaseDate,busy,saveProject,setShowProjectForm } = props;
  return <section className="panel projectForm"><div className="panelTitle"><h3>New / Update Project</h3><button className="iconBtn" onClick={()=>setShowProjectForm(false)}><X size={15}/></button></div><p className="muted">If the project name already exists, Dave updates it instead of creating a duplicate.</p><div className="formGrid"><input value={newProject} onChange={e => setNewProject(e.target.value)} placeholder="Project name" /><input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist" /><input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="YouTube URL" /><input value={releaseDate} onChange={e => setReleaseDate(e.target.value)} placeholder="Release date" type="date" /></div><button onClick={saveProject} disabled={busy || !newProject.trim()}><Save size={16}/> Save Project</button></section>;
}
function ProjectTable({projects, sortKey, sortDir, changeSort, openProject}:{projects:Project[]; sortKey:SortKey; sortDir:'asc'|'desc'; changeSort:(k:SortKey)=>void; openProject:(id:number)=>void}) {
  return <section className="projectTableWrap"><table className="projectTable"><thead><tr><th onClick={()=>changeSort('name')}>Project {sortKey==='name' ? (sortDir==='desc'?'▼':'▲') : ''}</th><th onClick={()=>changeSort('release_date')}>Date {sortKey==='release_date' ? (sortDir==='desc'?'▼':'▲') : ''}</th><th>▶</th>{summaryColumns.map(c=><th key={c.key} onClick={()=>changeSort(c.key)}>{c.label} {sortKey===c.key ? (sortDir==='desc'?'▼':'▲') : ''}</th>)}</tr></thead><tbody>{projects.map(p => { const href = youtubeHref(p.youtube_url); return <tr key={p.id}><td className="projectName" onClick={()=>openProject(p.id)}><b>{p.name}</b><small>{p.artist || 'Unknown artist'}</small></td><td>{safeDate(p.release_date) || '—'}</td><td>{href ? <a className="tinyPlay" href={href} target="_blank" rel="noreferrer">▶</a> : '—'}</td>{summaryColumns.map(c => <td key={c.key} className={c.metric ? `metricCell ${scoreClass(metric(p,c.key), c.key)}` : ''} onClick={()=>openProject(p.id)}>{c.key === 'review_count' ? Number(p.review_count||0) : `${metric(p,c.key)}${c.metric ? '%' : ''}`}</td>)}</tr> })}</tbody></table>{projects.length === 0 && <div className="empty">No projects yet. Add one and let Dave start judging humanity.</div>}</section>;
}

createRoot(document.getElementById('root')!).render(<App />);
