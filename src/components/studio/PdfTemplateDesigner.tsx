/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { TemplateDesignerRepository, PdfTemplateConfig } from "../../lib/configurationRepositories";
import { FileText, Save, Sliders, Check } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const PdfTemplateDesigner: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [config, setConfig] = useState<PdfTemplateConfig>(() => {
    const templates = TemplateDesignerRepository.getTemplates();
    return templates.find(t => t.id === "invoice") || {
      id: "invoice",
      logoPosition: "Left",
      showHeader: true,
      showFooter: true,
      margins: { top: 15, bottom: 15, left: 10, right: 10 },
      watermarkText: "JAIN AGARWAL & CO.",
      qrPosition: "BottomRight",
      signaturePosition: "BottomRight",
      showPageNumbers: true
    };
  });

  const handleSavePdf = () => {
    try {
      TemplateDesignerRepository.saveTemplate(config, currentUser);
      onShowToast("PDF templates design updated successfully!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to save PDF templates", "error");
    }
  };

  return (
    <div className="space-y-6" id="pdf-template-designer-panel">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">PDF Template Designer</h3>
              <p className="text-xs text-slate-400">Configure visual layout margins, compliance watermarks, and certification stamps</p>
            </div>
          </div>
          <button
            onClick={handleSavePdf}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-md"
            id="save-pdf-designer-btn"
          >
            <Save className="w-3.5 h-3.5" /> Save PDF Layout Config
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Design sliders (Col A) */}
          <div className="space-y-6">
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-yellow-500" /> Print Page Margins (mm)
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Top Margin</span>
                    <span className="font-mono text-yellow-500">{config.margins.top}mm</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    value={config.margins.top}
                    onChange={e => setConfig({
                      ...config,
                      margins: { ...config.margins, top: Number(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Bottom Margin</span>
                    <span className="font-mono text-yellow-500">{config.margins.bottom}mm</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    value={config.margins.bottom}
                    onChange={e => setConfig({
                      ...config,
                      margins: { ...config.margins, bottom: Number(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Left Margin</span>
                    <span className="font-mono text-yellow-500">{config.margins.left}mm</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    value={config.margins.left}
                    onChange={e => setConfig({
                      ...config,
                      margins: { ...config.margins, left: Number(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Right Margin</span>
                    <span className="font-mono text-yellow-500">{config.margins.right}mm</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    value={config.margins.right}
                    onChange={e => setConfig({
                      ...config,
                      margins: { ...config.margins, right: Number(e.target.value) }
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Watermark & Stamps</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Compliance Watermark</label>
                  <input
                    type="text"
                    placeholder="e.g. DUPLICATE COPY"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-yellow-500"
                    value={config.watermarkText}
                    onChange={e => setConfig({ ...config, watermarkText: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Brand Logo Placement</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                    value={config.logoPosition}
                    onChange={e => setConfig({ ...config, logoPosition: e.target.value as any })}
                  >
                    <option value="Left">Left Corner</option>
                    <option value="Center">Centered Header</option>
                    <option value="Hidden">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <input
                    type="checkbox"
                    id="digital-qr-cb"
                    className="w-3.5 h-3.5 text-yellow-500 accent-yellow-500 bg-slate-900"
                    checked={config.qrPosition !== "Hidden"}
                    onChange={e => setConfig({ ...config, qrPosition: e.target.checked ? "BottomRight" : "Hidden" })}
                  />
                  <label htmlFor="digital-qr-cb" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Append Verified QR stamp
                  </label>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <input
                    type="checkbox"
                    id="auto-sign-cb"
                    className="w-3.5 h-3.5 text-yellow-500 accent-yellow-500 bg-slate-900"
                    checked={config.signaturePosition !== "Hidden"}
                    onChange={e => setConfig({ ...config, signaturePosition: e.target.checked ? "BottomRight" : "Hidden" })}
                  />
                  <label htmlFor="auto-sign-cb" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Authorize Partner Sign-stamp
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Print Mockup (Col B) */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Dynamic Layout Blueprint</h4>
            <div className="bg-white rounded-xl p-8 shadow-2xl border border-slate-300 min-h-[380px] max-w-sm mx-auto relative text-slate-800 flex flex-col justify-between">
              {/* Margins Border Mock */}
              <div
                className="absolute inset-0 border border-dashed border-red-300/40 pointer-events-none transition-all"
                style={{
                  top: `${config.margins.top}px`,
                  bottom: `${config.margins.bottom}px`,
                  left: `${config.margins.left}px`,
                  right: `${config.margins.right}px`
                }}
              />

              {/* Watermark Simulation */}
              {config.watermarkText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <span className="text-slate-200/45 font-bold text-3xl tracking-widest uppercase rotate-45 select-none whitespace-nowrap">
                    {config.watermarkText}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4 relative z-10">
                {config.logoPosition === "Left" ? (
                  <div className="w-12 h-12 bg-white rounded border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    <img 
                      src="/logo.jpeg" 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-12" />
                )}

                {config.logoPosition === "Center" && (
                  <div className="w-full flex justify-center pb-2">
                    <div className="w-12 h-12 bg-white rounded border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      <img 
                        src="/logo.jpeg" 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                <div className="text-right">
                  <h5 className="font-extrabold text-xs text-slate-900 uppercase">TAX INVOICE</h5>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">INV-2026/004</p>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4 py-6 relative z-10">
                <div className="flex justify-between text-[10px] text-slate-500 border-b border-slate-100 pb-2">
                  <span className="font-medium">Client Reference: JN Global</span>
                  <span>Date: 2026-07-18</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>GST Compliance Advisory & Filing</span>
                    <span className="font-mono font-bold">₹10,000.00</span>
                  </div>
                </div>
              </div>

              {/* Footer Stamp & Signatures */}
              <div className="flex justify-between items-end border-t border-slate-200 pt-4 relative z-10">
                {config.qrPosition !== "Hidden" ? (
                  <div className="w-12 h-12 bg-slate-900 p-1 rounded flex flex-col items-center justify-center text-[7px] text-white font-mono">
                    <span className="font-bold">VERIFIED</span>
                    <span className="scale-[0.8]">QR-M2</span>
                  </div>
                ) : (
                  <div className="w-12" />
                )}

                {config.signaturePosition !== "Hidden" && (
                  <div className="text-right">
                    <p className="text-[9px] italic text-slate-500 font-serif">JN Partners</p>
                    <p className="text-[8px] font-bold text-slate-700 border-t border-slate-200 pt-1">Authorized Signatory</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
