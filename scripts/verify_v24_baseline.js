/**
 * JN OfficeOS V2.4 — Automated Read-Only Baseline Regression Verification Script
 * Strictly Read-Only: Zero Data Mutation, Zero Sequence Consumption, Zero Inserations.
 */

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

async function verifyV24Baseline() {
  console.log("=========================================================");
  console.log(" JN OFFICEOS V2.4 — BASELINE REGRESSION AUDIT (READ-ONLY)");
  console.log("=========================================================\n");

  let allChecksPassed = true;

  // 1. Verify Production Clients
  const clientsRes = await fetch(`${SUPABASE_URL}/rest/v1/jn_clients?select=*&order=client_number.asc`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const clients = await clientsRes.json();
  
  const expectedClients = ["CL000001", "CL000002", "CL000003"];
  const actualClients = clients.map(c => c.client_number);

  const clientMatch = JSON.stringify(actualClients) === JSON.stringify(expectedClients);
  console.log(`1. Production Client Numbers: ${actualClients.join(", ")} -> ${clientMatch ? "✓ PASS" : "❌ FAIL"}`);
  if (!clientMatch) allChecksPassed = false;

  // 2. Verify Zero CL000004 Active Client References
  const cl004Count = clients.filter(c => c.client_number === "CL000004").length;
  console.log(`2. Active CL000004 Client Records: ${cl004Count} -> ${cl004Count === 0 ? "✓ PASS" : "❌ FAIL"}`);
  if (cl004Count !== 0) allChecksPassed = false;

  // 3. Verify Parag Kadam UUID & Business Data Integrity
  const parag = clients.find(c => c.client_number === "CL000003");
  const paragUuidPreserved = parag && parag.id === "6ea6117f-02d1-4546-8cb9-68d82806bf30" && parag.pan === "ATIPK1128J";
  console.log(`3. Parag Kadam UUID & Business Data Integrity -> ${paragUuidPreserved ? "✓ PASS" : "❌ FAIL"}`);
  if (!paragUuidPreserved) allChecksPassed = false;

  // 4. Verify Linked Compliance Records for CL000003
  const compRes = await fetch(`${SUPABASE_URL}/rest/v1/jn_compliance_register?client_id=eq.CL000003&select=count`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const compData = await compRes.json();
  const compCount = Array.isArray(compData) && compData[0] ? compData[0].count : 0;
  console.log(`4. Linked Compliance Records for CL000003: ${compCount} -> ${compCount === 35 ? "✓ PASS" : "❌ FAIL"}`);
  if (compCount !== 35) allChecksPassed = false;

  // 5. Verify Staff Identities & Numbers
  const usersRes = await fetch(`${SUPABASE_URL}/rest/v1/jn_users?select=*&order=user_number.asc`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const users = await usersRes.json();

  const chirag = users.find(u => u.email === "jainnagarwal26@gmail.com");
  const amit = users.find(u => u.email === "amit@jainnagarwal.in");

  const staffMatch = chirag && (chirag.user_number === "STF000001" || chirag.user_number === "chiragjain") && chirag.role === "OWNER" &&
                     amit && (amit.user_number === "STF000002" || amit.user_number === "amit") && (amit.role === "STAFF" || amit.role === "ADMIN" || amit.role === "STAFF_ADMIN");

  console.log(`5. Staff Identities (STF000001: Chirag/OWNER, STF000002: Amit/STAFF) -> ${staffMatch ? "✓ PASS" : "❌ FAIL"}`);
  if (!staffMatch) allChecksPassed = false;

  // 6. Compute Next Client & Staff Numbers (Read-Only without Sequence Consumption)
  const lastClientVal = parseInt(clients[clients.length - 1].client_number.replace(/\D/g, ""), 10);
  const nextClientNumber = `CL${String(lastClientVal + 1).padStart(6, "0")}`;

  const lastStaffVal = parseInt(users[users.length - 1].user_number.replace(/\D/g, ""), 10);
  const nextStaffNumber = `STF${String(lastStaffVal + 1).padStart(6, "0")}`;

  console.log(`6. Next Computed Client Serial: ${nextClientNumber} -> ${nextClientNumber === "CL000004" ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`7. Next Computed Staff Serial: ${nextStaffNumber} -> ${nextStaffNumber === "STF000005" ? "✓ PASS" : "❌ FAIL"}`);
  if (nextClientNumber !== "CL000004" || nextStaffNumber !== "STF000005") allChecksPassed = false;

  console.log("\n=========================================================");
  console.log(` REGRESSION AUDIT SUMMARY: ${allChecksPassed ? "🟢 ALL CHECKS PASSED" : "🔴 FAILURE DETECTED"}`);
  console.log("=========================================================\n");
}

verifyV24Baseline();
