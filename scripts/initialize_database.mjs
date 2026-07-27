/**
 * JN OfficeOS V2.0 - One-Time Production Database Initialization & Client Migration Script
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hljwxadlzlfokeyimcbm.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl) {
  console.error("Missing VITE_SUPABASE_URL");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SEED_CLIENTS = [
  {
    client_number: "CL000001",
    category: "Individual",
    client_name: "Anchal Baleshwar Chobe",
    trade_name: "Anchal Baleshwar Chobe",
    business_name: "",
    client_source: "Direct",
    referred_by: "",
    mobile: "+91 9821482419",
    alternate_mobile: "",
    whatsapp: "+91 9821482419",
    email: "abcchobe123@gmail.com",
    website: "",
    pan: "ABCDE1234F",
    aadhaar: "1234-5678-9012",
    gstin: "27ABCDE1234F1Z5",
    tan: "",
    udyam_registration: "",
    fssai_number: "",
    iec_number: "",
    professional_tax_number: "",
    pf_number: "",
    esic_number: "",
    cin: "",
    msme: "None",
    office_address: "Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    pin_code: "400076",
    country: "India",
    bank_name: "HDFC Bank",
    account_holder: "Anchal Baleshwar Chobe",
    account_number: "502000123456",
    ifsc: "HDFC0000123",
    branch: "Powai Branch",
    upi: "",
    business_nature: "",
    business_type: "Services",
    constitution: "Individual",
    date_of_incorporation: null,
    date_of_registration: null,
    financial_year: "2026-27",
    assessment_year: "2027-28",
    status: "Active",
    tags: ["VIP"],
    internal_notes: "Migrated from JN OfficeOS system database"
  },
  {
    client_number: "CL000002",
    category: "Individual",
    client_name: "KRISHNAKUMAR HEERALAL KANOJIYA",
    trade_name: "KRISHNAKUMAR HEERALAL KANOJIYA",
    business_name: "",
    client_source: "Direct",
    referred_by: "",
    mobile: "+91 9082404569",
    alternate_mobile: "",
    whatsapp: "+91 9082404569",
    email: "krishna.kk620@gmail.com",
    website: "",
    pan: "FGHIJ5678K",
    aadhaar: "",
    gstin: "27FGHIJ5678K1Z2",
    tan: "",
    udyam_registration: "",
    fssai_number: "",
    iec_number: "",
    professional_tax_number: "",
    pf_number: "",
    esic_number: "",
    cin: "",
    msme: "None",
    office_address: "Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    pin_code: "400076",
    country: "India",
    bank_name: "",
    account_holder: "KRISHNAKUMAR HEERALAL KANOJIYA",
    account_number: "",
    ifsc: "",
    branch: "",
    upi: "",
    business_nature: "",
    business_type: "Services",
    constitution: "Individual",
    date_of_incorporation: null,
    date_of_registration: null,
    financial_year: "2026-27",
    assessment_year: "2027-28",
    status: "Active",
    tags: [],
    internal_notes: "Migrated from JN OfficeOS system database"
  }
];

async function runInitialization() {
  console.log("Starting Production Database Client Migration to Supabase...");
  console.log("Target Project URL:", supabaseUrl);

  const { data, error } = await supabase
    .from("jn_clients")
    .upsert(SEED_CLIENTS, { onConflict: "client_number" })
    .select();

  if (error) {
    console.error("Migration Error:", error);
  } else {
    console.log("Successfully migrated clients to Supabase:", data.length, "records");
    data.forEach(c => console.log(` - [${c.client_number}] ${c.client_name} (PAN: ${c.pan}, GSTIN: ${c.gstin})`));
  }
}

runInitialization();
