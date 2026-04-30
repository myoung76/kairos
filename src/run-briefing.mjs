/**
 * run-briefing.mjs
 * ─────────────────────────────────────────────────────────────────
 * Queries Supabase for jobs added in the last 24 hours and writes
 * a markdown briefing file to ~/Desktop (or a path you configure).
 *
 * Designed to run via Claude Cowork 15 minutes after ingestion:
 *   node --env-file=.env src/run-briefing.mjs
 *
 * Requires Node 20.6+ for --env-file flag.
 * ─────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ── Env var validation ────────────────────────────────────────────
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[run-briefing] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// ── Config ────────────────────────────────────────────────────────
// Change OUTPUT_DIR if you want briefings somewhere other than Desktop
const OUTPUT_DIR = join(homedir(), 'Desktop');
const TODAY      = new Date().toISOString().slice(0, 10);
const OUTPUT_FILE = join(OUTPUT_DIR, `job-briefing-${TODAY}.md`);

// Score thresholds (mirrors your App.jsx logic)
const PRIORITY_THRESHOLD = 75;
const STRONG_THRESHOLD   = 65;

// ── Query ─────────────────────────────────────────────────────────
const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY);
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const { data: newJobs, error } = await supabase
  .from('jobs')
  .select('title, company, location, url, score, recommendation, verdict, strengths, gaps, status, created_at')
  .gte('created_at', yesterday)
  .order('score', { ascending: false });

if (error) {
  console.error('[run-briefing] Supabase query failed:', error.message);
  process.exit(1);
}

// Also fetch unscored jobs from last 24h separately
const { data: unscored } = await supabase
  .from('jobs')
  .select('title, company, url, location, created_at')
  .gte('created_at', yesterday)
  .is('score', null);

// ── Build briefing ────────────────────────────────────────────────
const scored   = (newJobs || []).filter(j => j.score != null);
const priority = scored.filter(j => j.score >= PRIORITY_THRESHOLD);
const strong   = scored.filter(j => j.score >= STRONG_THRESHOLD && j.score < PRIORITY_THRESHOLD);
const rest     = scored.filter(j => j.score < STRONG_THRESHOLD);

function recLabel(rec) {
  const map = {
    apply:           '✅ Apply Now',
    apply_with_note: '🟦 Apply w/ Note',
    stretch:         '🟡 Stretch',
    skip:            '⬜ Skip',
  };
  return map[rec] || rec || '—';
}

const lines = [];

lines.push(`# Job Search Briefing — ${TODAY}`);
lines.push(`_Generated at ${new Date().toLocaleTimeString()}_`);
lines.push('');
lines.push('## Summary');
lines.push(`- **New roles added:** ${(newJobs || []).length + (unscored || []).length}`);
lines.push(`- **Scored:** ${scored.length}`);
lines.push(`- **Priority (≥${PRIORITY_THRESHOLD}):** ${priority.length}`);
lines.push(`- **Strong (${STRONG_THRESHOLD}–${PRIORITY_THRESHOLD - 1}):** ${strong.length}`);
lines.push(`- **Unscored (needs JD paste):** ${(unscored || []).length}`);
lines.push('');

if (priority.length > 0) {
  lines.push('---');
  lines.push('## 🔴 Priority — Apply Today');
  lines.push('');
  priority.forEach(j => {
    lines.push(`### ${j.title} · ${j.company}`);
    lines.push(`**Score:** ${j.score} · **Location:** ${j.location || 'Unknown'} · ${recLabel(j.recommendation)}`);
    if (j.verdict) lines.push(`> ${j.verdict}`);
    if (j.strengths?.length) lines.push(`**Strengths:** ${j.strengths.join(', ')}`);
    if (j.url) lines.push(`[View listing](${j.url})`);
    lines.push('');
  });
}

if (strong.length > 0) {
  lines.push('---');
  lines.push('## 🟦 Strong Matches — Worth Reviewing');
  lines.push('');
  strong.forEach(j => {
    lines.push(`### ${j.title} · ${j.company}`);
    lines.push(`**Score:** ${j.score} · **Location:** ${j.location || 'Unknown'} · ${recLabel(j.recommendation)}`);
    if (j.verdict) lines.push(`> ${j.verdict}`);
    if (j.url) lines.push(`[View listing](${j.url})`);
    lines.push('');
  });
}

if (unscored?.length > 0) {
  lines.push('---');
  lines.push('## ⚠️ Unscored — Paste JD in Evaluate Tab');
  lines.push('');
  unscored.forEach(j => {
    lines.push(`- **${j.title}** · ${j.company}${j.location ? ` · ${j.location}` : ''} — [Open](${j.url || '#'})`);
  });
  lines.push('');
}

if (rest.length > 0) {
  lines.push('---');
  lines.push('## ⬇️ Lower Priority');
  lines.push('');
  rest.forEach(j => {
    lines.push(`- **${j.title}** · ${j.company} · Score: ${j.score} · ${recLabel(j.recommendation)}`);
  });
  lines.push('');
}

lines.push('---');
lines.push('_Open your [Job Search Agent](http://localhost:5173) to manage your pipeline._');

// ── Write file ────────────────────────────────────────────────────
const content = lines.join('\n');
writeFileSync(OUTPUT_FILE, content, 'utf8');

console.log(`[run-briefing] ✓ Briefing written to: ${OUTPUT_FILE}`);
console.log(`[run-briefing] ${scored.length} scored · ${priority.length} priority · ${unscored?.length || 0} unscored`);
process.exit(0);