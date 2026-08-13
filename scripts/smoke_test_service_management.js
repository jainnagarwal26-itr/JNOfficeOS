import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSmokeTest() {
  console.log("========================================================");
  console.log(" JN OfficeOS — SERVICE MANAGEMENT PRODUCTION SMOKE TEST ");
  console.log("========================================================\n");

  let allPassed = true;

  // TEST 1: Service Master Read Test
  const { data: cats, error: catErr } = await supabase.from("jn_service_categories").select("*").order("display_order", { ascending: true });
  const { data: srvs, error: srvErr } = await supabase.from("jn_services").select("*").order("service_number", { ascending: true });

  const catCountOk = cats?.length === 7;
  const srvCountOk = srvs?.length === 29;

  const ptec = (srvs || []).find(s => s.service_number === "SRV00015");
  const ptrc = (srvs || []).find(s => s.service_number === "SRV00016");

  const ptecOk = ptec && ptec.service_name === "Professional Tax - PTEC" && ptec.category_name === "Labour & Statutory Compliances";
  const ptrcOk = ptrc && ptrc.service_name === "Professional Tax - PTRC" && ptrc.category_name === "Labour & Statutory Compliances";

  console.log("1. SERVICE MASTER READ TEST:");
  console.log(`   - 7 Categories loaded: ${catCountOk ? "✓ PASS" : "❌ FAIL"} (${cats?.length})`);
  console.log(`   - 29 Services loaded: ${srvCountOk ? "✓ PASS" : "❌ FAIL"} (${srvs?.length})`);
  console.log(`   - PTEC (SRV00015) in Labour & Statutory Compliances: ${ptecOk ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - PTRC (SRV00016) in Labour & Statutory Compliances: ${ptrcOk ? "✓ PASS" : "❌ FAIL"}`);

  if (!catCountOk || !srvCountOk || !ptecOk || !ptrcOk) allPassed = false;

  // TEST 2: Client Services Table (jn_client_services) state
  const { data: clientServices, error: csErr } = await supabase.from("jn_client_services").select("*");
  const csCountOk = clientServices?.length === 0;
  console.log("\n2. CLIENT SERVICES (jn_client_services) TEST:");
  console.log(`   - Table accessible: ${!csErr ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Zero dummy records (count = 0): ${csCountOk ? "✓ PASS" : "❌ FAIL"} (${clientServices?.length})`);

  if (csErr || !csCountOk) allPassed = false;

  // TEST 3: Production Client Integrity & Compliance Records
  const { data: clients } = await supabase.from("jn_clients").select("*").order("client_number", { ascending: true });
  const { count: compCount } = await supabase.from("jn_compliance_register").select("*", { count: 'exact', head: true });

  const clientCountOk = clients?.length === 3;
  const compCountOk = compCount === 106;

  const expectedUuids = {
    CL000001: "c6528254-ba9c-428b-b488-78eea7589f83",
    CL000002: "2d1b7261-7805-41e8-ad07-6106fbc33a32",
    CL000003: "6ea6117f-02d1-4546-8cb9-68d82806bf30"
  };

  let clientUuidsOk = true;
  (clients || []).forEach(c => {
    if (expectedUuids[c.client_number] !== c.id) clientUuidsOk = false;
  });

  console.log("\n3. PRODUCTION DATA INTEGRITY TEST:");
  console.log(`   - Production clients count (3): ${clientCountOk ? "✓ PASS" : "❌ FAIL"} (${clients?.length})`);
  console.log(`   - Client UUIDs unchanged: ${clientUuidsOk ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Compliance records count (106): ${compCountOk ? "✓ PASS" : "❌ FAIL"} (${compCount})`);

  if (!clientCountOk || !clientUuidsOk || !compCountOk) allPassed = false;

  // TEST 4: PostgreSQL sequence check
  const { data: seqVal, error: seqErr } = await supabase.rpc("generate_next_service_number");
  const seqOk = seqVal === "SRV00030" || (seqVal && seqVal.startsWith("SRV0003"));
  console.log("\n4. SERVICE NUMBER GENERATOR SEQUENCE TEST:");
  console.log(`   - RPC generate_next_service_number() working: ${!seqErr ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Generated Service Number: ${seqVal}`);

  console.log("\n========================================================");
  console.log(` SMOKE TEST DATABASE INTEGRITY RESULT: ${allPassed ? "🟢 ALL CHECKS PASSED" : "🔴 FAILURE DETECTED"}`);
  console.log("========================================================\n");
}

runSmokeTest();
