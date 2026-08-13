import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixComplianceRegisterCl3() {
  console.log("=== FIXING COMPLIANCE REGISTER TO POINT TO CL000003 ===");

  const { data: updated, error } = await supabase
    .from("jn_compliance_register")
    .update({ client_id: "CL000003", updated_at: new Date().toISOString() })
    .eq("client_id", "CL000004")
    .select("id");

  if (error) console.error("Error updating compliance records:", error);
  else console.log(`Updated ${updated?.length || 0} compliance records to CL000003.`);

  const { count: cl3Count } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000003");
  const { count: cl4Count } = await supabase.from("jn_compliance_register").select("*", { count: "exact", head: true }).eq("client_id", "CL000004");

  console.log(`CL000003 Compliance Count: ${cl3Count}`);
  console.log(`CL000004 Compliance Count: ${cl4Count}`);
}

fixComplianceRegisterCl3();
