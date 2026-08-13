import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function purgeCl000004() {
  console.log("=== PERMANENTLY PURGING CL000004 FROM SUPABASE POSTGRESQL ===");

  // 1. Re-link compliance records
  await supabase
    .from("jn_compliance_register")
    .update({ client_id: "CL000003", updated_at: new Date().toISOString() })
    .or("client_id.eq.CL000004,client_id.eq.341ff4e5-62d5-42da-9d37-f8312e96dff3,client_id.eq.f54f4d7e-4db3-40db-bf48-989a5f8159ce");

  // 2. Delete CL000004 rows from jn_clients
  const { data: deleted } = await supabase
    .from("jn_clients")
    .delete()
    .eq("client_number", "CL000004")
    .select("id, client_number, client_name");

  console.log("Deleted CL000004 rows from jn_clients:", deleted);

  // 3. Delete any extra Parag Kadam row if not CL000003
  const { data: extraParag } = await supabase
    .from("jn_clients")
    .delete()
    .neq("id", "6ea6117f-02d1-4546-8cb9-68d82806bf30")
    .eq("client_name", "Parag Kadam")
    .select("id, client_number, client_name");

  if (extraParag && extraParag.length > 0) {
    console.log("Deleted extra Parag Kadam rows:", extraParag);
  }

  // 4. Verify jn_clients table state
  const { data: finalClients } = await supabase
    .from("jn_clients")
    .select("id, client_number, client_name, pan, mobile")
    .order("client_number", { ascending: true });

  console.log("\nFinal Canonical jn_clients Table in Supabase:");
  console.table(finalClients);
}

purgeCl000004();
