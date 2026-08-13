import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hljwxadlzlfokeyimcbm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsand4YWRsemxmb2tleWltY2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTU2NDcsImV4cCI6MjEwMDYzMTY0N30.Bfc0Qo-i-0H2TySa6g7r8juNaVAAdGiiQSlCUgsr1VQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAuthenticatedMigration() {
  console.log("=== EXECUTING MIGRATION 18 DATA SEEDING ===");

  // 1. Insert Categories
  const categories = [
    { category_name: "GST Services", description: "Goods and Services Tax filings, LUT, and registrations", display_order: 1, is_active: true },
    { category_name: "Income Tax / ITR", description: "Income tax returns, tax audit, and assessment support", display_order: 2, is_active: true },
    { category_name: "TDS & TCS", description: "Tax Deducted at Source quarterly returns and challans", display_order: 3, is_active: true },
    { category_name: "Labour & Statutory Compliances", description: "PF, ESIC, Professional Tax (PTEC & PTRC)", display_order: 4, is_active: true },
    { category_name: "Licences & Government Registrations", description: "FSSAI, Udyam MSME, Shop Act, IEC, Trademark", display_order: 5, is_active: true },
    { category_name: "ROC & Corporate Law", description: "MCA filings, company incorporation, DIR-3 KYC", display_order: 6, is_active: true },
    { category_name: "Accounting, Audit & Advisory", description: "Financial statements, statutory audit, loans & bookkeeping", display_order: 7, is_active: true }
  ];

  const { data: catData, error: catErr } = await supabase
    .from("jn_service_categories")
    .upsert(categories, { onConflict: "category_name" })
    .select("*");

  if (catErr) {
    console.error("Categories upsert error:", catErr);
    return;
  }
  console.log("Categories upserted successfully:", catData.length);

  // Map category_name -> id
  const { data: allCats } = await supabase.from("jn_service_categories").select("*");
  const catMap = {};
  (allCats || []).forEach(c => { catMap[c.category_name] = c.id; });

  // 2. Insert All 29 Services
  const servicesToSeed = [
    { service_number: "SRV00001", service_name: "GST Return - GSTR-1", category_name: "GST Services", standard_fee: 1500, sac_code: "998311", gst_rate: 18, description: "Statement of outward supplies" },
    { service_number: "SRV00002", service_name: "GST Return - GSTR-3B", category_name: "GST Services", standard_fee: 1500, sac_code: "998311", gst_rate: 18, description: "Monthly self-declared summary GST return" },
    { service_number: "SRV00003", service_name: "GST Annual Return - GSTR-9", category_name: "GST Services", standard_fee: 5000, sac_code: "998311", gst_rate: 18, description: "Comprehensive annual GST return" },
    { service_number: "SRV00004", service_name: "GST Registration Services", category_name: "GST Services", standard_fee: 2500, sac_code: "998311", gst_rate: 18, description: "Fresh GST identification number setup" },
    { service_number: "SRV00005", service_name: "GST LUT Filing (Form RFD-11)", category_name: "GST Services", standard_fee: 1500, sac_code: "998311", gst_rate: 18, description: "Letter of Undertaking for tax-free exports" },
    
    { service_number: "SRV00006", service_name: "Income Tax Return - ITR-1 (Sahaj)", category_name: "Income Tax / ITR", standard_fee: 1000, sac_code: "998311", gst_rate: 18, description: "Salary and single house property filing" },
    { service_number: "SRV00007", service_name: "Income Tax Return - ITR-4 (Sugam)", category_name: "Income Tax / ITR", standard_fee: 2500, sac_code: "998311", gst_rate: 18, description: "Presumptive business income 44AD/44ADA" },
    { service_number: "SRV00008", service_name: "Income Tax Return - ITR-2 / ITR-3", category_name: "Income Tax / ITR", standard_fee: 4000, sac_code: "998311", gst_rate: 18, description: "Capital gains and business returns" },
    { service_number: "SRV00009", service_name: "Tax Audit u/s 44AB", category_name: "Income Tax / ITR", standard_fee: 15000, sac_code: "998311", gst_rate: 18, description: "Tax Audit report filing 3CA/3CB & 3CD" },
    
    { service_number: "SRV00010", service_name: "TDS Quarterly Returns", category_name: "TDS & TCS", standard_fee: 2000, sac_code: "998311", gst_rate: 18, description: "Form 24Q and 26Q quarterly returns" },
    { service_number: "SRV00011", service_name: "TCS Quarterly Return", category_name: "TDS & TCS", standard_fee: 2000, sac_code: "998311", gst_rate: 18, description: "Form 27EQ collection returns" },
    { service_number: "SRV00012", service_name: "TDS Challan 281 / Form 16 / Form 16A", category_name: "TDS & TCS", standard_fee: 1000, sac_code: "998311", gst_rate: 18, description: "TDS payment and certificate issuance" },
    
    { service_number: "SRV00013", service_name: "PF Monthly ECR Return", category_name: "Labour & Statutory Compliances", standard_fee: 1500, sac_code: "998311", gst_rate: 18, description: "EPFO wage list & monthly return" },
    { service_number: "SRV00014", service_name: "ESIC Monthly Wage Contribution", category_name: "Labour & Statutory Compliances", standard_fee: 1500, sac_code: "998311", gst_rate: 18, description: "ESIC wage contribution mapping & payment" },
    { service_number: "SRV00015", service_name: "Professional Tax - PTEC", category_name: "Labour & Statutory Compliances", standard_fee: 1500, sac_code: "998311", gst_rate: 18, description: "Professional Tax Enrollment Certificate services" },
    { service_number: "SRV00016", service_name: "Professional Tax - PTRC", category_name: "Labour & Statutory Compliances", standard_fee: 1500, sac_code: "998311", gst_rate: 18, description: "Professional Tax Registration Certificate employer return" },
    
    { service_number: "SRV00017", service_name: "FSSAI Food License", category_name: "Licences & Government Registrations", standard_fee: 3000, sac_code: "998311", gst_rate: 18, description: "FOSCOS Form B food business registration" },
    { service_number: "SRV00018", service_name: "Udyam MSME Certificate Registration", category_name: "Licences & Government Registrations", standard_fee: 1000, sac_code: "998311", gst_rate: 18, description: "MSME classification certificate" },
    { service_number: "SRV00019", service_name: "Shop & Establishment License / Shop Act / Gumasta", category_name: "Licences & Government Registrations", standard_fee: 2000, sac_code: "998311", gst_rate: 18, description: "Municipal shop act registration" },
    { service_number: "SRV00020", service_name: "Import Export Code (IEC)", category_name: "Licences & Government Registrations", standard_fee: 2500, sac_code: "998311", gst_rate: 18, description: "DGFT IEC registration and annual update" },
    { service_number: "SRV00021", service_name: "Trademark & IP Registration", category_name: "Licences & Government Registrations", standard_fee: 7500, sac_code: "998311", gst_rate: 18, description: "Brand protection and trademark filing" },
    
    { service_number: "SRV00022", service_name: "Company Incorporation", category_name: "ROC & Corporate Law", standard_fee: 10000, sac_code: "998311", gst_rate: 18, description: "SPICe+ MCA company incorporation setup" },
    { service_number: "SRV00023", service_name: "LLP Annual Filing", category_name: "ROC & Corporate Law", standard_fee: 5000, sac_code: "998311", gst_rate: 18, description: "Form 11 Annual Return & Form 8 Accounts" },
    { service_number: "SRV00024", service_name: "ROC Annual Filings", category_name: "ROC & Corporate Law", standard_fee: 7500, sac_code: "998311", gst_rate: 18, description: "Form AOC-4 & MGT-7 annual returns" },
    { service_number: "SRV00025", service_name: "DIR-3 KYC", category_name: "ROC & Corporate Law", standard_fee: 1000, sac_code: "998311", gst_rate: 18, description: "Director KYC verification" },
    
    { service_number: "SRV00026", service_name: "Financial Statement & Balance Sheet Preparation", category_name: "Accounting, Audit & Advisory", standard_fee: 5000, sac_code: "998311", gst_rate: 18, description: "Annual financial statement preparation" },
    { service_number: "SRV00027", service_name: "Bank Loan CMA Data & Project Report Preparation", category_name: "Accounting, Audit & Advisory", standard_fee: 7500, sac_code: "998311", gst_rate: 18, description: "CMA data & project report for bank financing" },
    { service_number: "SRV00028", service_name: "Statutory Audit & Concurrent Audit", category_name: "Accounting, Audit & Advisory", standard_fee: 15000, sac_code: "998311", gst_rate: 18, description: "Statutory audit & compliance review" },
    { service_number: "SRV00029", service_name: "Payroll Processing & Bookkeeping", category_name: "Accounting, Audit & Advisory", standard_fee: 3000, sac_code: "998311", gst_rate: 18, description: "Monthly bookkeeping and wage processing" }
  ];

  const payload = servicesToSeed.map(s => ({
    service_number: s.service_number,
    service_name: s.service_name,
    category_id: catMap[s.category_name],
    category_name: s.category_name,
    standard_fee: s.standard_fee,
    sac_code: s.sac_code,
    gst_rate: s.gst_rate,
    description: s.description,
    is_active: true
  }));

  const { data: srvData, error: srvErr } = await supabase
    .from("jn_services")
    .upsert(payload, { onConflict: "service_number" })
    .select("*");

  if (srvErr) {
    console.error("Services upsert error:", srvErr);
  } else {
    console.log("Services upserted successfully:", srvData.length);
  }
}

runAuthenticatedMigration();
