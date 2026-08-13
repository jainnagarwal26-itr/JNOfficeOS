import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectCompliance() {
  const { data, error } = await supabase.from("jn_compliance_register").select("client_id");
  if (error) {
    console.error(error);
    return;
  }
  const counts = {};
  data.forEach((r) => {
    counts[r.client_id] = (counts[r.client_id] || 0) + 1;
  });
  console.log("Compliance Register Distribution:", counts);
}

inspectCompliance();
