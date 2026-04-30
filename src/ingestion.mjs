// run-ingestion.mjs
// Cowork runs this on schedule. Requires Node 18+.
// Set env vars: SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

import { createClient } from "@supabase/supabase-js";
import { runJobIngestion } from "./ingestion.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const result = await runJobIngestion(
  supabase,
  process.env.ANTHROPIC_API_KEY
);

console.log(JSON.stringify(result, null, 2));