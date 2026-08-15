import React, { useState, useEffect } from "react";
import { User } from "../../types";
import { getDepartments, saveDepartments, getDesignations, saveDesignations, Department, Designation, addAuditLog } from "../../lib/db";
import { OfflineSyncManager } from "../../lib/offlineSyncManager";
import { Building, Award, Plus, Trash2, Edit2, AlertCircle, RefreshCw, CheckCircle, Wifi, WifiOff } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const DepartmentsDesignationsStudio: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [departments, setDepartments] = useState<Department[]>(() => getDepartments());
  const [designations, setDesignations] = useState<Designation[]>(() => getDesignations());

  const [isOnline, setIsOnline] = useState<boolean>(() => OfflineSyncManager.isOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Form states for Department
  const [deptName, setDeptName] = useState("");
  const [deptStatus, setDeptStatus] = useState<"Active" | "Inactive">("Active");
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);

  // Form states for Designation
  const [desigName, setDesigName] = useState("");
  const [desigDeptId, setDesigDeptId] = useState("");
  const [desigStatus, setDesigStatus] = useState<"Active" | "Inactive">("Active");
  const [editingDesigId, setEditingDesigId] = useState<string | null>(null);

  // Monitor connectivity
  useEffect(() => {
    const handleStatus = () => {
      setIsOnline(OfflineSyncManager.isOnline());
    };
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);

    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  const handlePullLatest = () => {
    setIsSyncing(true);
    try {
      setDepartments(getDepartments());
      setDesignations(getDesignations());
      onShowToast("Master data reloaded successfully!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to reload fresh data.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- DEPARTMENT CRUD ---
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    if (!isOnline) {
      onShowToast("Internet connection required to modify master data.", "error");
      return;
    }

    setIsSyncing(true);
    try {
      if (editingDeptId) {
        // Edit Department
        const updatedDept: Partial<Department> = {
          Department_Name: deptName.trim(),
          Status: deptStatus,
          Last_Modified: new Date().toISOString()
        };

        const list = departments.map((d) =>
          d.Department_ID === editingDeptId ? { ...d, ...updatedDept } : d
        );
        setDepartments(list);
        saveDepartments(list);
        setEditingDeptId(null);
        setDeptName("");
        setDeptStatus("Active");
        onShowToast("Department updated successfully!", "success");

        addAuditLog(
          currentUser.email,
          currentUser.name,
          currentUser.role,
          "DEPARTMENT_EDIT",
          "DATABASE",
          `Department updated: "${deptName}" (ID: ${editingDeptId})`
        );
      } else {
        // Create Department
        const createdDept: Department = {
          Department_ID: `DEP${Date.now().toString().slice(-4)}`,
          Department_Name: deptName.trim(),
          Status: deptStatus,
          Last_Modified: new Date().toISOString()
        };

        const list = [...departments, createdDept];
        setDepartments(list);
        saveDepartments(list);
        setDeptName("");
        setDeptStatus("Active");
        onShowToast(`Department created successfully with ID: ${createdDept.Department_ID}!`, "success");

        addAuditLog(
          currentUser.email,
          currentUser.name,
          currentUser.role,
          "DEPARTMENT_CREATE",
          "DATABASE",
          `Department registered: "${createdDept.Department_Name}" with ID: ${createdDept.Department_ID}`
        );
      }
    } catch (err: any) {
      onShowToast(err.message || "Failed to save department.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditDept = (dept: Department) => {
    setEditingDeptId(dept.Department_ID);
    setDeptName(dept.Department_Name);
    setDeptStatus(dept.Status);
  };

  const handleDeleteDept = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this Department? Designations linked to this department will be orphaned.")) {
      return;
    }

    setIsSyncing(true);
    try {
      const list = departments.filter((d) => d.Department_ID !== id);
      setDepartments(list);
      saveDepartments(list);
      onShowToast("Department deleted successfully!", "success");

      addAuditLog(
        currentUser.email,
        currentUser.name,
        currentUser.role,
        "DEPARTMENT_DELETE",
        "DATABASE",
        `Department deleted (ID: ${id})`
      );
    } catch (err: any) {
      onShowToast(err.message || "Failed to delete department.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- DESIGNATION CRUD ---
  const handleSaveDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigName.trim() || !desigDeptId) {
      onShowToast("Please specify designation name and associate a department.", "error");
      return;
    }

    setIsSyncing(true);
    try {
      if (editingDesigId) {
        // Edit Designation
        const updatedDesig: Partial<Designation> = {
          Designation_Name: desigName.trim(),
          Department_ID: desigDeptId,
          Status: desigStatus,
          Last_Modified: new Date().toISOString()
        };

        const list = designations.map((dg) =>
          dg.Designation_ID === editingDesigId ? { ...dg, ...updatedDesig } : dg
        );
        setDesignations(list);
        saveDesignations(list);
        setEditingDesigId(null);
        setDesigName("");
        setDesigDeptId("");
        setDesigStatus("Active");
        onShowToast("Designation updated successfully!", "success");

        addAuditLog(
          currentUser.email,
          currentUser.name,
          currentUser.role,
          "DESIGNATION_EDIT",
          "DATABASE",
          `Designation updated: "${desigName}" (ID: ${editingDesigId})`
        );
      } else {
        // Create Designation
        const createdDesig: Designation = {
          Designation_ID: `DES${Date.now().toString().slice(-4)}`,
          Designation_Name: desigName.trim(),
          Department_ID: desigDeptId,
          Status: desigStatus,
          Last_Modified: new Date().toISOString()
        };

        const list = [...designations, createdDesig];
        setDesignations(list);
        saveDesignations(list);
        setDesigName("");
        setDesigDeptId("");
        setDesigStatus("Active");
        onShowToast(`Designation created successfully with ID: ${createdDesig.Designation_ID}!`, "success");

        addAuditLog(
          currentUser.email,
          currentUser.name,
          currentUser.role,
          "DESIGNATION_CREATE",
          "DATABASE",
          `Designation registered: "${createdDesig.Designation_Name}" with ID: ${createdDesig.Designation_ID}`
        );
      }
    } catch (err: any) {
      onShowToast(err.message || "Failed to save designation.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditDesig = (desig: Designation) => {
    setEditingDesigId(desig.Designation_ID);
    setDesigName(desig.Designation_Name);
    setDesigDeptId(desig.Department_ID);
    setDesigStatus(desig.Status);
  };

  const handleDeleteDesig = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this Designation?")) {
      return;
    }

    setIsSyncing(true);
    try {
      const list = designations.filter((d) => d.Designation_ID !== id);
      setDesignations(list);
      saveDesignations(list);
      onShowToast("Designation deleted successfully!", "success");

      addAuditLog(
        currentUser.email,
        currentUser.name,
        currentUser.role,
        "DESIGNATION_DELETE",
        "DATABASE",
        `Designation deleted (ID: ${id})`
      );
    } catch (err: any) {
      onShowToast(err.message || "Failed to delete designation.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8" id="departments-designations-studio-panel">
      
      {/* SECTION Header Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100">Departments & Designations Master</h3>
            {isOnline ? (
              <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20 font-medium">
                <Wifi className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-medium">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure dynamic corporate hierarchy divisions.
          </p>
        </div>

        <button
          onClick={handlePullLatest}
          disabled={isSyncing || !isOnline}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isOnline
              ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
              : "bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed"
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} /> Pull Master Data
        </button>
      </div>

      {!isOnline && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg flex items-center gap-3 text-red-200 text-xs">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>
            <strong>Internet connection required to modify master data.</strong> Changes to corporate departments or job titles are restricted during offline operations to ensure database referential integrity.
          </span>
        </div>
      )}

      {/* Grid of Divisions: Departments Left, Designations Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* 1. DEPARTMENTS PANEL */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-yellow-500" />
              <h4 className="text-sm font-bold text-slate-100">Departments Directory ({departments.length})</h4>
            </div>
          </div>

          {/* Dept Add/Edit Form */}
          <form onSubmit={handleSaveDepartment} className="bg-slate-950/40 p-4 rounded-lg border border-slate-800/60 space-y-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {editingDeptId ? "✏️ Edit Division Name" : "➕ Register New Division"}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="e.g. Indirect Taxation"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  disabled={!isOnline || isSyncing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                  required
                />
              </div>
              <div>
                <select
                  value={deptStatus}
                  onChange={(e) => setDeptStatus(e.target.value as any)}
                  disabled={!isOnline || isSyncing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingDeptId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDeptId(null);
                    setDeptName("");
                    setDeptStatus("Active");
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!isOnline || isSyncing || !deptName.trim()}
                className="flex items-center gap-1 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-xs rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" /> {editingDeptId ? "Update" : "Create"}
              </button>
            </div>
          </form>

          {/* Dept List Table */}
          <div className="overflow-x-auto max-h-72 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">Dept ID</th>
                  <th className="py-2.5 px-3">Department Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-500">
                      No departments loaded. Click "Pull Master Data" to load from Sheets.
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.Department_ID} className="border-b border-slate-800/55 hover:bg-slate-900/30 text-slate-300">
                      <td className="py-2 px-3 font-mono text-yellow-500">{dept.Department_ID}</td>
                      <td className="py-2 px-3 font-medium text-slate-100">{dept.Department_Name}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          dept.Status === "Active" ? "bg-green-500/10 text-green-400 border border-green-500/10" : "bg-slate-800 text-slate-400"
                        }`}>
                          {dept.Status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleEditDept(dept)}
                            disabled={!isOnline}
                            className="p-1.5 text-slate-400 hover:text-yellow-500 hover:bg-slate-800 rounded disabled:opacity-40"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDept(dept.Department_ID)}
                            disabled={!isOnline}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-800 rounded disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. DESIGNATIONS PANEL */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <h4 className="text-sm font-bold text-slate-100">Designations Matrix ({designations.length})</h4>
            </div>
          </div>

          {/* Desig Add/Edit Form */}
          <form onSubmit={handleSaveDesignation} className="bg-slate-950/40 p-4 rounded-lg border border-slate-800/60 space-y-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {editingDesigId ? "✏️ Edit Job Title" : "➕ Register New Job Designation"}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <input
                  type="text"
                  placeholder="e.g. Audit Senior Associate"
                  value={desigName}
                  onChange={(e) => setDesigName(e.target.value)}
                  disabled={!isOnline || isSyncing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                  required
                />
              </div>
              <div className="md:col-span-4">
                <select
                  value={desigDeptId}
                  onChange={(e) => setDesigDeptId(e.target.value)}
                  disabled={!isOnline || isSyncing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                  required
                >
                  <option value="">-- Associate Dept --</option>
                  {departments.map((d) => (
                    <option key={d.Department_ID} value={d.Department_ID}>
                      {d.Department_Name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <select
                  value={desigStatus}
                  onChange={(e) => setDesigStatus(e.target.value as any)}
                  disabled={!isOnline || isSyncing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingDesigId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDesigId(null);
                    setDesigName("");
                    setDesigDeptId("");
                    setDesigStatus("Active");
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!isOnline || isSyncing || !desigName.trim() || !desigDeptId}
                className="flex items-center gap-1 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-xs rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" /> {editingDesigId ? "Update" : "Create"}
              </button>
            </div>
          </form>

          {/* Desig List Table */}
          <div className="overflow-x-auto max-h-72 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">Designation ID</th>
                  <th className="py-2.5 px-3">Designation Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {designations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500">
                      No designations loaded. Click "Pull Master Data" to load from Sheets.
                    </td>
                  </tr>
                ) : (
                  designations.map((desig) => {
                    const dept = departments.find((d) => d.Department_ID === desig.Department_ID);
                    return (
                      <tr key={desig.Designation_ID} className="border-b border-slate-800/55 hover:bg-slate-900/30 text-slate-300">
                        <td className="py-2 px-3 font-mono text-yellow-500">{desig.Designation_ID}</td>
                        <td className="py-2 px-3 font-medium text-slate-100">{desig.Designation_Name}</td>
                        <td className="py-2 px-3 font-semibold text-slate-400">{dept ? dept.Department_Name : desig.Department_ID}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            desig.Status === "Active" ? "bg-green-500/10 text-green-400 border border-green-500/10" : "bg-slate-800 text-slate-400"
                          }`}>
                            {desig.Status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleEditDesig(desig)}
                              disabled={!isOnline}
                              className="p-1.5 text-slate-400 hover:text-yellow-500 hover:bg-slate-800 rounded disabled:opacity-40"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDesig(desig.Designation_ID)}
                              disabled={!isOnline}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-800 rounded disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
