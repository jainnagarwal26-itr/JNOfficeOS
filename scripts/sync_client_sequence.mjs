/**
 * JN OfficeOS V2.0 - Sequence Synchronizer Script
 * Synchronizes jn_number_sequences for 'CLIENT' to current_value = 4
 * Guarantees next client generated is CL000005
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hljwxadlzlfokeyimcbm.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncSequence() {
  console.log("Synchronizing Client Sequence Counter...");

  const { data, error } = await supabase
    .from("jn_number_sequences")
    .upsert([
      {
        sequence_code: "CLIENT",
        prefix: "CL",
        current_value: 4,
        padding_length: 6,
        is_active: true
      }
    ], { onConflict: "sequence_code" })
    .select();

  if (error) {
    console.error("Failed to sync sequence:", error);
  } else {
    console.log("Successfully synchronized 'CLIENT' sequence. Current Value = 4.");
    console.log("Next generated client number will be: CL000005");
  }
}

syncSequence();
