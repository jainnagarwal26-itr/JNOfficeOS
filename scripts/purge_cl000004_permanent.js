import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function purgePermanent() {
  console.log("=========================================================");
  console.log(" EXECUTING PERMANENT DATABASE CLEANUP & RECONCILIATION");
  console.log("=========================================================\n");

  // 1. Reconcile all compliance register records pointing to CL000004 or UUID 9538d74a... to CL000003
  const { data: compUpdates, error: compErr } = await supabase
    .from("jn_compliance_register")
    .update({ client_id: "CL000003", updated_at: new Date().toISOString() })
    .or("client_id.eq.CL000004,client_id.eq.9538d74a-9e34-468d-9662-ab58dfc42930,client_id.eq.341ff4e5-62d5-42da-9d37-963d94bd6136,client_id.eq.f54f4d7e-4db3-40db-bf48-989a5f8159ce")
    .select("id");

  if (compErr) console.error("Error updating compliance records:", compErr);
  else console.log(`1. Re-linked ${compUpdates?.length || 0} compliance records to CL000003.`);

  // 2. Delete CL000004 rows from jn_clients
  const { data: delClientNum } = await supabase
    .from("jn_clients")
    .delete()
    .eq("client_number", "CL000004")
    .select("id, client_number, client_name");

  console.log("2. Deleted CL000004 rows from jn_clients:", delClientNum);

  // 3. Delete any extra Parag Kadam row where id != 6ea6117f-02d1-4546-8cb9-68d82806bf30
  const { data: delExtraParag } = await supabase
    .from("jn_clients")
    .delete()
    .neq("id", "6ea6117f-02d1-4546-8cb9-68d82806bf30")
    .eq("client_name", "Parag Kadam")
    .select("id, client_number, client_name");

  if (delExtraParag && delExtraParag.length > 0) {
    console.log("3. Deleted extra non-canonical Parag Kadam rows:", delExtraParag);
  }

  // 4. Verify Final Supabase jn_clients State
  const { data: remaining } = await supabase
    .from("jn_clients")
    .select("id, client_number, client_name, pan, mobile")
    .order("client_number", { ascending: true });

  console.log("\n4. FINAL CANONICAL JN_CLIENTS TABLE IN LIVE SUPABASE POSTGRESQL:");
  console.table(remaining);

  // 5. Verify Compliance Register Counts
  const { count: totalComp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true });
  const { count: cl1Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000001");
  console.log(`\n5. COMPLIANCE REGISTER FINAL COUNTS:`);
  console.log(`- Total Records: ${totalComp}`);
  console.log(`- CL000001: ${cl1Comp}`);
  console.log(`- CL000002: ${await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000002").then(r => r.count)}`);
  console.log(`- CL000003: ${await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000003").then(r => r.count)}`);
  console.log(`- CL000004: ${await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000004").then(r => r.count)}`);
}

purgePermanent();
