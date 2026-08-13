import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectTargetDetails() {
  console.log("=== INSPECTING CANONICAL TARGET DETAILS FOR ASSIGNMENT ===");

  // 1. Client CL000003 Parag Kadam
  const { data: client } = await supabase
    .from("jn_clients")
    .select("id, client_number, client_name, pan, mobile")
    .eq("client_number", "CL000003")
    .single();

  // 2. Service SRV00016 PTRC
  const { data: service } = await supabase
    .from("jn_services")
    .select("id, service_number, service_name, category_name, standard_fee")
    .eq("service_number", "SRV00016")
    .single();

  // 3. Staff Users
  const { data: users } = await supabase
    .from("jn_users")
    .select("id, user_number, full_name, role")
    .order("user_number", { ascending: true });

  console.log("\nClient Details:");
  console.log(client);

  console.log("\nService Details:");
  console.log(service);

  console.log("\nStaff Users:");
  console.table(users);
}

inspectTargetDetails();
