import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyNotificationRls() {
  console.log("=== CHECKING JN_NOTIFICATIONS RLS & TARGETING SEMANTICS ===");

  // Check if we can select from jn_notifications
  const { data, error } = await supabase.from("jn_notifications").select("*");
  if (error) console.error("Error reading jn_notifications:", error);
  else console.log(`Current jn_notifications row count: ${data?.length || 0}`);
}

applyNotificationRls();
