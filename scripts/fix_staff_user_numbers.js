import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixStaffUserNumbers() {
  console.log("=== UPDATING JN_USERS TO STF000001 AND STF000002 ===");

  await supabase
    .from("jn_users")
    .update({ user_number: "STF000001", role: "OWNER" })
    .eq("email", "jainnagarwal26@gmail.com");

  await supabase
    .from("jn_users")
    .update({ user_number: "STF000002", role: "STAFF" })
    .eq("email", "amit@jainnagarwal.in");

  const { data: users } = await supabase.from("jn_users").select("id, user_number, email, full_name, role").order("user_number", { ascending: true });
  console.log("Updated jn_users rows:");
  console.table(users);
}

fixStaffUserNumbers();
