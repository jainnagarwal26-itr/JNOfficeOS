import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectNotificationsSchema() {
  console.log("=== INSPECTING JN_NOTIFICATIONS TABLE ===");

  const { data, error } = await supabase.from("jn_notifications").select("*").limit(5);
  if (error) {
    console.error("Error inspecting jn_notifications:", error);
    return;
  }

  console.log("Sample jn_notifications rows:", data);
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  }
}

inspectNotificationsSchema();
