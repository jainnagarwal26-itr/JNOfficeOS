import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyClientIdentityIntegrity() {
  console.log("=========================================================");
  console.log(" DEDICATED CLIENT IDENTITY INTEGRITY VERIFICATION SCRIPT");
  console.log("=========================================================\n");

  let allPassed = true;

  // 1. Fetch live jn_clients
  const { data: clients, error } = await supabase
    .from("jn_clients")
    .select("*")
    .order("client_number", { ascending: true });

  if (error || !clients) {
    console.error("Failed to query jn_clients:", error);
    return;
  }

  // Check 1: Total production clients count = 3
  const countMatch = clients.length === 3;
  console.log(`1. Total Live Client Count (3): ${clients.length} -> ${countMatch ? "✓ PASS" : "❌ FAIL"}`);
  if (!countMatch) allPassed = false;

  // Check 2: Exact client numbers array ["CL000001", "CL000002", "CL000003"]
  const numbers = clients.map(c => c.client_number);
  const numMatch = JSON.stringify(numbers) === JSON.stringify(["CL000001", "CL000002", "CL000003"]);
  console.log(`2. Client Numbers Sequence (${numbers.join(", ")}): -> ${numMatch ? "✓ PASS" : "❌ FAIL"}`);
  if (!numMatch) allPassed = false;

  // Check 3: Parag Kadam Canonical UUID Preservation
  const parag = clients.find(c => c.client_number === "CL000003");
  const paragUuidValid = parag && parag.id === "6ea6117f-02d1-4546-8cb9-68d82806bf30" && parag.client_name === "Parag Kadam";
  console.log(`3. Parag Kadam Canonical UUID (6ea6117f-02d1-4546-8cb9-68d82806bf30): -> ${paragUuidValid ? "✓ PASS" : "❌ FAIL"}`);
  if (!paragUuidValid) allPassed = false;

  // Check 4: Zero CL000004 client rows
  const cl4Count = clients.filter(c => c.client_number === "CL000004").length;
  console.log(`4. Zero CL000004 Client Rows: ${cl4Count} -> ${cl4Count === 0 ? "✓ PASS" : "❌ FAIL"}`);
  if (cl4Count !== 0) allPassed = false;

  // Check 5: Compliance Register counts (106 total, 35 for CL000003, 0 for CL000004)
  const { count: totalComp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true });
  const { count: cl3Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000003");
  const { count: cl4Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000004");

  const compMatch = totalComp === 106 && cl3Comp === 35 && cl4Comp === 0;
  console.log(`5. Compliance Register Connections (Total: ${totalComp}, CL000003: ${cl3Comp}, CL000004: ${cl4Comp}) -> ${compMatch ? "✓ PASS" : "❌ FAIL"}`);
  if (!compMatch) allPassed = false;

  console.log("\n=========================================================");
  console.log(` CLIENT IDENTITY INTEGRITY SUMMARY: ${allPassed ? "🟢 ALL CHECKS PASSED" : "🔴 FAILURE DETECTED"}`);
  console.log("=========================================================\n");
}

verifyClientIdentityIntegrity();
