import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyMigration18() {
  console.log("=== PHASE 3 & 4: MIGRATION 18 POST-MIGRATION & INTEGRITY VERIFICATION ===\n");

  let pass = true;

  // 1. Verify Categories
  const { data: cats, error: catErr } = await supabase.from("jn_service_categories").select("*").order("display_order", { ascending: true });
  console.log(`1. jn_service_categories count: ${cats?.length || 0} (Expected: 7) -> ${cats?.length === 7 ? "✓ PASS" : "❌ FAIL"}`);
  if (cats?.length !== 7) pass = false;

  // 2. Verify Services
  const { data: srvs, error: srvErr } = await supabase.from("jn_services").select("*").order("service_number", { ascending: true });
  console.log(`2. jn_services count: ${srvs?.length || 0} (Expected: 29) -> ${srvs?.length === 29 ? "✓ PASS" : "❌ FAIL"}`);
  if (srvs?.length !== 29) pass = false;

  // 3. Verify PTEC
  const ptec = (srvs || []).find(s => s.service_number === "SRV00015" || s.service_name.includes("PTEC"));
  const ptecOk = ptec && ptec.category_name === "Labour & Statutory Compliances" && ptec.service_name === "Professional Tax - PTEC";
  console.log(`3. PTEC Verification (SRV00015 under Labour & Statutory Compliances) -> ${ptecOk ? "✓ PASS" : "❌ FAIL"}`);
  if (!ptecOk) pass = false;

  // 4. Verify PTRC
  const ptrc = (srvs || []).find(s => s.service_number === "SRV00016" || s.service_name.includes("PTRC"));
  const ptrcOk = ptrc && ptrc.category_name === "Labour & Statutory Compliances" && ptrc.service_name === "Professional Tax - PTRC";
  console.log(`4. PTRC Verification (SRV00016 under Labour & Statutory Compliances) -> ${ptrcOk ? "✓ PASS" : "❌ FAIL"}`);
  if (!ptrcOk) pass = false;

  // 5. Verify category_id foreign keys populated in jn_services
  const nullCatIds = (srvs || []).filter(s => !s.category_id).length;
  console.log(`5. All 29 services have valid category_id foreign keys: ${nullCatIds === 0 ? "✓ PASS" : "❌ FAIL"}`);
  if (nullCatIds > 0) pass = false;

  // 6. Verify jn_client_services table exists
  const { data: cs, error: csErr } = await supabase.from("jn_client_services").select("*");
  console.log(`6. jn_client_services table accessible -> ${!csErr ? "✓ PASS" : "❌ FAIL"}`);
  if (csErr) pass = false;

  // 7. PRODUCTION INTEGRITY CHECK: Client count & UUIDs
  const { data: clients } = await supabase.from("jn_clients").select("*").order("client_number", { ascending: true });
  console.log(`7. Production clients count: ${clients?.length || 0} (Expected: 3) -> ${clients?.length === 3 ? "✓ PASS" : "❌ FAIL"}`);
  if (clients?.length !== 3) pass = false;

  const expectedUuids = {
    CL000001: "c6528254-ba9c-428b-b488-78eea7589f83",
    CL000002: "2d1b7261-7805-41e8-ad07-6106fbc33a32",
    CL000003: "6ea6117f-02d1-4546-8cb9-68d82806bf30"
  };

  for (const c of clients || []) {
    const match = expectedUuids[c.client_number] === c.id;
    console.log(`   - Client ${c.client_number} (${c.client_name}) UUID preserved -> ${match ? "✓ PASS" : "❌ FAIL"}`);
    if (!match) pass = false;
  }

  // 8. PRODUCTION INTEGRITY CHECK: Compliance records count
  const { count: compCount } = await supabase.from("jn_compliance_register").select("*", { count: 'exact', head: true });
  console.log(`8. Compliance register records count: ${compCount} (Expected: 106) -> ${compCount === 106 ? "✓ PASS" : "❌ FAIL"}`);
  if (compCount !== 106) pass = false;

  console.log("\n=========================================================");
  console.log(` MIGRATION 18 INTEGRITY RESULT: ${pass ? "🟢 ALL CHECKS PASSED" : "🔴 FAILURE DETECTED"}`);
  console.log("=========================================================\n");
}

verifyMigration18();
