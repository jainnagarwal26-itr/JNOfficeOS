// Polyfill import.meta.env for Node testing environment
if (typeof globalThis.import === "undefined") {
  (globalThis as any).import = { meta: { env: { VITE_SUPABASE_URL: "https://hljwxadlzlfokeyimcbm.supabase.co", VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ" } } };
}

import { 
  DocumentRepository, 
  DocumentVersionRepository, 
  DocumentVerificationRepository, 
  DocumentReminderRepository 
} from "../src/lib/documentRepository";

async function verifySmartDmsRuntime() {
  console.log("=========================================================");
  console.log(" SMART DMS PRO RUNTIME CONTRACT & INTEGRITY AUDIT");
  console.log("=========================================================\n");

  let passed = true;

  // 1. Check DocumentRepository static methods
  const methods = [
    "getDocuments", "getDeletedDocuments", "getChecklists", 
    "detectDuplicates", "uploadDocument", "deleteDocument", 
    "restoreDocument", "forceDeleteDocument", "getCompletionMeter"
  ];

  for (const m of methods) {
    const isFunc = typeof (DocumentRepository as any)[m] === "function";
    console.log(`1. DocumentRepository.${m} is function: -> ${isFunc ? "✓ PASS" : "❌ FAIL"}`);
    if (!isFunc) passed = false;
  }

  // 2. Check DocumentVersionRepository
  const verAddFunc = typeof (DocumentVersionRepository as any).addVersion === "function";
  console.log(`2. DocumentVersionRepository.addVersion is function: -> ${verAddFunc ? "✓ PASS" : "❌ FAIL"}`);
  if (!verAddFunc) passed = false;

  // 3. Check DocumentVerificationRepository
  const verUpdFunc = typeof (DocumentVerificationRepository as any).updateVerificationStatus === "function";
  console.log(`3. DocumentVerificationRepository.updateVerificationStatus is function: -> ${verUpdFunc ? "✓ PASS" : "❌ FAIL"}`);
  if (!verUpdFunc) passed = false;

  // 4. Check DocumentReminderRepository
  const remGetFunc = typeof (DocumentReminderRepository as any).getReminders === "function";
  console.log(`4. DocumentReminderRepository.getReminders is function: -> ${remGetFunc ? "✓ PASS" : "❌ FAIL"}`);
  if (!remGetFunc) passed = false;

  // 5. Test execution of getDocuments()
  try {
    const docs = DocumentRepository.getDocuments();
    const isArray = Array.isArray(docs);
    console.log(`5. DocumentRepository.getDocuments() returns array (${docs.length} items): -> ${isArray ? "✓ PASS" : "❌ FAIL"}`);
    if (!isArray) passed = false;
  } catch (err) {
    console.error("5. DocumentRepository.getDocuments() threw error:", err);
    passed = false;
  }

  console.log("\n=========================================================");
  console.log(` SMART DMS RUNTIME INTEGRITY RESULT: ${passed ? "🟢 ALL CHECKS PASSED" : "🔴 FAILURE DETECTED"}`);
  console.log("=========================================================\n");
}

verifySmartDmsRuntime();
