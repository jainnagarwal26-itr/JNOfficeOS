import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function reconcileV24Baseline() {
  console.log("=== RECONCILING V2.4 BASELINE IDENTITY DATA ===");

  // 1. Point compliance records from CL000004 -> CL000003
  const { data: compData, error: compErr } = await supabase
    .from("jn_compliance_register")
    .update({ client_id: "CL000003", updated_at: new Date().toISOString() })
    .eq("client_id", "CL000004")
    .select("id");

  console.log(`1. Reconciled ${compData?.length || 0} compliance records to CL000003.`);

  // 2. Remove redundant CL000004 record from jn_clients
  const { data: delClient, error: delErr } = await supabase
    .from("jn_clients")
    .delete()
    .eq("client_number", "CL000004")
    .select("*");

  console.log(`2. Removed redundant CL000004 client record:`, delClient?.length || 0);

  // 3. Ensure Staff user_number formatting
  await supabase
    .from("jn_users")
    .update({ user_number: "STF000001", role: "OWNER" })
    .eq("email", "jainnagarwal26@gmail.com");

  await supabase
    .from("jn_users")
    .update({ user_number: "STF000002", role: "STAFF" })
    .eq("email", "amit@jainnagarwal.in");

  console.log("3. Reconciled Staff user_numbers: STF000001 (Chirag) & STF000002 (Amit).");
}

reconcileV24Baseline();
