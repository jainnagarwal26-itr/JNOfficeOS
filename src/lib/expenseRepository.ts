/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 5: Office Expense Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { EnterpriseExpense } from "../types/expense";
import { User } from "../types";

export interface Expense {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  date: string; // Alias for UI compatibility
  category: string;
  paidTo: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  remarks?: string;
  receiptUrl?: string;
  createdAt: string;
}

const STORAGE_KEY = "jn_officeos_expenses";

const DEFAULT_INITIAL_EXPENSES: Expense[] = [
  {
    id: "EXP-2026-0001",
    expenseNumber: "EXP-2026-0001",
    expenseDate: "2026-07-05",
    date: "2026-07-05",
    category: "Office Rent",
    paidTo: "Premises Owner",
    amount: 35000,
    paymentMode: "Bank Transfer",
    referenceNumber: "TXN98172918",
    remarks: "July 2026 Office Premises Rent",
    createdAt: "2026-07-05T10:00:00.000Z"
  },
  {
    id: "EXP-2026-0002",
    expenseNumber: "EXP-2026-0002",
    expenseDate: "2026-07-10",
    date: "2026-07-10",
    category: "Software Subscriptions",
    paidTo: "Tally / Cloud Host",
    amount: 8500,
    paymentMode: "Credit Card",
    referenceNumber: "CC/4921",
    remarks: "Cloud Backup & Tally Renewal",
    createdAt: "2026-07-10T11:30:00.000Z"
  },
  {
    id: "EXP-2026-0003",
    expenseNumber: "EXP-2026-0003",
    expenseDate: "2026-07-15",
    date: "2026-07-15",
    category: "Printing & Stationery",
    paidTo: "Stationery Mart",
    amount: 4200,
    paymentMode: "UPI",
    referenceNumber: "UPI/7812918",
    remarks: "Audit files & paper reams",
    createdAt: "2026-07-15T15:00:00.000Z"
  }
];

export class ExpenseRepository {
  private static cache: Expense[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_INITIAL_EXPENSES;
      } else {
        this.cache = DEFAULT_INITIAL_EXPENSES;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
      }
    } catch (e) {
      this.cache = DEFAULT_INITIAL_EXPENSES;
    }
    this.isInitialized = true;
  }

  public static getExpenses(currentUser?: User): Expense[] {
    this.init();
    return this.cache;
  }

  public static saveExpense(expense: Expense): Expense {
    this.init();
    const idx = this.cache.findIndex(e => e.id === expense.id);
    if (idx >= 0) {
      this.cache[idx] = expense;
    } else {
      this.cache.unshift(expense);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    return expense;
  }

  async recordExpense(expense: EnterpriseExpense): Promise<{ success: boolean; data?: EnterpriseExpense; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const payload: any = {
        expense_number: expense.expenseNumber,
        expense_date: expense.expenseDate,
        category: expense.category,
        paid_to: expense.paidTo,
        amount: expense.amount,
        payment_mode: expense.paymentMode,
        reference_number: expense.referenceNumber || null,
        remarks: expense.remarks || null,
        receipt_url: expense.receiptUrl || null
      };

      const { data, error } = await supabase
        .from("jn_expenses")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          expenseNumber: data.expense_number,
          expenseDate: data.expense_date,
          category: data.category,
          paidTo: data.paid_to,
          amount: data.amount,
          paymentMode: data.payment_mode,
          referenceNumber: data.reference_number,
          remarks: data.remarks,
          receiptUrl: data.receipt_url,
          createdAt: data.created_at
        }
      };
    } catch (err: any) {
      console.error("[ExpenseRepository] recordExpense error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const expenseRepository = new ExpenseRepository();
