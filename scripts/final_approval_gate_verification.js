import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runApprovalGate() {
  console.log("=========================================================");
  console.log(" V2.4 CLIENT IDENTITY FINAL APPROVAL GATE AUDIT");
  console.log("=========================================================\n");

  let gatePassed = true;

  // 1. LIVE SUPABASE CLIENT VERIFICATION
  const { data: clients, error: clientErr } = await supabase
    .from("jn_clients")
    .select("*")
    .order("client_number", { ascending: true });

  if (clientErr || !clients) {
    console.error("1. Live Client Query Failed:", clientErr);
    return;
  }

  const liveCount = clients.length;
  const countMatch = liveCount === 3;
  console.log(`1. Live Client Count (Expected 3): ${liveCount} -> ${countMatch ? "✓ PASS" : "❌ FAIL"}`);
  if (!countMatch) gatePassed = false;

  // 2. CANONICAL UUID VERIFICATION
  const cl1 = clients.find(c => c.client_number === "CL000001");
  const cl2 = clients.find(c => c.client_number === "CL000002");
  const cl3 = clients.find(c => c.client_number === "CL000003");
  const cl4 = clients.find(c => c.client_number === "CL000004");

  const cl1UuidValid = cl1 && cl1.id === "c6528254-ba9c-428b-b488-78eea7589f83" && cl1.client_name === "Anchal Baleshwar Chobe";
  const cl2UuidValid = cl2 && cl2.id === "2d1b7261-7805-41e8-ad07-6106fbc33a32" && cl2.client_name === "KRISHNAKUMAR HEERALAL KANOJIYA";
  const cl3UuidValid = cl3 && cl3.id === "6ea6117f-02d1-4546-8cb9-68d82806bf30" && cl3.client_name === "Parag Kadam";
  const cl4Absent = !cl4;

  console.log(`2. CL000001 Canonical UUID (c6528254...): ${cl1?.id} -> ${cl1UuidValid ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`3. CL000002 Canonical UUID (2d1b7261...): ${cl2?.id} -> ${cl2UuidValid ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`4. CL000003 Canonical UUID (6ea6117f...): ${cl3?.id} -> ${cl3UuidValid ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`5. CL000004 Row Absence: -> ${cl4Absent ? "✓ PASS" : "❌ FAIL"}`);

  if (!cl1UuidValid || !cl2UuidValid || !cl3UuidValid || !cl4Absent) gatePassed = false;

  // 3. COMPLIANCE REGISTER VERIFICATION
  const { count: totalComp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true });
  const { count: cl1Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000001");
  const { count: cl2Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000002");
  const { count: cl3Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000003");
  const { count: cl4Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000004");

  const compValid = totalComp === 106 && cl1Comp === 36 && cl2Comp === 35 && cl3Comp === 35 && cl4Comp === 0;

  console.log(`6. Compliance Register Total (106): ${totalComp} -> ${totalComp === 106 ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`7. CL000001 Compliance Count (36): ${cl1Comp} -> ${cl1Comp === 36 ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`8. CL000002 Compliance Count (35): ${cl2Comp} -> ${cl2Comp === 35 ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`9. CL000003 Compliance Count (35): ${cl3Comp} -> ${cl3Comp === 35 ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`10. CL000004 Compliance Count (0): ${cl4Comp} -> ${cl4Comp === 0 ? "✓ PASS" : "❌ FAIL"}`);

  if (!compValid) gatePassed = false;

  // 4. STABLE NEXT SERIAL NUMBERS (READ-ONLY)
  const lastClientVal = parseInt(clients[clients.length - 1].client_number.replace(/\D/g, ""), 10);
  const nextClientNumber = `CL${String(lastClientVal + 1).padStart(6, "0")}`;

  console.log(`11. Next Computed Client Serial: ${nextClientNumber} -> ${nextClientNumber === "CL000004" ? "✓ PASS" : "❌ FAIL"}`);
  if (nextClientNumber !== "CL000004") gatePassed = false;

  console.log("\n=========================================================");
  console.log(` FINAL APPROVAL GATE SUMMARY: ${gatePassed ? "🟢 ALL CHECKS PASSED" : "🔴 FAILURE DETECTED"}`);
  console.log("=========================================================\n");
}

runApprovalGate();
