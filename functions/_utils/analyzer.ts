export type Evidence = { quote: string; sentiment: 'positive' | 'negative' | 'mixed' | 'neutral' };
export type Card = {
  key: string;
  name: string;
  score: number;
  confidence: number;
  reasoning: string;
  evidence: Evidence[];
};
export type Analysis = { reviewer: string; summary: string; cards: Card[] };

const CARD_DEFS = [
  ['song', 'Song Stands Alone'],
  ['entertainment', 'Entertainment'],
  ['world', 'World-building'],
  ['curiosity', 'Curiosity'],
  ['story', 'Story Pull'],
  ['memorability', 'Memorability'],
  ['synergy', 'Synergy'],
  ['resistance', 'Resistance Overcome'],
  ['friction', 'Friction'],
  ['porter', 'Porter Score']
] as const;

function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }
function sentences(text: string) {
  return text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
}
function has(text: string, terms: string[]) { const t = text.toLowerCase(); return terms.some(x => t.includes(x)); }
function evidenceFor(lines: string[], terms: string[], fallbackTerms: string[] = []): Evidence[] {
  const all = [...terms, ...fallbackTerms].map(t => t.toLowerCase());
  return lines.filter(s => all.some(t => s.toLowerCase().includes(t))).slice(0, 5).map(quote => ({ quote, sentiment: sentiment(quote) }));
}
function sentiment(s: string): Evidence['sentiment'] {
  const t = s.toLowerCase();
  const pos = ['good','great','excellent','love','loved','enjoy','entertaining','catchy','spot on','clear','memorable','amazing','bravo','treat','cool','mesmerising','stand up'];
  const neg = ['distract','problem','not my thing','too much','drown','bad','confusing','hard to follow','mixed opinions'];
  const p = pos.some(x => t.includes(x)); const n = neg.some(x => t.includes(x));
  return p && n ? 'mixed' : p ? 'positive' : n ? 'negative' : 'neutral';
}
function baseScore(text: string, positive: string[], negative: string[] = []) {
  let score = 50;
  const t = text.toLowerCase();
  positive.forEach(p => { if (t.includes(p)) score += 12; });
  negative.forEach(n => { if (t.includes(n)) score -= 12; });
  return clamp(score);
}
function confidenceFor(ev: Evidence[], raw: string) {
  return clamp(45 + ev.length * 10 + Math.min(20, raw.length / 120));
}
export function detectReviewer(raw: string) {
  const first = raw.split('\n').map(x => x.trim()).find(Boolean) || '';
  if (first && first.length < 80 && !first.includes(':')) return first.replace(/^"|"$/g, '');
  const m = raw.match(/^([^\n:]{2,80})\s*[:\-]/);
  return m ? m[1].trim() : 'Unknown Reviewer';
}
export function analyzeReview(raw: string): Analysis {
  const reviewer = detectReviewer(raw);
  const lines = sentences(raw).filter(s => s !== reviewer);
  const text = raw.toLowerCase();
  const cards: Card[] = [];
  const push = (key: typeof CARD_DEFS[number][0], score: number, reasoning: string, ev: Evidence[]) => {
    const name = CARD_DEFS.find(c => c[0] === key)![1];
    cards.push({ key, name, score: clamp(score), confidence: confidenceFor(ev, raw), reasoning, evidence: ev });
  };

  const songEv = evidenceFor(lines, ['song', 'music', 'melody', 'mix', 'lyrics', 'vocals', 'chorus', 'audio only', 'stand up']);
  push('song', baseScore(text, ['music is good','song wise','stand up','catchy melody','mix sounds spot on','songwriting talent','lyrics','vocals'], ['drown out the lyrics','audio only without','distracts from the music']),
    'Measures whether the feedback suggests the song works independently of the video/story layer.', songEv);

  const entEv = evidenceFor(lines, ['entertain', 'enjoy', 'treat', 'fun', 'lol', 'cool', 'amazing']);
  push('entertainment', baseScore(text, ['entertaining','enjoyable','treat','fun','cool','amazing','lol'], ['boring','not entertaining']),
    'Measures whether the viewer was pulled into the experience and enjoyed the ride.', entEv);

  const worldEv = evidenceFor(lines, ['film', 'video', 'scene', 'character', 'world', 'storyline', 'home made', 'clips from a film', 'consistent characters']);
  push('world', baseScore(text, ['film','clips from a film','world','consistent characters','scenes','storyline','video is mesmerising'], ['random','inconsistent']),
    'Measures whether the feedback points to a coherent world, setting, characters, or film-like presentation.', worldEv);

  const curiosityEv = evidenceFor(lines, ['where to start', 'what', 'why', 'how', 'is this', 'watch twice', 'again', 'curious']);
  push('curiosity', baseScore(text, ['where to start','is this','watch twice','again','what the hell','curious','mesmerising'], []),
    'Measures questions, surprise, rewatch desire, and signals that the viewer was trying to decode the experience.', curiosityEv);

  const storyEv = evidenceFor(lines, ['story', 'storyline', 'scene', 'commentary', 'talking', 'hello darling', 'jason bourne', 'soap']);
  push('story', baseScore(text, ['story','storyline','scene in a film','hello darling','jason bourne','soap scene','commentary'], ['could not follow','distracts from the story']),
    'Measures whether story, scenes, characters, or plot moments became part of the review.', storyEv);

  const memEv = evidenceFor(lines, ['hello darling', 'jason bourne', 'soap', 'big dave', 'commander darling', 'blackadder', 'film', 'clips']);
  push('memorability', baseScore(text, ['hello darling','jason bourne','soap scene','big dave','commander darling','blackadder','memorable'], []),
    'Measures quotable moments, named characters, and memory anchors carried out of the viewing.', memEv);

  const synEv = evidenceFor(lines, ['synergy', 'mixture', 'elements', 'song playing over', 'together', 'combination', 'supporting video']);
  push('synergy', baseScore(text, ['synergy','three elements','combination','mixture','song playing over','supporting video','work together'], ['distracts from']),
    'Measures how well song, video, lyrics, dialogue, and story appear to reinforce one another.', synEv);

  const resEv = evidenceFor(lines, ['not my', 'not a fan', 'but', 'however', 'although', 'forgive my ignorance']);
  let res = baseScore(text, ['not my','not a fan','but','however','although','forgive my ignorance'], []);
  if (has(text, ['not my thing']) && has(text, ['entertaining','enjoy','good','cool'])) res += 20;
  push('resistance', res, 'Measures “I should not like this, but…” signals where genre, AI, or taste barriers were overcome.', resEv);

  const fricEv = evidenceFor(lines, ['distract', 'drown', 'too much', 'mixed opinions', 'without', 'audio only', 'problem', 'not my thing']);
  push('friction', baseScore(text, ['distract','drown out','too much','mixed opinions','audio only','without the yapping','not my thing','problem'], ['spot on','clear']),
    'Measures what got in the way. Higher means more friction was mentioned, even if the overall review was positive.', fricEv);

  const porterEv = [...worldEv, ...memEv, ...resEv, ...synEv].slice(0, 6);
  const porterScore = clamp((cards.find(c=>c.key==='world')!.score + cards.find(c=>c.key==='memorability')!.score + cards.find(c=>c.key==='resistance')!.score + cards.find(c=>c.key==='synergy')!.score + cards.find(c=>c.key==='entertainment')!.score) / 5);
  push('porter', porterScore, 'A strategic score blending differentiation, focus, memorability, synergy, and resistance overcome.', porterEv);

  const top = cards.filter(c => c.key !== 'friction').sort((a,b)=>b.score-a.score).slice(0,3).map(c => c.name).join(', ');
  const friction = cards.find(c => c.key === 'friction')!.score;
  const summary = `${reviewer} shows strongest signal in ${top}. Friction signal is ${friction}%, so review the evidence before changing the work.`;
  return { reviewer, summary, cards };
}
