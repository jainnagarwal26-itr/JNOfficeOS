import { hashPassword } from "../src/lib/hash";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPasswords() {
  console.log("=== Testing Password Hashes ===");

  const passwordsToTest = [
    "staff123",
    "Shruti@2026",
    "Anju@2026",
    "Chirag@2026",
    "Amit@2026",
    "jn@2026",
    "admin123",
    "JNOfficeOS@2026"
  ];

  for (const pwd of passwordsToTest) {
    const hash = await hashPassword(pwd);
    console.log(`Password: "${pwd}" => Hash: ${hash}`);
  }

  // Fetch jn_users hashes
  const { data: users } = await supabase.from("jn_users").select("email, full_name, password_hash");
  console.log("\nAuthoritative Database Hashes:");
  console.log(users);
}

testPasswords();
