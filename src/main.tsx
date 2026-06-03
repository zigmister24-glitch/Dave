import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Brain, ChevronLeft, Eye, Film, Flame, Gauge, Lock, MessageSquare, Plus, Radio, Save, Sparkles, Trash2, X } from 'lucide-react';
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
const VERSION = 'v0.8';

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
  const top = positives[0];
  const second = positives[1];
  const friction = cardGroups.find(c => c.key === 'friction');
  const quote = evidence[0]?.quote ? ` One useful witness statement is: “${evidence[0].quote}”` : '';
  const opener = top
    ? `The audience is currently responding most strongly to ${top.name.toLowerCase()}${second ? `, with ${second.name.toLowerCase()} also showing up as a meaningful supporting signal` : ''}.`
    : 'The audience signal is still forming.';
  const frictionRead = friction && friction.avg >= 70
    ? 'The important watch-out is that friction is also prominent. That usually means the idea is connecting, but a specific creative choice is getting in the way for some listeners or viewers.'
    : friction && friction.avg >= 45
      ? 'There is some friction in the feedback, but it is not yet strong enough to define the whole reaction. Treat it as a clue rather than a verdict.'
      : 'Friction is not dominating the feedback, which suggests the experience is landing more than it is confusing people.';
  const confidence = reviews.length < 5
    ? `This is still an early read based on ${reviews.length} review${reviews.length === 1 ? '' : 's'}, so Dave would treat it as directional rather than final.`
    : `With ${reviews.length} reviews in the pool, the pattern is starting to become more useful.`;
  return `${opener} ${frictionRead} ${quote} ${confidence}`;
}
function lessons(cardGroups: ReturnType<typeof groupCards>, evidence: Evidence[], reviews: Review[]) {
  if (!reviews.length) return ['No lessons yet. Dave needs witness statements first.'];
  const positives = cardGroups.filter(c => c.key !== 'friction').sort((a,b)=>b.avg-a.avg).slice(0,3);
  const friction = cardGroups.find(c => c.key === 'friction');
  const out = positives.map(c => `${c.name} is carrying a ${c.avg}% signal, so this is currently one of the main audience reaction points.`);
  if (friction && friction.avg >= 60) out.push(`Friction is ${friction.avg}%, so isolate the repeated complaint before changing the whole project.`);
  if (reviews.length < 5) out.push('Low sample size: useful signal, but not yet a jury verdict.');
  const quote = evidence[0]?.quote;
  if (quote) out.push(`Strongest current evidence: “${quote}”`);
  return out.slice(0,5);
}


