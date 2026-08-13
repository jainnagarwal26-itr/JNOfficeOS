import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixParagKadamCanonical() {
  console.log("=== FIXING PARAG KADAM CANONICAL CLIENT NUMBER (CL000003) ===");

  // 1. Reconcile compliance register records pointing to CL000004 or UUID f54f4d7e... to CL000003
  const { data: compData1 } = await supabase
    .from("jn_compliance_register")
    .update({ client_id: "CL000003", updated_at: new Date().toISOString() })
    .eq("client_id", "CL000004")
    .select("id");

  const { data: compData2 } = await supabase
    .from("jn_compliance_register")
    .update({ client_id: "CL000003", updated_at: new Date().toISOString() })
    .eq("client_id", "f54f4d7e-4db3-40db-bf48-989a5f8159ce")
    .select("id");

  console.log(`Reconciled ${(compData1?.length || 0) + (compData2?.length || 0)} compliance records to CL000003.`);

  // 2. Delete duplicate row CL000004 from jn_clients
  const { data: delData } = await supabase
    .from("jn_clients")
    .delete()
    .eq("client_number", "CL000004")
    .select("id, client_number, client_name");

  console.log("Deleted duplicate client row:", delData);

  // 3. Confirm jn_clients rows
  const { data: remainingClients } = await supabase
    .from("jn_clients")
    .select("id, client_number, client_name, pan, mobile")
    .order("client_number", { ascending: true });

  console.log("\nFinal Canonical jn_clients Rows in Supabase:");
  console.table(remainingClients);
}

fixParagKadamCanonical();
