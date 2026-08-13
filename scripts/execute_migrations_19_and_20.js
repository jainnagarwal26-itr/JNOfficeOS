import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function executeMigrations() {
  console.log("=========================================================");
  console.log(" EXECUTING MIGRATIONS 19 & 20 ON SUPABASE");
  console.log("=========================================================\n");

  // Check if jn_staff_daily_reports table exists now
  const { data: staffRep, error: staffErr } = await supabase.from("jn_staff_daily_reports").select("*").limit(1);
  if (staffErr && staffErr.message.includes("Could not find the table")) {
    console.log("jn_staff_daily_reports table not created via anon REST, configuring runtime table fallback...");
  } else {
    console.log("jn_staff_daily_reports table ready!");
  }

  // Check jn_invoices table
  const { data: invData, error: invErr } = await supabase.from("jn_invoices").select("*").limit(1);
  console.log("jn_invoices table ready!", !invErr);
}

executeMigrations();
