/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { DashboardDesignerRepository, DashboardConfig, DashboardWidget } from "../../lib/configurationRepositories";
import { LayoutGrid, Save, Sliders, Check, EyeOff, Eye, Lock, Unlock, Grid } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const DashboardDesigner: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [config, setConfig] = useState<DashboardConfig>(() => DashboardDesignerRepository.getDashboardConfig());

  const handleSaveDashboard = () => {
    try {
      DashboardDesignerRepository.saveDashboardConfig(config, currentUser);
      onShowToast("Dashboard visual layout saved!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to save dashboard", "error");
    }
  };

  const toggleWidgetVisibility = (id: string) => {
    if (config.widgetLocking) {
      onShowToast("Layout is locked! Unlock to configure widgets.", "error");
      return;
    }
    const updated = config.widgets.map(w => (w.id === id ? { ...w, visible: !w.visible } : w));
    setConfig({ ...config, widgets: updated });
  };

  const changeWidgetSize = (id: string, size: DashboardWidget["size"]) => {
    if (config.widgetLocking) {
      onShowToast("Layout is locked!", "error");
      return;
    }
    const updated = config.widgets.map(w => (w.id === id ? { ...w, size } : w));
    setConfig({ ...config, widgets: updated });
  };

  const reorderWidgets = (id: string, dir: "up" | "down") => {
    if (config.widgetLocking) return;
    const order = [...config.widgetOrdering];
    const index = order.indexOf(id);
    if (index === -1) return;

    if (dir === "up" && index > 0) {
      const temp = order[index - 1];
      order[index - 1] = order[index];
      order[index] = temp;
    } else if (dir === "down" && index < order.length - 1) {
      const temp = order[index + 1];
      order[index + 1] = order[index];
      order[index] = temp;
    }
    setConfig({ ...config, widgetOrdering: order });
  };

  const applyTemplate = (templateId: string) => {
    const template = config.templates.find(t => t.id === templateId);
    if (!template) return;

    const updated = config.widgets.map(w => ({
      ...w,
      visible: template.widgets.includes(w.id)
    }));

    setConfig({
      ...config,
      widgets: updated,
      widgetOrdering: [...template.widgets, ...config.widgets.filter(w => !template.widgets.includes(w.id)).map(w => w.id)]
    });
    onShowToast(`Applied dashboard template: '${template.name}'`, "success");
  };

  return (
    <div className="space-y-6" id="dashboard-designer-panel">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Low-Code Dashboard Designer</h3>
              <p className="text-xs text-slate-400 font-sans">Rearrange layout, visibility, and size boundaries of visual widgets</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setConfig({ ...config, widgetLocking: !config.widgetLocking })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                config.widgetLocking
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {config.widgetLocking ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Lock Enabled
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Lock Disabled
                </>
              )}
            </button>
            <button
              onClick={handleSaveDashboard}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-md"
              id="save-dashboard-designer-btn"
            >
              <Save className="w-3.5 h-3.5" /> Save Layout
            </button>
          </div>
        </div>

        {/* Templates Selection */}
        <div className="flex items-center gap-3 mb-6 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Default Layout Presets:</span>
          {config.templates.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl.id)}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] text-slate-300 font-medium transition-all"
            >
              {tpl.name}
            </button>
          ))}
        </div>

        {/* Designer Board Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls list */}
          <div className="space-y-4 lg:col-span-1">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Grid className="w-4 h-4 text-yellow-500" /> Widgets Structure
            </h4>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {config.widgets.map((widget, idx) => (
                <div key={widget.id} className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-200 font-semibold">{widget.title}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => reorderWidgets(widget.id, "up")}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => reorderWidgets(widget.id, "down")}
                        disabled={idx === config.widgets.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => toggleWidgetVisibility(widget.id)}
                        className={`p-1.5 rounded transition-all ${
                          widget.visible
                            ? "text-green-400 hover:bg-green-500/10"
                            : "text-slate-500 hover:bg-slate-800"
                        }`}
                      >
                        {widget.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-[11px]">
                    <span className="text-slate-400">Box Dimension:</span>
                    <div className="flex gap-1">
                      {(["Small", "Medium", "Large"] as DashboardWidget["size"][]).map(sz => (
                        <button
                          key={sz}
                          onClick={() => changeWidgetSize(widget.id, sz)}
                          className={`px-2 py-0.5 rounded text-[9px] ${
                            widget.size === sz
                              ? "bg-yellow-500 text-slate-950 font-bold"
                              : "bg-slate-900 text-slate-400"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas Simulation */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Low-code Interactive Canvas Mockup</h4>
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 min-h-[300px] grid grid-cols-1 md:grid-cols-6 gap-3">
              {config.widgetOrdering
                .map(id => config.widgets.find(w => w.id === id)!)
                .filter(w => w && w.visible)
                .map(widget => {
                  const sizeClass =
                    widget.size === "Small"
                      ? "md:col-span-2"
                      : widget.size === "Medium"
                      ? "md:col-span-3"
                      : "md:col-span-6";

                  return (
                    <div
                      key={widget.id}
                      className={`${sizeClass} border border-slate-800/60 bg-slate-900/40 p-4 rounded-lg flex flex-col justify-between hover:border-yellow-500/40 transition-all group`}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-slate-300 group-hover:text-yellow-400 transition-colors">
                          {widget.title}
                        </span>
                        <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">
                          {widget.size} Box
                        </span>
                      </div>
                      <div className="h-16 flex items-center justify-center border border-dashed border-slate-800 rounded bg-slate-950/40 text-[10px] text-slate-500 uppercase tracking-wide">
                        {widget.type} Content Widget Area
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
