import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function auditTables() {
  console.log("=========================================================");
  console.log(" READ-ONLY FORENSIC AUDIT: SUPABASE TABLES & SCHEMAS");
  console.log("=========================================================\n");

  const tablesToInspect = [
    "jn_invoices",
    "jn_invoice_items",
    "jn_receipts",
    "jn_client_ledgers",
    "jn_client_activity_logs",
    "jn_case_time_entries",
    "jn_case_timeline",
    "jn_audit_logs",
    "jn_staff_daily_reports"
  ];

  for (const table of tablesToInspect) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: false })
        .limit(3);

      if (error) {
        console.log(`Table '${table}': ERROR/NOT FOUND (${error.message})`);
      } else {
        console.log(`Table '${table}':`);
        console.log(`   - Row Count: ${count}`);
        if (data && data.length > 0) {
          console.log(`   - Columns: ${Object.keys(data[0]).join(", ")}`);
          console.log(`   - Sample Row 1:`, JSON.stringify(data[0]));
        } else {
          console.log(`   - Table exists, currently 0 rows.`);
        }
      }
    } catch (e) {
      console.log(`Table '${table}': Exception (${e.message})`);
    }
    console.log("");
  }
}

auditTables();
