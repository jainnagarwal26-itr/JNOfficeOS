/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function numberToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  function convertLessThanOneThousand(n: number): string {
    let word = "";
    if (n % 100 < 20) {
      word = a[n % 100];
      n = Math.floor(n / 100);
    } else {
      word = a[n % 10];
      n = Math.floor(n / 10);
      word = b[n % 10] + (word ? " " + word : "");
      n = Math.floor(n / 10);
    }
    if (n === 0) return word;
    return a[n] + " Hundred" + (word ? " " + word : "");
  }
  
  let integerPart = Math.floor(num);
  let paisaPart = Math.round((num - integerPart) * 100);
  
  let result = "";
  
  if (integerPart === 0) {
    result = "Zero";
  } else {
    const parts = [];
    
    // Hundreds & Tens
    parts.push(integerPart % 1000);
    integerPart = Math.floor(integerPart / 1000);
    
    // Thousands
    parts.push(integerPart % 100);
    integerPart = Math.floor(integerPart / 100);
    
    // Lakhs
    parts.push(integerPart % 100);
    integerPart = Math.floor(integerPart / 100);
    
    // Crores
    parts.push(integerPart); // All remaining is crore
    
    const words = [];
    
    if (parts[3] > 0) {
      words.push(convertLessThanOneThousand(parts[3]) + " Crore");
    }
    if (parts[2] > 0) {
      words.push(convertLessThanOneThousand(parts[2]) + " Lakh");
    }
    if (parts[1] > 0) {
      words.push(convertLessThanOneThousand(parts[1]) + " Thousand");
    }
    if (parts[0] > 0) {
      words.push(convertLessThanOneThousand(parts[0]));
    }
    
    result = words.join(" ");
  }
  
  let finalStr = result + " Rupees";
  if (paisaPart > 0) {
    finalStr += " and " + convertLessThanOneThousand(paisaPart) + " Paisa";
  }
  finalStr += " Only";
  
  return finalStr.replace(/\s+/g, " ").trim();
}
