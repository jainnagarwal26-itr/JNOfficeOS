import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deepAuditCl000004() {
  console.log("=========================================================");
  console.log(" DEEP AUDIT: LIVE SUPABASE POSTGRESQL JN_CLIENTS & FK DEPS");
  console.log("=========================================================\n");

  // PHASE 1: Query LIVE jn_clients rows
  const { data: clients, error: clientErr } = await supabase
    .from("jn_clients")
    .select("*")
    .order("client_number", { ascending: true });

  if (clientErr) {
    console.error("Error querying jn_clients:", clientErr);
    return;
  }

  console.log(`1. LIVE jn_clients Row Count: ${clients.length}`);
  console.table(clients.map(c => ({
    id: c.id,
    client_number: c.client_number,
    client_name: c.client_name,
    trade_name: c.trade_name,
    pan: c.pan,
    mobile: c.mobile,
    email: c.email,
    created_at: c.created_at,
    updated_at: c.updated_at
  })));

  const cl3 = clients.find(c => c.client_number === "CL000003" || c.id === "6ea6117f-02d1-4546-8cb9-68d82806bf30");
  const cl4 = clients.find(c => c.client_number === "CL000004" || c.client_name === "Parag Kadam" && c.id !== "6ea6117f-02d1-4546-8cb9-68d82806bf30");

  console.log("\n2. CANONICAL RECORD VERIFICATION:");
  console.log("CL000003 Record:", cl3 ? { id: cl3.id, client_number: cl3.client_number, name: cl3.client_name } : "NOT FOUND!");
  console.log("CL000004 Record:", cl4 ? { id: cl4.id, client_number: cl4.client_number, name: cl4.client_name } : "NONE (CLEAN)");

  // PHASE 3: DEPENDENCY AUDIT ACROSS TABLES
  console.log("\n3. DEPENDENCY AUDIT ACROSS ALL CLIENT-DEPENDENT TABLES:");
  
  const tablesToCheck = [
    "jn_cases",
    "jn_case_assignments",
    "jn_case_attachments",
    "jn_case_comments",
    "jn_case_dependencies",
    "jn_case_tasks",
    "jn_case_time_entries",
    "jn_case_timeline",
    "jn_client_activity_logs",
    "jn_client_addresses",
    "jn_client_appointments",
    "jn_client_bank_accounts",
    "jn_client_communication",
    "jn_client_contacts",
    "jn_client_followups",
    "jn_client_ledgers",
    "jn_client_login_history",
    "jn_client_messages",
    "jn_client_notes",
    "jn_client_portal_access",
    "jn_client_portal_users",
    "jn_client_registered_devices",
    "jn_client_requests",
    "jn_client_sessions",
    "jn_client_staff_assignments",
    "jn_client_tax_information",
    "jn_client_services",
    "jn_compliance_register"
  ];

  const depReport = [];

  for (const tbl of tablesToCheck) {
    try {
      // Check references to CL000004 UUID if cl4 exists
      let refCountUuid = 0;
      let refCountNum = 0;

      if (cl4) {
        const { count: cUuid } = await supabase.from(tbl).select("*", { count: "exact", head: true }).eq("client_id", cl4.id);
        refCountUuid = cUuid || 0;
      }

      const { count: cNum } = await supabase.from(tbl).select("*", { count: "exact", head: true }).eq("client_id", "CL000004");
      refCountNum = cNum || 0;

      depReport.push({
        Table: tbl,
        Column: "client_id",
        CL000004_UUID_Refs: refCountUuid,
        CL000004_String_Refs: refCountNum,
        Total_CL000004_Deps: refCountUuid + refCountNum
      });
    } catch (e) {
      // Table may not exist or column might differ
      depReport.push({
        Table: tbl,
        Column: "client_id",
        CL000004_UUID_Refs: 0,
        CL000004_String_Refs: 0,
        Total_CL000004_Deps: 0,
        Note: "Table not present or non-standard"
      });
    }
  }

  console.table(depReport.filter(d => d.Total_CL000004_Deps > 0 || d.Note));

  // PHASE 4: Compliance Register Breakdown
  console.log("\n4. COMPLIANCE REGISTER DETAILED BREAKDOWN:");
  const { count: totalComp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true });
  const { count: cl1Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000001");
  const { count: cl2Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000002");
  const { count: cl3Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000003");
  const { count: cl4Comp } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000004");

  console.log(`- Total Compliance Register Rows: ${totalComp}`);
  console.log(`- CL000001 Compliance Rows: ${cl1Comp}`);
  console.log(`- CL000002 Compliance Rows: ${cl2Comp}`);
  console.log(`- CL000003 Compliance Rows: ${cl3Comp}`);
  console.log(`- CL000004 Compliance Rows: ${cl4Comp}`);
}

deepAuditCl000004();
