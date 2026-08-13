import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function dedupeCompliance() {
  console.log("=== CLEANING UP DUPLICATE COMPLIANCE REGISTER ROWS ===");

  // Delete duplicate rows with client_id = 'CL000003'
  const { data: deleted, error } = await supabase
    .from("jn_compliance_register")
    .delete()
    .eq("client_id", "CL000003")
    .select("id");

  if (error) console.error("Error deleting duplicates:", error);
  else console.log(`Deleted ${deleted?.length || 0} duplicate rows with client_id='CL000003'.`);

  // Ensure canonical records for Parag Kadam use client_id = 'CL000003'
  const { data: updated, error: updErr } = await supabase
    .from("jn_compliance_register")
    .update({ client_id: "CL000003" })
    .eq("client_id", "6ea6117f-02d1-4546-8cb9-68d82806bf30")
    .select("id");

  if (updErr) console.error("Error updating canonical rows:", updErr);
  else console.log(`Updated ${updated?.length || 0} canonical Parag Kadam rows to client_id='CL000003'.`);

  const { count: total } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true });
  const { count: cl1 } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000001");
  const { count: cl2 } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000002");
  const { count: cl3 } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000003");

  console.log(`Total Compliance Records: ${total}`);
  console.log(`CL000001 Records: ${cl1}`);
  console.log(`CL000002 Records: ${cl2}`);
  console.log(`CL000003 Records: ${cl3}`);
}

dedupeCompliance();