function strongestMetric(projects: Project[], key: SortKey) {
  const valid = projects.filter(p => Number((p as any)[key] || 0) > 0);
  if (!valid.length) return null;
  return [...valid].sort((a,b) => metric(b,key) - metric(a,key))[0];
}
function weakestMetric(projects: Project[], key: SortKey) {
  const valid = projects.filter(p => Number((p as any)[key] || 0) > 0);
  if (!valid.length) return null;
  return [...valid].sort((a,b) => metric(a,key) - metric(b,key))[0];
}
function metricName(key: SortKey) {
  const found = summaryColumns.find(c => c.key === key);
  return found?.label || key;
}
function intelligenceBriefing(projects: Project[]) {
  const reviewed = projects.filter(p => Number(p.review_count || 0) > 0);
  const totalReviews = reviewed.reduce((sum,p)=>sum + Number(p.review_count || 0), 0);
  const metricKeys: SortKey[] = ['overall_signal','porter','curiosity','story','synergy','resistance','entertainment','world','memorability'];
  const averages = metricKeys.map(key => ({ key, avg: avg(reviewed.map(p => metric(p, key)).filter(Boolean)) })).filter(x => x.avg > 0).sort((a,b)=>b.avg-a.avg);
  const topMetric = averages[0];
  const weakMetric = averages[averages.length - 1];
  const bestProject = strongestMetric(reviewed, 'overall_signal');
  const mostEvidence = [...reviewed].sort((a,b)=>Number(b.review_count||0)-Number(a.review_count||0))[0] || null;
  const friction = avg(reviewed.map(p => metric(p, 'friction')).filter(Boolean));
  const lowSample = reviewed.filter(p => Number(p.review_count || 0) < 5).length;

  if (!reviewed.length) {
    return {
      headline: 'Dave has no witness statements yet.',
      body: 'Add feedback to a project and Dave will begin looking for catalogue-wide audience patterns.',
      bullets: ['No projects with reviews yet.', 'No portfolio signal available yet.', 'The prison analyst remains idle.'],
      bestProject: null,
      totalReviews: 0
    };
  }

  const headline = bestProject
    ? `${bestProject.name} currently leads the portfolio at ${metric(bestProject,'overall_signal')}% overall signal.`
    : 'The portfolio signal is starting to form.';
  const body = `Dave has analysed ${totalReviews} review${totalReviews === 1 ? '' : 's'} across ${reviewed.length} project${reviewed.length === 1 ? '' : 's'}. ${topMetric ? `The strongest recurring audience signal is ${metricName(topMetric.key).toLowerCase()} at ${topMetric.avg}%.` : ''} ${weakMetric ? `The weakest recurring signal is ${metricName(weakMetric.key).toLowerCase()} at ${weakMetric.avg}%, which is probably the best place to look for improvement.` : ''} ${friction >= 60 ? `Friction is running hot at ${friction}%, so repeated complaints should be treated as useful evidence rather than noise.` : `Friction is not yet dominating the catalogue, which suggests the projects are generally landing more than they are confusing people.`}`;
  const bullets = [
    bestProject ? `Best current project signal: ${bestProject.name} at ${metric(bestProject,'overall_signal')}%.` : '',
    topMetric ? `Strongest recurring metric: ${metricName(topMetric.key)} at ${topMetric.avg}%.` : '',
    weakMetric ? `Weakest recurring metric: ${metricName(weakMetric.key)} at ${weakMetric.avg}%.` : '',
    mostEvidence ? `Most evidence-rich project: ${mostEvidence.name} with ${mostEvidence.review_count} review${Number(mostEvidence.review_count) === 1 ? '' : 's'}.` : '',
    lowSample ? `${lowSample} project${lowSample === 1 ? '' : 's'} still ${lowSample === 1 ? 'has' : 'have'} a low sample size, so treat those scores as early signal.` : 'Most projects have enough evidence to begin comparing patterns.'
  ].filter(Boolean);
  return { headline, body, bullets, bestProject, totalReviews };
}
function IntelligenceBriefing({projects}:{projects:Project[]}) {
  const intel = intelligenceBriefing(projects);
  const topStory = strongestMetric(projects, 'story');
  const topCuriosity = strongestMetric(projects, 'curiosity');
  const topSynergy = strongestMetric(projects, 'synergy');
  return <section className="panel intelligencePanel">
    <div className="intelHeader">
      <div><p className="eyebrow">Dave's Intelligence Briefing</p><h2>{intel.headline}</h2></div>
      <div className="intelStat"><span>{intel.totalReviews}</span><small>Total reviews</small></div>
    </div>
    <p>{intel.body}</p>
    <div className="intelGrid">
      <div><b>What we learned</b><ul>{intel.bullets.map((b,i)=><li key={i}>{b}</li>)}</ul></div>
      <div className="bestInClass"><b>Best in class</b><div>{topStory ? <span>Story <strong>{topStory.name} · {metric(topStory,'story')}%</strong></span> : null}{topCuriosity ? <span>Curiosity <strong>{topCuriosity.name} · {metric(topCuriosity,'curiosity')}%</strong></span> : null}{topSynergy ? <span>Synergy <strong>{topSynergy.name} · {metric(topSynergy,'synergy')}%</strong></span> : null}</div></div>
    </div>
  </section>;
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

  const reviewers = useMemo(() => [...new Set(dashboard.reviews.map(r => r.reviewer || 'Unknown Reviewer'))], [dashboard.reviews]);
  const reviewMap = useMemo(() => new Map(dashboard.reviews.map(r => [r.id, r])), [dashboard.reviews]);
  const reviewLabels = useMemo(() => {
    const counts = new Map<string, number>();
    const labels = new Map<number, string>();
    dashboard.reviews.forEach(r => {
      const base = r.reviewer || 'Unknown Reviewer';
      const n = (counts.get(base) || 0) + 1;
      counts.set(base, n);
      labels.set(r.id, n === 1 ? base : `${base} (${n})`);
    });
    return labels;
  }, [dashboard.reviews]);
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
      <div className="summaryHead slim"><div></div><button onClick={()=>setShowProjectForm(v=>!v)}><Plus size={16}/> New Project</button></div>
      {showProjectForm && <ProjectForm {...{newProject,setNewProject,artist,setArtist,youtubeUrl,setYoutubeUrl,releaseDate,setReleaseDate,busy,saveProject,setShowProjectForm}} />}
      <IntelligenceBriefing projects={projects} />
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

      <section className="panel verdictPanel"><h3>Dave's Verdict</h3><p>{verdict(cardGroups, selectedEvidence.length ? selectedEvidence : dashboard.evidence, filteredReviews)}</p><h4>What We Learned</h4><ul>{lessons(cardGroups, selectedEvidence.length ? selectedEvidence : dashboard.evidence, filteredReviews).map((item, idx) => <li key={idx}>{item}</li>)}</ul></section>

      <section className="toolbar"><button onClick={()=>setShowFeedbackForm(v=>!v)}><Plus size={16}/> Add Feedback</button></section>
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

      <section className="panel evidencePanel">
        <h3>{cardGroups.find(c=>c.key===selected)?.name || 'Evidence'} Evidence</h3>
        <p className="muted">Snippets that generated this card. Hover to see Dave's reviewer summary and the full witness statement.</p>
        <div className="evidenceList wideEvidence">
          {selectedEvidence.length === 0 && <div className="empty">No evidence yet. Dave remains unconvinced.</div>}
          {selectedEvidence.map(e => {
            const review = reviewMap.get(e.review_id);
            return <div className={`evidence ${e.sentiment}`} key={e.id}>
              <div className="evidenceHead"><b>{reviewLabels.get(e.review_id) || e.reviewer}</b><button className="trashInline" title="Delete entire review" onClick={(ev)=>{ev.stopPropagation(); deleteReview(e.review_id)}}><Trash2 size={15}/></button></div>
              <p>“{e.quote}”</p>
              <div className="evidenceHover">
                <b>{reviewLabels.get(e.review_id) || e.reviewer}</b>
                {review?.summary && <p className="summary">{review.summary}</p>}
                {review?.raw_text && <pre>{review.raw_text}</pre>}
              </div>
            </div>
          })}
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
  return <section className="projectTableWrap"><table className="projectTable"><thead><tr><th onClick={()=>changeSort('name')}>Project {sortKey==='name' ? (sortDir==='desc'?'▼':'▲') : ''}</th><th onClick={()=>changeSort('release_date')}>Release {sortKey==='release_date' ? (sortDir==='desc'?'▼':'▲') : ''}</th><th>▶</th>{summaryColumns.map(c=><th key={c.key} onClick={()=>changeSort(c.key)}>{c.label} {sortKey===c.key ? (sortDir==='desc'?'▼':'▲') : ''}</th>)}</tr></thead><tbody>{projects.map(p => { const href = youtubeHref(p.youtube_url); const reviews = Number(p.review_count || 0); return <tr key={p.id} onClick={()=>openProject(p.id)} className="clickRow"><td className="projectName"><b>{p.name}</b><small>{p.artist || 'Unknown artist'}{reviews < 5 ? <em className="sampleWarn">Early signal</em> : <em className="sampleGood">Established</em>}</small></td><td>{safeDate(p.release_date) || '—'}</td><td onClick={(e)=>e.stopPropagation()}>{href ? <a className="tinyPlay" href={href} target="_blank" rel="noreferrer">▶</a> : '—'}</td>{summaryColumns.map(c => <td key={c.key} className={c.metric ? `metricCell ${scoreClass(metric(p,c.key), c.key)}` : ''}>{c.key === 'review_count' ? reviews : `${metric(p,c.key)}${c.metric ? '%' : ''}`}</td>)}</tr> })}</tbody></table>{projects.length === 0 && <div className="empty">No projects yet. Add one and let Dave start judging humanity.</div>}</section>;
}

createRoot(document.getElementById('root')!).render(<App />);
