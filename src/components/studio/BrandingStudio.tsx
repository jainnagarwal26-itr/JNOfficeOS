/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { BrandingRepository, BrandingConfig } from "../../lib/configurationRepositories";
import { Palette, Save, Sliders, Laptop, Sparkles } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const BrandingStudio: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [branding, setBranding] = useState<BrandingConfig>(() => BrandingRepository.getBranding());

  const handleSaveBranding = () => {
    try {
      BrandingRepository.updateBranding(branding, currentUser);
      onShowToast("Branding settings saved successfully!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to save branding configurations", "error");
    }
  };

  return (
    <div className="space-y-6" id="branding-studio-panel">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Palette className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Branding Studio</h3>
              <p className="text-xs text-slate-400">Manage identity details, palette guidelines, and visual parameters</p>
            </div>
          </div>
          <button
            onClick={handleSaveBranding}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-md"
            id="save-branding-btn"
          >
            <Save className="w-3.5 h-3.5" /> Save Brand Config
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colors */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-yellow-500" /> Style Parameters
            </h4>

            <div className="space-y-3 bg-slate-950/40 border border-slate-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-medium">Primary Palette Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                    value={branding.primaryColor}
                    onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[10px]"
                    value={branding.primaryColor}
                    onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-medium">Secondary Palette Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                    value={branding.secondaryColor}
                    onChange={e => setBranding({ ...branding, secondaryColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[10px]"
                    value={branding.secondaryColor}
                    onChange={e => setBranding({ ...branding, secondaryColor: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-medium">Accent Highlight Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                    value={branding.accentColor}
                    onChange={e => setBranding({ ...branding, accentColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[10px]"
                    value={branding.accentColor}
                    onChange={e => setBranding({ ...branding, accentColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Border Corner Radius</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                value={branding.borderRadius}
                onChange={e => setBranding({ ...branding, borderRadius: e.target.value as any })}
              >
                <option value="None">None (Brutalist Sharp Corners)</option>
                <option value="Small">Small (Sleek Micro-radius)</option>
                <option value="Medium">Medium (Balanced Slate Modern)</option>
                <option value="Large">Large (Soft Premium curves)</option>
              </select>
            </div>
          </div>

          {/* Sidebar & Layout */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Laptop className="w-4 h-4 text-yellow-500" /> Structure & Theme
            </h4>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Sidebar Visual Style</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                  value={branding.sidebarStyle}
                  onChange={e => setBranding({ ...branding, sidebarStyle: e.target.value as any })}
                >
                  <option value="Solid">Solid Block Navy</option>
                  <option value="Glassmorphic">Glassmorphic (Ambient Background)</option>
                  <option value="Minimal">Minimal Thin Borders</option>
                  <option value="Luxury">Luxury (Thin gold line highlights)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Header Style</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                  value={branding.headerStyle}
                  onChange={e => setBranding({ ...branding, headerStyle: e.target.value as any })}
                >
                  <option value="Sticky">Sticky (Docked Top)</option>
                  <option value="Floating">Floating (Curved card offset)</option>
                  <option value="Minimal">Minimal Unbordered</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Card Board Container Style</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                  value={branding.cardStyle}
                  onChange={e => setBranding({ ...branding, cardStyle: e.target.value as any })}
                >
                  <option value="Flat">Flat Slate Borders</option>
                  <option value="Elevated">Elevated Shadow Borders</option>
                  <option value="Glass">Glass-ambient Translucent Cards</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-yellow-500 accent-yellow-500 bg-slate-900 border-slate-700"
                    checked={branding.darkTheme}
                    onChange={e => setBranding({ ...branding, darkTheme: e.target.checked })}
                    id="dark-theme-cb"
                  />
                  <label htmlFor="dark-theme-cb" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Dark Theme
                  </label>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 opacity-60">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-yellow-500 accent-yellow-500 bg-slate-900 border-slate-700 cursor-not-allowed"
                    checked={branding.lightThemeReady}
                    disabled
                    id="light-theme-cb"
                  />
                  <label htmlFor="light-theme-cb" className="text-xs text-slate-400 font-medium cursor-not-allowed">
                    Light Theme (Future)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Login Screen & Animations */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" /> Micro-Interactions & Login
            </h4>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Transitions & Animation Level</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                  value={branding.animationLevel}
                  onChange={e => setBranding({ ...branding, animationLevel: e.target.value as any })}
                >
                  <option value="None">None (Instant loading rendering)</option>
                  <option value="Low">Low (Subtle fades only)</option>
                  <option value="Full">Full (Active spring-motion slides)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Login Screen Background Theme</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                  value={branding.loginScreenBranding.backgroundStyle}
                  onChange={e => setBranding({
                    ...branding,
                    loginScreenBranding: { ...branding.loginScreenBranding, backgroundStyle: e.target.value as any }
                  })}
                >
                  <option value="Slate">Slate Grey Minimal</option>
                  <option value="Midnight">Midnight Obsidian</option>
                  <option value="DarkNavy">Deep Corporate Navy</option>
                  <option value="EnterpriseGrad">Lustrous Gold-Navy Gradient</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Login Panel Welcome Tagline</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-yellow-500"
                  value={branding.loginScreenBranding.welcomeText}
                  onChange={e => setBranding({
                    ...branding,
                    loginScreenBranding: { ...branding.loginScreenBranding, welcomeText: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Visual Preview Mockup */}
        <div className="mt-8 border-t border-slate-800/80 pt-6">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Aesthetic Workspace Preview</h4>
          <div className="bg-slate-950 rounded-xl p-6 border border-slate-800 max-w-xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branding.secondaryColor }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branding.accentColor }} />
              <span className="text-[10px] text-slate-500 font-mono uppercase">Color Accent Grid</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-4 border text-center transition-all bg-slate-900"
                style={{
                  borderColor: branding.secondaryColor,
                  borderRadius: branding.borderRadius === "None" ? "0px" : branding.borderRadius === "Small" ? "4px" : branding.borderRadius === "Medium" ? "8px" : "16px"
                }}
              >
                <p className="text-xs text-slate-200 font-medium">Navigation Card</p>
                <p className="text-[10px] text-slate-500">Live preview of selected parameters</p>
              </div>

              <div
                className="p-4 border text-center transition-all bg-slate-900"
                style={{
                  borderColor: branding.accentColor,
                  borderRadius: branding.borderRadius === "None" ? "0px" : branding.borderRadius === "Small" ? "4px" : branding.borderRadius === "Medium" ? "8px" : "16px"
                }}
              >
                <p className="text-xs text-slate-200 font-medium">Highlight Action Card</p>
                <p className="text-[10px]" style={{ color: branding.accentColor }}>Gold Highlights Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
