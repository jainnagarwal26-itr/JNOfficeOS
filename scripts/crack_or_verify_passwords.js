import crypto from "crypto";
import { createClient } from '@supabase/supabase-js';

const salt = "JN_OFFICEOS_SECURE_SALT_2026";

function sha256Hash(password) {
  const saltedMsg = password + salt;
  return crypto.createHash("sha256").update(saltedMsg).digest("hex");
}

const targets = {
  "amit@jainnagarwal.in": "c8b31937ffec4a70c225d2f106d4b5382a294e03ee35b18790803a8906758696",
  "shruti@jainnagarwal.in": "04cc91fc40efd4a6ec8cd10957d52e87d67b4df7be7f6548f6b25f5147332177",
  "anju@jainnagarwal.in": "98b27212e30e019799c87289594d4b80096449c3f8242806aa5d991a7832d2fe"
};

const candidatePasswords = [
  "staff123",
  "Shruti@2026",
  "Anju@2026",
  "Chirag@2026",
  "Amit@2026",
  "jn@2026",
  "admin123",
  "JNOfficeOS@2026",
  "JN@2026",
  "Shruti123",
  "Anju123",
  "Amit123",
  "Chirag123",
  "Password@123",
  "123456789",
  "OfficeOS@2026"
];

for (const [email, expectedHash] of Object.entries(targets)) {
  console.log(`Searching password for ${email}...`);
  let found = false;
  for (const pwd of candidatePasswords) {
    if (sha256Hash(pwd) === expectedHash) {
      console.log(`  🟢 MATCH FOUND! Email: ${email} | Password: "${pwd}"`);
      found = true;
      break;
    }
  }
  if (!found) {
    console.log(`  ❌ No candidate matched stored hash: ${expectedHash}`);
  }
}
