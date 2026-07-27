/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, AlertCircle, FileText, Calendar, UserCheck, ShieldCheck, Tag 
} from "lucide-react";
import { ComplianceRegisterRecord } from "../types/compliance";
import { ComplianceRepository } from "../lib/complianceRepository";
import { getUsers } from "../lib/db";
import { User } from "../types";

interface MarkAsFiledDialogProps {
  record: ComplianceRegisterRecord | null;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkAsFiledDialog({ record, currentUser, onClose, onSuccess }: MarkAsFiledDialogProps) {
  const [filedDate, setFiledDate] = useState(new Date().toISOString().split("T")[0]);
  const [ackNumber, setAckNumber] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [staffUsers, setStaffUsers] = useState<User[]>([]);

  useEffect(() => {
    setStaffUsers(getUsers());
    if (record) {
      setAckNumber(record.ackNumber || "");
      setReviewedBy(record.reviewedBy || currentUser.name);
      setApprovedBy(record.approvedBy || "Partner Office");
      setRemarks(record.remarks || "");
    }
  }, [record, currentUser]);

  if (!record) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!ackNumber.trim()) {
      setError("Government Acknowledgement Number is strictly mandatory.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedRecord: ComplianceRegisterRecord = {
        ...record,
        filedDate,
        ackNumber: ackNumber.trim(),
        reviewedBy,
        approvedBy,
        remarks: remarks.trim(),
        status: "FILED",
        updatedAt: new Date().toISOString()
      };

      ComplianceRepository.saveRecord(updatedRecord, currentUser.name);
      ComplianceRepository.addActivityLog(
        record.recordId, 
        record.clientId, 
        "MARKED_AS_FILED", 
        currentUser.name, 
        `Statutory return marked FILED with Ack No: ${ackNumber.trim()}`
      );

      onSuccess();
    } catch (err: any) {
      setError("Failed to record filing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden text-xs">
        
        {/* Header */}
        <div className="bg-[#0D2C6C] p-5 text-white flex justify-between items-center">
          <div>
            <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest block">Structured Compliance Filing Workflow</span>
            <h3 className="font-display font-black text-sm text-white mt-0.5">{record.complianceName}</h3>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Metadata Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 text-[9px] font-bold block uppercase">FY / AY</span>
              <span className="font-mono font-bold text-slate-800">{record.fy} / {record.ay}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] font-bold block uppercase">Period</span>
              <span className="font-semibold text-slate-800">{record.period}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] font-bold block uppercase">Due Date</span>
              <span className="font-mono font-bold text-slate-800">{record.dueDate}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[9px] font-bold block uppercase">Current Status</span>
              <span className="font-bold text-amber-700 font-mono">{record.status}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Ack Number */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Government Acknowledgement Number *
            </label>
            <input
              type="text"
              required
              value={ackNumber}
              onChange={(e) => setAckNumber(e.target.value)}
              placeholder="e.g., AA270726123456B / 10023485721"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-mono text-xs font-bold text-[#0D2C6C] focus:outline-none focus:border-[#0D2C6C]"
            />
          </div>

          {/* Filed Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                Filing Date *
              </label>
              <input
                type="date"
                required
                value={filedDate}
                onChange={(e) => setFiledDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:border-[#0D2C6C]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                Reviewed By Practitioner
              </label>
              <input
                type="text"
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
                placeholder="e.g., CA Chirag Jain"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0D2C6C]"
              />
            </div>
          </div>

          {/* Approved By & Remarks */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Filing Remarks / Notes
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Specify challan BSR code, tax paid amount, refund claim status, or verification notes..."
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0D2C6C]"
            />
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[10px] text-amber-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>Storage Independent Mode: Records structured filing metadata directly to audit ledger without PDF/storage dependencies.</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? "Recording..." : "Record Statutory Filing"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
