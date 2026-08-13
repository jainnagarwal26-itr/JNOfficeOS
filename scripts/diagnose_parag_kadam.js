import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseParagKadam() {
  console.log("=== DIAGNOSING PARAG KADAM DOUBLE ENTRY ===");

  // 1. Fetch jn_clients rows
  const { data: clients } = await supabase
    .from("jn_clients")
    .select("id, client_number, client_name, created_at, pan, mobile, email")
    .order("client_number", { ascending: true });

  console.log("Supabase jn_clients rows:");
  console.table(clients);

  // 2. Check jn_compliance_register client_id references
  const { data: comp3 } = await supabase.from("jn_compliance_register").select("id").eq("client_id", "CL000003");
  const { data: comp4 } = await supabase.from("jn_compliance_register").select("id").eq("client_id", "CL000004");
  const { data: compUuid3 } = await supabase.from("jn_compliance_register").select("id").eq("client_id", "6ea6117f-02d1-4546-8cb9-68d82806bf30");
  const { data: compUuid4 } = await supabase.from("jn_compliance_register").select("id").eq("client_id", "f54f4d7e-4db3-40db-bf48-132d733c7f99");

  console.log(`Compliance count by client_id = 'CL000003': ${comp3?.length || 0}`);
  console.log(`Compliance count by client_id = 'CL000004': ${comp4?.length || 0}`);
  console.log(`Compliance count by client_id UUID 6ea6117f... (CL000003): ${compUuid3?.length || 0}`);
  console.log(`Compliance count by client_id UUID f54f4d7e... (CL000004): ${compUuid4?.length || 0}`);
}

diagnoseParagKadam();
