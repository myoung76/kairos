/**
 * run-ingestion.mjs
 * ─────────────────────────────────────────────────────────────────
 * Standalone Node runner for the job ingestion pipeline.
 * Designed to be called by Claude Cowork (manually or on schedule).
 *
 * Run from your project root:
 *   node --env-file=.env src/run-ingestion.mjs
 *
 * Requires Node 20.6+ for --env-file flag.
 * If on Node 18, install dotenv and uncomment the import below.
 * ─────────────────────────────────────────────────────────────────
 */

// Uncomment if using Node 18 (and run: npm install dotenv):
// import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
import { runJobIngestion } from './ingestion.js';

// ── Env var validation ────────────────────────────────────────────
// Vite uses VITE_ prefix; Node reads them as-is from --env-file.
const SUPABASE_URL     = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY     = process.env.VITE_SUPABASE_ANON_KEY;
const ANTHROPIC_KEY    = process.env.VITE_ANTHROPIC_KEY
                      || process.env.ANTHROPIC_API_KEY;  // fallback for either name

const missing = [];
if (!SUPABASE_URL)  missing.push('VITE_SUPABASE_URL');
if (!SUPABASE_KEY)  missing.push('VITE_SUPABASE_ANON_KEY');
if (!ANTHROPIC_KEY) missing.push('VITE_ANTHROPIC_KEY (or ANTHROPIC_API_KEY)');

if (missing.length) {
  console.error('[run-ingestion] Missing required env vars:');
  missing.forEach(v => console.error(`  · ${v}`));
  console.error('\nMake sure your .env file exists and run with:');
  console.error('  node --env-file=.env src/run-ingestion.mjs');
  process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('[run-ingestion] Starting pipeline…');
console.log(`[run-ingestion] ${new Date().toLocaleString()}`);
console.log('');

try {
  const result = await runJobIngestion(supabase, ANTHROPIC_KEY);

  console.log('');
  console.log('═══ INGESTION SUMMARY ═══');
  console.log(`  Fetched:   ${result.total}`);
  console.log(`  Filtered:  ${result.filtered}`);
  console.log(`  Inserted:  ${result.inserted}`);
  console.log(`  Evaluated: ${result.evaluated}`);
  console.log(`  Skipped:   ${result.skipped}`);
  console.log('');

  if (result.inserted > 0) {
    console.log(`✓ ${result.inserted} new role${result.inserted !== 1 ? 's' : ''} added to Supabase.`);
  } else {
    console.log('✓ No new roles found — pipeline already up to date.');
  }

  // Exit cleanly so Cowork can detect success
  process.exit(0);

} catch (err) {
  console.error('[run-ingestion] Pipeline failed:', err.message);
  process.exit(1);
}