import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updatePasswordHashes() {
  console.log("=== Updating Production User Password Hashes in Supabase ===");

  // Hash of "Chirag@2026" with salt "JN_OFFICEOS_SECURE_SALT_2026": a64759402d6bb300a0da6e1a33ef73ed918c6a86bb917a8c5e6f0eb65ec56372
  const chiragHash = "a64759402d6bb300a0da6e1a33ef73ed918c6a86bb917a8c5e6f0eb65ec56372";
  const { error: err1 } = await supabase
    .from("jn_users")
    .update({ password_hash: chiragHash, updated_at: new Date().toISOString() })
    .eq("email", "jainnagarwal26@gmail.com");

  console.log("Chirag Jain password hash updated:", !err1 ? "✓ SUCCESS" : err1);

  // Hash of "Shruti@2026"
  const shrutiHash = "04cc91fc40efd4a6ec8cd10957d52e87d67b4df7be7f6548f6b25f5147332177";
  const { error: err2 } = await supabase
    .from("jn_users")
    .update({ password_hash: shrutiHash, updated_at: new Date().toISOString() })
    .eq("email", "shruti@jainnagarwal.in");

  console.log("Shruti Gupta password hash updated:", !err2 ? "✓ SUCCESS" : err2);

  // Hash of "Anju@2026"
  const anjuHash = "98b27212e30e019799c87289594d4b80096449c3f8242806aa5d991a7832d2fe";
  const { error: err3 } = await supabase
    .from("jn_users")
    .update({ password_hash: anjuHash, updated_at: new Date().toISOString() })
    .eq("email", "anju@jainnagarwal.in");

  console.log("Anju Mishra password hash updated:", !err3 ? "✓ SUCCESS" : err3);

  // Hash of "Amit@2026"
  const amitHash = "c8b31937ffec4a70c225d2f106d4b5382a294e03ee35b18790803a8906758696";
  const { error: err4 } = await supabase
    .from("jn_users")
    .update({ password_hash: amitHash, updated_at: new Date().toISOString() })
    .eq("email", "amit@jainnagarwal.in");

  console.log("Amit Agrawal password hash updated:", !err4 ? "✓ SUCCESS" : err4);
}

updatePasswordHashes();
