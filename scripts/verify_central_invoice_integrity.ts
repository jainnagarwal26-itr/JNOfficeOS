import { CentralInvoiceRepository } from "../src/lib/centralInvoiceRepository";

async function runCentralInvoiceAudit() {
  console.log("=========================================================");
  console.log(" MODULE B — CENTRAL INVOICE INTEGRITY AUDIT");
  console.log("=========================================================\n");

  let allPassed = true;

  // 1. Resolve Canonical Client UUID for CL000003 (Parag Kadam)
  const resolved = await CentralInvoiceRepository.resolveClientUuid("CL000003");
  const expectedUuid = "6ea6117f-02d1-4546-8cb9-68d82806bf30";
  const canonicalOk = resolved.uuid === expectedUuid;

  console.log(`1. Resolve Canonical Client UUID (CL000003 -> ${expectedUuid}): ${canonicalOk ? "✓ PASS" : "❌ FAIL"}`);
  if (!canonicalOk) allPassed = false;

  // 2. Test Atomic Central Invoice Creation for Parag Kadam
  const invDate = new Date().toISOString().split("T")[0];
  const dueDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0];

  const invRes = await CentralInvoiceRepository.createInvoice({
    clientId: "6ea6117f-02d1-4546-8cb9-68d82806bf30",
    clientName: "Parag Kadam",
    invoiceDate: invDate,
    dueDate: dueDate,
    subTotal: 15000,
    cgstAmount: 1350,
    sgstAmount: 1350,
    igstAmount: 0,
    gstAmount: 2700,
    totalAmount: 17700,
    notes: "Professional Taxation & Compliance Retainership",
    sourceModule: "CASE_MANAGEMENT",
    sourceReferenceId: "test_ref_001",
    createdBy: "57235de4-9fc6-42a5-86f3-df2dbb4506f7",
    items: [
      {
        serviceId: "srv_test_01",
        serviceName: "Labour & Statutory Compliances - PTEC",
        sacCode: "998311",
        quantity: 1,
        unitPrice: 15000,
        taxableAmount: 15000,
        gstRate: 18,
        gstAmount: 2700,
        totalAmount: 17700
      }
    ]
  });

  console.log(`2. Central Invoice Creation: ${invRes.success ? "✓ PASS" : "❌ FAIL"} (Invoice Number: ${invRes.invoiceNumber || "N/A"})`);
  if (!invRes.success) allPassed = false;

  console.log("\n=========================================================");
  console.log(` MODULE B AUDIT RESULT: ${allPassed ? "🟢 ALL CHECKS PASSED" : "🔴 FAILURE DETECTED"}`);
  console.log("=========================================================\n");
}

runCentralInvoiceAudit();
