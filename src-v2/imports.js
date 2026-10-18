import { uid } from './data.js';

export function parseTaskTimes(text) {
  const times = {};
  for (const line of text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)) {
    const index = line.lastIndexOf(':');
    const skill = line.slice(0,index).trim().toLowerCase().replace(/\s+/g,'-');
    const seconds = Number(line.slice(index+1).trim());
    if (index < 1 || !skill || ['__proto__','constructor','prototype'].includes(skill) || skill.length > 80 || !Number.isFinite(seconds) || seconds <= 0 || Object.hasOwn(times,skill)) throw new Error('Use one unique skill: seconds pair per line, with a positive time.');
    times[skill] = seconds;
  }
  return times;
}

export function parseCsv(text) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i+1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(value.trim()); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i+1] === '\n') i++; row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = ''; }
    else value += char;
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted field.');
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseActions(text, format = 'txt') {
  if (text.length > 2_000_000) throw new Error('Use an action list smaller than 2 MB.');
  let source;
  if (format === 'json') { const parsed = JSON.parse(text); source = Array.isArray(parsed) ? parsed : parsed.actions; }
  else if (format === 'csv') {
    const [headers, ...rows] = parseCsv(text.replace(/^\uFEFF/, ''));
    if (!headers?.includes('name')) throw new Error('The CSV needs a name column. Optional columns: skill, seconds, frequency, payloadKg, reachM, aisleM, note.');
    source = rows.map(row => Object.fromEntries(headers.map((header,index)=>[header,row[index]??''])));
  } else source = text.split(/\r?\n/).map(line=>line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean).map(name=>({name}));
  if (!Array.isArray(source) || !source.length || source.length > 500) throw new Error('Use a list with 1–500 actions.');
  const numeric = (value, fallback = null) => { if (value === '' || value == null) return fallback; const n=Number(value); if (!Number.isFinite(n)||n<0) throw new Error('Action numbers must be non-negative.'); return n; };
  return source.map((a,index)=>{
    if (!a || typeof a.name !== 'string' || !a.name.trim()) throw new Error(`Action ${index+1} needs a name.`);
    return { id: uid('action'), name: a.name.trim(), skill: a.skill || '', seconds: numeric(a.seconds), frequency: numeric(a.frequency,1), payloadKg: numeric(a.payloadKg), reachM: numeric(a.reachM), aisleM: numeric(a.aisleM), source: 'Assumed', sourceId: '', note: a.note || 'Imported draft. Review skill, timing, requirements, and sequence.', recovery: a.recovery || 'Not defined', dependency: '', parallel: false };
  }).map((a,index,arr)=>({...a,dependency:index?arr[index-1].id:''}));
}
