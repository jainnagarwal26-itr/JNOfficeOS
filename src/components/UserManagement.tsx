/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, Shield, Key, CheckCircle, XCircle, AlertCircle, Edit, Trash2, Plus, Check, X,
  Search, Filter, Smartphone, Mail, Calendar, User as UserIcon, FileSpreadsheet, Lock, Unlock,
  Database, Eye, EyeOff, ShieldAlert, Power, RefreshCw, Laptop, ChevronDown, CheckSquare, Square
} from "lucide-react";
import { User, UserRole, StaffPermissions } from "../types";
import { getUsers, saveUsers, addAuditLog, getSettings, MODULES_LIST, getDefaultModulePermissions, getDepartments, getDesignations } from "../lib/db";
import { getPermissionLabel, getPermissionCategory } from "../lib/permissions";
import { hashPassword } from "../lib/hash";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./ModalFramework";

interface UserManagementProps {
  currentUser: User;
  onAddAuditLog: (action: string, category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", details: string) => void;
}

const OPERATIONS = [
  { key: "view" as const, label: "View Only" },
  { key: "create" as const, label: "Create" },
  { key: "edit" as const, label: "Edit" },
  { key: "delete" as const, label: "Delete" },
  { key: "print" as const, label: "Print" },
  { key: "export" as const, label: "Export" }
];

export default function UserManagement({ currentUser, onAddAuditLog }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(getUsers());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  
  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [joiningFilter, setJoiningFilter] = useState<string>("ALL");

  // Form states for Create/Edit User
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formDesignation, setFormDesignation] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("DEP01");
  const [formDesignationId, setFormDesignationId] = useState("DES02");
  const [formJoiningDate, setFormJoiningDate] = useState(new Date().toISOString().split("T")[0]);
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>(UserRole.STAFF);
  const [formStatus, setFormStatus] = useState<User["status"]>("ACTIVE");
  const [formError, setFormError] = useState<string | null>(null);

  // Password reset state
  const [resetPasswordInput, setResetPasswordInput] = useState("");

  // Sheets Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    localStorage.getItem("jn_officeos_users_last_sync")
  );

  const firmSettings = getSettings();

  // Load latest users from storage and Supabase DB
  const reloadUsers = async () => {
    try {
      const { supabaseService } = await import("../lib/supabaseService");
      const res = await supabaseService.getUsersFromSupabase();
      if (res.success && res.data && res.data.length > 0) {
        const mappedList: User[] = res.data.map((dbUser: any) => ({
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.full_name,
          role: dbUser.role === "OWNER" ? UserRole.OWNER : UserRole.STAFF,
          passwordHash: dbUser.password_hash || "$2a$10$SupabaseAuthManagedIdentityHash",
          permissions: {
            clientCrmView: true,
            clientCrmEdit: true,
            serviceMasterView: true,
            serviceMasterEdit: dbUser.role === "OWNER",
            invoiceView: true,
            invoiceCreate: true,
            invoiceVoid: dbUser.role === "OWNER",
            receiptView: true,
            receiptCreate: true,
            expenseView: true,
            expenseCreate: true,
            reportsView: true,
            settingsView: true,
            settingsEdit: dbUser.role === "OWNER",
            auditLogView: dbUser.role === "OWNER",
            userManagementView: dbUser.role === "OWNER",
            userManagementEdit: dbUser.role === "OWNER"
          },
          status: dbUser.is_active ? "ACTIVE" : "INACTIVE",
          createdAt: dbUser.created_at || new Date().toISOString(),
          username: (dbUser.user_number && dbUser.user_number.startsWith("STF")) ? dbUser.user_number : (dbUser.email === "jainnagarwal26@gmail.com" ? "STF000001" : dbUser.email === "amit@jainnagarwal.in" ? "STF000002" : dbUser.user_number || "STF000001"),
          mobile: dbUser.phone || "",
          designation: dbUser.designation || "Staff Member"
        }));
        setUsers(mappedList);
        saveUsers(mappedList);
        if (selectedUser) {
          const updatedSelected = mappedList.find((u) => u.id === selectedUser.id);
          if (updatedSelected) setSelectedUser(updatedSelected);
        }
        return;
      }
    } catch (e) {
      console.warn("[UserManagement] Failed loading live users from Supabase:", e);
    }
    const list = getUsers();
    setUsers(list);
    if (selectedUser) {
      const updatedSelected = list.find((u) => u.id === selectedUser.id);
      if (updatedSelected) setSelectedUser(updatedSelected);
    }
  };

  useEffect(() => {
    reloadUsers();
    const handleDatabaseSynced = () => {
      console.log("[UserManagement] Live database sync event detected! Refreshing users and departments...");
      reloadUsers();
    };
    window.addEventListener("sheets-database-synced", handleDatabaseSynced);
    return () => window.removeEventListener("sheets-database-synced", handleDatabaseSynced);
  }, []);

  // Filter logic
  const filteredUsers = users.filter((u) => {
    const nameStr = u.name || "";
    const emailStr = u.email || "";
    const usernameStr = u.username || "";
    const designationStr = u.designation || "";
    const mobileStr = u.mobile || "";

    const matchesSearch = 
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emailStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usernameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      designationStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mobileStr.includes(searchTerm);

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;

    let matchesJoining = true;
    if (joiningFilter !== "ALL") {
      const joinDate = new Date(u.joiningDate).getTime();
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

      if (joiningFilter === "RECENT_30") {
        matchesJoining = joinDate >= thirtyDaysAgo;
      } else if (joiningFilter === "RECENT_YEAR") {
        matchesJoining = joinDate >= oneYearAgo;
      } else if (joiningFilter === "OLDER") {
        matchesJoining = joinDate < oneYearAgo;
      }
    }

    return matchesSearch && matchesRole && matchesStatus && matchesJoining;
  });

  // Toggle Single Matrix Cell
  const handleToggleMatrixPermission = (
    userId: string,
    moduleName: string,
    actionKey: "view" | "create" | "edit" | "delete" | "print" | "export"
  ) => {
    const userToEdit = users.find(u => u.id === userId);
    if (!userToEdit) return;

    if (userToEdit.role === UserRole.OWNER) {
      alert("Owner permissions are globally absolute and cannot be customized.");
      return;
    }

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const currentModules = u.modulePermissions || getDefaultModulePermissions(false);
        const modulePerm = currentModules[moduleName] || {
          view: false, create: false, edit: false, delete: false, print: false, export: false
        };

        const updatedModules = {
          ...currentModules,
          [moduleName]: {
            ...modulePerm,
            [actionKey]: !modulePerm[actionKey]
          }
        };

        // If toggling write action, automatically ensure view action is checked
        if (actionKey !== "view" && !modulePerm[actionKey]) {
          updatedModules[moduleName].view = true;
        }

        onAddAuditLog(
          "PERMISSION_MODIFIED",
          "SECURITY",
          `Modular permission '${actionKey}' for ${moduleName} toggled on user '${u.username}'.`
        );

        return {
          ...u,
          modulePermissions: updatedModules
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setSelectedUser(updatedUsers.find(u => u.id === userId) || null);
  };

  // Bulk toggle for a specific module row
  const handleBulkToggleRow = (userId: string, moduleName: string) => {
    const userToEdit = users.find(u => u.id === userId);
    if (!userToEdit) return;
    if (userToEdit.role === UserRole.OWNER) return;

    const currentModules = userToEdit.modulePermissions || getDefaultModulePermissions(false);
    const modulePerm = currentModules[moduleName] || {
      view: false, create: false, edit: false, delete: false, print: false, export: false
    };

    // Determine next state (if any is false, set all to true; otherwise set all to false)
    const hasAnyFalse = Object.values(modulePerm).some(val => !val);
    const targetState = hasAnyFalse;

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          modulePermissions: {
            ...currentModules,
            [moduleName]: {
              view: targetState,
              create: targetState,
              edit: targetState,
              delete: targetState,
              print: targetState,
              export: targetState
            }
          }
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setSelectedUser(updatedUsers.find(u => u.id === userId) || null);

    onAddAuditLog(
      "PERMISSION_MODIFIED",
      "SECURITY",
      `Bulk modified row permissions for module '${moduleName}' to ${targetState ? "ENABLED" : "DISABLED"} on user '${userToEdit.username}'.`
    );
  };

  // Toggle Standard App Route Permissions
  const handleToggleRoutePermission = (userId: string, permissionKey: keyof StaffPermissions) => {
    const userToEdit = users.find(u => u.id === userId);
    if (!userToEdit) return;

    if (userToEdit.role === UserRole.OWNER) {
      alert("Owner administrative rights are global and unrestrictable.");
      return;
    }

    const label = getPermissionLabel(permissionKey);
    const confirm = window.confirm(`Update System Route Privilege:\nAre you sure you want to toggle "${label}" for user "${userToEdit.name}"?`);
    if (!confirm) return;

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const updatedPerms = {
          ...u.permissions,
          [permissionKey]: !u.permissions[permissionKey]
        };

        onAddAuditLog(
          "PERMISSION_MODIFIED",
          "SECURITY",
          `System permission '${permissionKey}' for ${u.email} set to ${updatedPerms[permissionKey]}.`
        );

        return {
          ...u,
          permissions: updatedPerms
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setSelectedUser(updatedUsers.find(u => u.id === userId) || null);
  };

  // Toggle active/inactive status globally in Supabase DB
  const handleToggleUserStatus = async (userId: string, nextStatus: User["status"]) => {
    const userToEdit = users.find(u => u.id === userId);
    if (!userToEdit) return;

    if (userToEdit.id === currentUser.id) {
      alert("Self-lockout prevention active. You cannot disable your own profile.");
      return;
    }

    const confirm = window.confirm(`Confirm Security Action:\nSet status of user "${userToEdit.name}" (${userToEdit.email}) to ${nextStatus}?`);
    if (!confirm) return;

    const isActive = nextStatus === "ACTIVE";
    try {
      const { supabaseService } = await import("../lib/supabaseService");
      const res = await supabaseService.toggleUserActiveStatus(userToEdit.email, isActive, currentUser.email);
      if (!res.success && res.error) {
        alert(`Failed to update status in Supabase DB: ${res.error}`);
      }
    } catch (e: any) {
      console.error("[UserManagement] Status toggle exception:", e);
    }

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        onAddAuditLog(
          isActive ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED",
          "SECURITY",
          `Account status of ${u.email} changed to ${nextStatus}.`
        );
        return { ...u, status: nextStatus };
      }
      return u;
    });

    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setSelectedUser(updatedUsers.find(u => u.id === userId) || null);
    await reloadUsers();
  };

  // Delete User Action
  const handleDeleteUser = (userId: string) => {
    const userToEdit = users.find(u => u.id === userId);
    if (!userToEdit) return;

    if (userToEdit.id === currentUser.id) {
      alert("Terminal action rejected: You cannot delete your currently active administrative session.");
      return;
    }

    const confirm = window.confirm(
      `CRITICAL DELETION REQUEST:\nAre you sure you want to permanently delete user "${userToEdit.name}" (${userToEdit.email})?\nThis action is irreversible and clears all active session tokens.`
    );
    if (!confirm) return;

    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setSelectedUser(null);

    onAddAuditLog(
      "USER_DELETED",
      "SECURITY",
      `Practice profile for ${userToEdit.name} (${userToEdit.email}) permanently deleted.`
    );

    alert("User profile deleted successfully.");
  };

  // Create User Submission
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const emailTrim = formEmail.toLowerCase().trim();
    const usernameTrim = formUsername.toLowerCase().replace(/\s+/g, "").trim();

    if (!formName || !emailTrim || !usernameTrim || !formPassword || !formMobile || !formDesignation) {
      setFormError("Please fill out all user credentials and parameters.");
      return;
    }

    // Uniqueness Constraints
    if (users.some((u) => u.email.toLowerCase() === emailTrim)) {
      setFormError("A profile with this email already exists.");
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === usernameTrim)) {
      setFormError("This Username is already allocated. Username must remain unique.");
      return;
    }

    try {
      const passwordHash = await hashPassword(formPassword);
      const defaultPerms: StaffPermissions = {
        clientCrmView: true,
        clientCrmEdit: false,
        serviceMasterView: true,
        serviceMasterEdit: false,
        invoiceView: true,
        invoiceCreate: false,
        invoiceVoid: false,
        receiptView: true,
        receiptCreate: false,
        expenseView: false,
        expenseCreate: false,
        reportsView: false,
        settingsView: false,
        settingsEdit: false,
        auditLogView: false,
        userManagementView: false,
        userManagementEdit: false
      };

      const defaultModules = getDefaultModulePermissions(formRole === UserRole.OWNER);

      const { supabaseService } = await import("../lib/supabaseService");
      const nextStaffNumber = await supabaseService.getNextStaffNumber();

      const newUser: User = {
        id: `usr_${Date.now()}`,
        email: emailTrim,
        username: nextStaffNumber, // Backend-generated STF00000X
        name: formName.trim(),
        mobile: formMobile.trim(),
        designation: formDesignation.trim(),
        department: (() => {
          const d = getDepartments().find((x) => x.Department_ID === formDepartmentId);
          return d ? d.Department_Name : "Taxation";
        })(),
        departmentId: formDepartmentId,
        designationId: formDesignationId,
        joiningDate: formJoiningDate,
        role: formRole,
        passwordHash,
        status: formStatus,
        createdAt: new Date().toISOString(),
        permissions: formRole === UserRole.OWNER ? {
          ...defaultPerms,
          settingsView: true,
          settingsEdit: true,
          userManagementView: true,
          userManagementEdit: true,
          clientCrmEdit: true,
          serviceMasterEdit: true,
          invoiceCreate: true,
          invoiceVoid: true,
          receiptCreate: true,
          expenseCreate: true,
          reportsView: true,
          auditLogView: true
        } : defaultPerms,
        modulePermissions: defaultModules,
        lastLogin: {
          timestamp: new Date().toISOString(),
          ip: "127.0.0.1",
          browser: "System Creator"
        },
        lastActivity: new Date().toISOString()
      };

      await supabaseService.upsertUser({
        username: nextStaffNumber,
        userNumber: nextStaffNumber,
        email: emailTrim,
        passwordHash,
        name: formName.trim(),
        fullName: formName.trim(),
        role: formRole,
        mobile: formMobile.trim(),
        department: newUser.department,
        designation: formDesignation.trim(),
        status: formStatus
      });

      const updated = [...users, newUser];
      setUsers(updated);
      saveUsers(updated);

      onAddAuditLog(
        "USER_CREATED",
        "SECURITY",
        `Created profile ${newUser.name} (Staff ID: ${nextStaffNumber}, Role: ${newUser.role}).`
      );

      // Reset
      setFormName("");
      setFormEmail("");
      setFormUsername("");
      setFormMobile("");
      setFormDesignation("");
      setFormPassword("");
      setFormRole(UserRole.STAFF);
      setFormStatus("ACTIVE");
      setShowAddModal(false);
      setSelectedUser(newUser);

      alert("Enterprise Staff Profile successfully generated.");
    } catch (err) {
      console.error(err);
      setFormError("Salted crypto-hash calculations failed.");
    }
  };

  // Open Edit Modal with selected user details
  const openEditUserModal = (u: User) => {
    setFormName(u.name);
    setFormEmail(u.email);
    setFormUsername(u.username);
    setFormMobile(u.mobile);
    setFormDesignation(u.designation);
    setFormDepartmentId((u as any).departmentId || "DEP01");
    setFormDesignationId((u as any).designationId || "DES02");
    setFormJoiningDate(u.joiningDate);
    setFormRole(u.role);
    setFormStatus(u.status);
    setFormError(null);
    setShowEditModal(true);
  };

  // Submit Edit User
  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedUser) return;

    const emailTrim = formEmail.toLowerCase().trim();
    const usernameTrim = formUsername.toLowerCase().replace(/\s+/g, "").trim();

    if (!formName || !emailTrim || !usernameTrim || !formMobile || !formDesignation) {
      setFormError("All profile credentials are required.");
      return;
    }

    // Check uniqueness constraint
    if (users.some((u) => u.id !== selectedUser.id && u.email.toLowerCase() === emailTrim)) {
      setFormError("This corporate email is already allocated to another profile.");
      return;
    }

    if (users.some((u) => u.id !== selectedUser.id && u.username.toLowerCase() === usernameTrim)) {
      setFormError("This Username is already allocated. Username must remain unique.");
      return;
    }

    const updatedUsers = users.map((u) => {
      if (u.id === selectedUser.id) {
        const updated = {
          ...u,
          name: formName.trim(),
          email: emailTrim,
          username: usernameTrim,
          mobile: formMobile.trim(),
          designation: formDesignation.trim(),
          department: (() => {
            const d = getDepartments().find((x) => x.Department_ID === formDepartmentId);
            return d ? d.Department_Name : "Taxation";
          })(),
          departmentId: formDepartmentId,
          designationId: formDesignationId,
          joiningDate: formJoiningDate,
          role: formRole,
          status: formStatus
        };
        return updated;
      }
      return u;
    });

    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setSelectedUser(updatedUsers.find(x => x.id === selectedUser.id) || null);
    setShowEditModal(false);

    onAddAuditLog(
      "USER_MODIFIED",
      "SECURITY",
      `Administrative updates committed for user '${usernameTrim}' (${formName}).`
    );

    alert("Staff Profile updated successfully.");
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetPasswordInput) return;

    try {
      const passwordHash = await hashPassword(resetPasswordInput);
      const updated = users.map((u) => {
        if (u.id === selectedUser.id) {
          return {
            ...u,
            passwordHash
          };
        }
        return u;
      });

      setUsers(updated);
      saveUsers(updated);
      setSelectedUser(updated.find(x => x.id === selectedUser.id) || null);
      setResetPasswordInput("");
      setShowPasswordResetModal(false);

      onAddAuditLog(
        "PASSWORD_RESET",
        "SECURITY",
        `Master password forcefully reset for user '${selectedUser.username}'.`
      );

      alert("Credentials forcefully overwritten. Old tokens are now void.");
    } catch (err) {
      console.error(err);
      alert("Crypto Overwrite Error.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Statistics Ribbon Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#0D2C6C] to-[#081C44] rounded-2xl p-5 border border-slate-800 text-white shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider">Total Active Users</p>
              <h3 className="text-2xl font-bold font-sans mt-1">{users.length}</h3>
            </div>
            <Users className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <p className="text-[10px] text-white/50 font-mono mt-2">JN Practice Directory Core</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Designated Owners</p>
              <h3 className="text-2xl font-bold font-sans mt-1 text-[#0D2C6C]">
                {users.filter(u => u.role === UserRole.OWNER).length}
              </h3>
            </div>
            <Shield className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Absolute Access
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Enterprise Operators</p>
              <h3 className="text-2xl font-bold font-sans mt-1 text-[#0D2C6C]">
                {users.filter(u => u.role !== UserRole.OWNER).length}
              </h3>
            </div>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-[10px] text-blue-500 font-semibold mt-2">
            Configurable Access & Role Engines
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Database Engine</p>
              <h3 className="text-sm font-bold font-sans mt-2 text-emerald-700 truncate">
                CONNECTED
              </h3>
            </div>
            <Database className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-[9px] text-slate-400 truncate mt-2 font-mono">
            Supabase PostgreSQL RDBMS
          </p>
        </div>
      </div>

      {/* Main Staff Directory Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-6 border-b border-slate-100 space-y-4 bg-slate-50/40">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h2 className="font-display font-bold text-[#0D2C6C] text-lg tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D4AF37]" />
                Practice Operators Directory
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Administer secure roles, reset operator tokens, audit last activities, and toggle live workspace permissions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setUsers(getUsers())}
                className="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reload Users directory from database"
              >
                <RefreshCw className="w-4 h-4 text-[#0D2C6C]" />
                Refresh
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[#0D2C6C] hover:bg-[#071D4A] text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-900/10"
              >
                <Plus className="w-4 h-4" />
                Create Staff Profile
              </button>
            </div>
          </div>

          {/* Search & Granular Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            {/* Search Input */}
            <div className="relative sm:col-span-5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Name, Username, Designation, Mobile..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0D2C6C] focus:ring-1 focus:ring-[#0D2C6C] bg-white transition-all"
              />
            </div>

            {/* Role Filter */}
            <div className="sm:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-9 pr-2 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-[#0D2C6C] bg-white appearance-none"
              >
                <option value="ALL">All Roles</option>
                <option value="OWNER">Owner</option>
                <option value="ADMINISTRATOR">Administrator</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
                <option value="AUDITOR">Auditor</option>
                <option value="READ_ONLY">Read Only</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Power className="w-3.5 h-3.5" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-2 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-[#0D2C6C] bg-white appearance-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="LOCKED">Locked</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>

            {/* Joining Date Filter */}
            <div className="sm:col-span-3 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <select
                value={joiningFilter}
                onChange={(e) => setJoiningFilter(e.target.value)}
                className="w-full pl-9 pr-2 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-[#0D2C6C] bg-white appearance-none"
              >
                <option value="ALL">All Joining Dates</option>
                <option value="RECENT_30">Joined Past 30 Days</option>
                <option value="RECENT_YEAR">Joined Past Year</option>
                <option value="OLDER">Joined Over 1 Year Ago</option>
              </select>
            </div>
          </div>

          {/* Sync Status Feedback */}
          {syncMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{syncMessage}</span>
            </div>
          )}
        </div>

        {/* Premium Corporate Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0D2C6C]/5 text-[#0D2C6C] text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Contact Detail</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Authentication</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                    <p className="font-semibold text-slate-500">No Operator Records Found</p>
                    <p className="text-[11px] text-slate-400">No staff members match the specified filters or search parameters.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr 
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`hover:bg-[#0D2C6C]/5 cursor-pointer transition-colors ${
                      selectedUser?.id === u.id ? "bg-amber-50/40 font-medium" : ""
                    }`}
                  >
                    {/* Staff ID */}
                    <td className="py-4.5 px-4 font-mono text-[10px] text-slate-500">{u.id}</td>
                    
                    {/* Name */}
                    <td className="py-4.5 px-4 font-semibold text-[#0D2C6C]">{u.name}</td>
                    
                    {/* Username */}
                    <td className="py-4.5 px-4 font-mono text-[11px] text-[#D4AF37] font-semibold">@{u.username}</td>
                    
                    {/* Contact Detail */}
                    <td className="py-4.5 px-4 space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-600 text-[11px]">
                        <Smartphone className="w-3 h-3 text-slate-400" />
                        <span>{u.mobile}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] truncate max-w-[160px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="py-4.5 px-4">
                      <div className="font-semibold text-slate-800 text-xs">{u.designation}</div>
                      {(u as any).department && (
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{(u as any).department}</div>
                      )}
                    </td>

                    {/* Joining Date */}
                    <td className="py-4.5 px-4 font-mono text-slate-500">{u.joiningDate}</td>

                    {/* Role */}
                    <td className="py-4.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        u.role === UserRole.OWNER 
                          ? "bg-amber-100 text-amber-800 border border-amber-200" 
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}>
                        {u.role === UserRole.OWNER ? "SuperAdmin" : u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                        u.status === "ACTIVE" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : u.status === "INACTIVE"
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : u.status === "LOCKED"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-red-50 text-red-700 border border-red-100"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          u.status === "ACTIVE" 
                            ? "bg-emerald-500" 
                            : u.status === "INACTIVE" 
                            ? "bg-slate-400" 
                            : u.status === "LOCKED"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}></span>
                        {u.status}
                      </span>
                    </td>

                    {/* Last Login details */}
                    <td className="py-4.5 px-4 space-y-0.5">
                      {u.lastLogin && typeof u.lastLogin === "object" ? (
                        <>
                          <p className="text-[11px] font-mono font-medium text-slate-700">
                            {u.lastLogin.timestamp ? new Date(u.lastLogin.timestamp).toLocaleString() : "Never authenticated"}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span className="bg-slate-100 px-1 rounded">{u.lastLogin.ip || "N/A"}</span>
                            <span className="truncate max-w-[80px]">{u.lastLogin.browser || "N/A"}</span>
                          </div>
                        </>
                      ) : u.lastLogin && typeof u.lastLogin === "string" ? (
                        <>
                          <p className="text-[11px] font-mono font-medium text-slate-700">
                            {new Date(u.lastLogin).toLocaleString()}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span className="bg-slate-100 px-1 rounded">N/A</span>
                            <span className="truncate max-w-[80px]">N/A</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Never authenticated</span>
                      )}
                    </td>

                    {/* Row Buttons */}
                    <td className="py-4.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditUserModal(u)}
                          className="p-1.5 border border-slate-200 hover:border-[#0D2C6C] hover:bg-slate-50 text-slate-500 hover:text-[#0D2C6C] rounded-lg transition-all cursor-pointer"
                          title="Edit Profile parameters"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(u); setShowPasswordResetModal(true); }}
                          className="p-1.5 border border-slate-200 hover:border-[#D4AF37] hover:bg-slate-50 text-slate-500 hover:text-[#D4AF37] rounded-lg transition-all cursor-pointer"
                          title="Force Reset Password Hash"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        
                        {u.status === "ACTIVE" ? (
                          <button
                            onClick={() => handleToggleUserStatus(u.id, "INACTIVE")}
                            disabled={u.id === currentUser.id}
                            className="p-1.5 border border-red-200 hover:bg-red-50 text-red-600 hover:border-red-500 rounded-lg transition-all disabled:opacity-40 cursor-pointer"
                            title="Deactivate / Disable Operator Account"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleUserStatus(u.id, "ACTIVE")}
                            className="p-1.5 border border-emerald-200 hover:bg-emerald-50 text-emerald-600 hover:border-emerald-500 rounded-lg transition-all cursor-pointer"
                            title="Activate / Enable Operator Account"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={u.id === currentUser.id}
                          className="p-1.5 border border-slate-200 hover:border-red-600 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all disabled:opacity-40 cursor-pointer"
                          title="Permanently Expunge Account"
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

      {/* Selected Operator Permission Configuration Deck */}
      {selectedUser && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6"
        >
          {/* Deck Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#0D2C6C]/5 rounded-2xl border border-[#0D2C6C]/10 text-[#0D2C6C]">
                <Shield className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-800 text-sm">
                  Active Access Control Deck: <span className="text-[#0D2C6C]">@{selectedUser.username}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Granularly toggling permissions below modifies {selectedUser.name}'s active workstation environment instantly.
                </p>
              </div>
            </div>

            {selectedUser.id === currentUser.id && (
              <div className="p-2 bg-amber-50 text-amber-800 rounded-xl text-[10px] font-semibold border border-amber-200 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Modifying your own workspace active permission profile.</span>
              </div>
            )}
          </div>

          {selectedUser.role === UserRole.OWNER ? (
            <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-start gap-3 text-xs text-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900">Universal Administrative Bypass Access</p>
                <p className="leading-relaxed">
                  This user account is designated with the <strong className="font-bold">OWNER</strong> role. 
                  Owners maintain absolute system privileges, overriding every conditional access restriction block, report ledger lock, or system setting flag globally.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Part 1: Granular 16-Module Operations Permission Matrix */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#0D2C6C]" />
                    Modular Practice Access Matrix (16 Practice Spheres)
                  </h4>
                  <span className="text-[10px] text-slate-400 italic">Click row headers to toggle complete module rows</span>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-2.5 px-4 font-medium">Practice Module</th>
                        {OPERATIONS.map((op) => (
                          <th key={op.key} className="py-2.5 px-3 text-center font-medium">{op.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {MODULES_LIST.map((modName) => {
                        const userPerms = selectedUser.modulePermissions || getDefaultModulePermissions(false);
                        const modulePerm = userPerms[modName] || {
                          view: false, create: false, edit: false, delete: false, print: false, export: false
                        };

                        return (
                          <tr key={modName} className="hover:bg-slate-50/50">
                            {/* Row Header with toggle row */}
                            <td className="py-2.5 px-4 font-medium text-slate-700">
                              <button
                                type="button"
                                onClick={() => handleBulkToggleRow(selectedUser.id, modName)}
                                className="hover:text-[#0D2C6C] font-semibold text-left flex items-center gap-2 cursor-pointer transition-colors"
                                title="Click to toggle entire module"
                              >
                                {Object.values(modulePerm).every(v => v) ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-[#0D2C6C]" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                {modName}
                              </button>
                            </td>

                            {/* Operations cells */}
                            {OPERATIONS.map((op) => {
                              const checked = modulePerm[op.key];
                              return (
                                <td key={op.key} className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMatrixPermission(selectedUser.id, modName, op.key)}
                                    className={`inline-flex items-center justify-center p-1 rounded-md border cursor-pointer transition-all ${
                                      checked
                                        ? "bg-[#0D2C6C]/10 border-[#0D2C6C] text-[#0D2C6C]"
                                        : "bg-white border-slate-200 text-slate-300 hover:border-slate-400"
                                    }`}
                                    title={`Toggle ${op.label} for ${modName}`}
                                  >
                                    <Check className={`w-3.5 h-3.5 ${checked ? "opacity-100" : "opacity-0"}`} />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Part 2: Core Platform Navigation Route Access (Router Flags) */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-[#0D2C6C]" />
                  Active Web Console Route Keys (Interface Bindings)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.keys(selectedUser.permissions || {}) as (keyof StaffPermissions)[]).map((key) => {
                    const active = selectedUser.permissions?.[key] || false;
                    const cat = getPermissionCategory(key);

                    return (
                      <div 
                        key={key}
                        className={`p-3 border rounded-xl flex items-center justify-between transition-all ${
                          active 
                            ? "bg-[#0D2C6C]/5 border-[#0D2C6C]/20" 
                            : "bg-slate-50 border-slate-100 text-slate-400"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className={`block text-xs font-semibold ${active ? "text-slate-800" : "text-slate-400"}`}>
                            {getPermissionLabel(key)}
                          </span>
                          <span className="text-[8px] font-mono font-bold tracking-wider uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                            {cat} : {key}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleRoutePermission(selectedUser.id, key)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative shrink-0 ${
                            active ? "bg-[#0D2C6C]" : "bg-slate-200"
                          }`}
                        >
                          <span className={`block w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${
                            active ? "translate-x-4" : "translate-x-0"
                          }`}></span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </motion.div>
      )}

      {/* CREATE OPERATOR MODAL USING REUSABLE MODAL FRAMEWORK */}
      <Modal 
        id="user-management-add-modal"
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); setFormError(null); }}
        maxWidthClassName="max-w-lg"
      >
        <form onSubmit={handleCreateUser} className="flex flex-col h-full overflow-hidden text-left">
          <ModalHeader onClose={() => { setShowAddModal(false); setFormError(null); }}>
            <h3 className="font-display font-bold text-[#0D2C6C] text-base tracking-tight">
              Generate Practice Access Profile
            </h3>
          </ModalHeader>

          <ModalBody className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-xs text-red-700 rounded-xl flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Display Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. CA. Rajesh Gupta"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    />
                  </div>

                  {/* Corporate Email */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Corporate Email Address
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="rajesh@jainagarwal.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex justify-between">
                      <span>Unique Username</span>
                      <span className="text-[9px] text-[#D4AF37] lowercase">@username</span>
                    </label>
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="e.g. rajeshgupta"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] font-mono"
                      required
                    />
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Active Contact Mobile
                    </label>
                    <input
                      type="text"
                      value={formMobile}
                      onChange={(e) => setFormMobile(e.target.value)}
                      placeholder="+91 9988776655"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    />
                  </div>

                  {/* Department select */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Department / Division
                    </label>
                    <select
                      value={formDepartmentId}
                      onChange={(e) => {
                        const newDeptId = e.target.value;
                        setFormDepartmentId(newDeptId);
                        const activeDesgs = getDesignations().filter(d => d.Status === "Active");
                        const related = activeDesgs.filter(d => d.Department_ID === newDeptId);
                        if (related.length > 0) {
                          setFormDesignationId(related[0].Designation_ID);
                          setFormDesignation(related[0].Designation_Name);
                        } else if (activeDesgs.length > 0) {
                          setFormDesignationId(activeDesgs[0].Designation_ID);
                          setFormDesignation(activeDesgs[0].Designation_Name);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    >
                      {getDepartments().filter(d => d.Status === "Active").map(d => (
                        <option key={d.Department_ID} value={d.Department_ID}>
                          {d.Department_Name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Designation select */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Official Designation
                    </label>
                    <select
                      value={formDesignationId}
                      onChange={(e) => {
                        const newDesgId = e.target.value;
                        setFormDesignationId(newDesgId);
                        const d = getDesignations().find(dg => dg.Designation_ID === newDesgId);
                        if (d) setFormDesignation(d.Designation_Name);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    >
                      <option value="">-- Select Designation --</option>
                      {getDesignations().filter(dg => dg.Department_ID === formDepartmentId && dg.Status === "Active").length > 0 && (
                        <optgroup label="Department Designations">
                          {getDesignations()
                            .filter(dg => dg.Department_ID === formDepartmentId && dg.Status === "Active")
                            .map(dg => (
                              <option key={dg.Designation_ID} value={dg.Designation_ID}>
                                {dg.Designation_Name}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      <optgroup label="All Active Practice Designations">
                        {getDesignations()
                          .filter(dg => dg.Status === "Active" && dg.Department_ID !== formDepartmentId)
                          .map(dg => (
                            <option key={dg.Designation_ID} value={dg.Designation_ID}>
                              {dg.Designation_Name}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={formJoiningDate}
                      onChange={(e) => setFormJoiningDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  {/* Temporary Password */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Temporary Access Password
                    </label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Primary Account Role */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Account Role Profile
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none bg-white"
                    >
                      <option value={UserRole.STAFF}>STAFF (Configurable Sandbox)</option>
                      <option value={UserRole.OWNER}>SuperAdmin (Universal Access Bypass)</option>
                      <option value={UserRole.ADMINISTRATOR}>ADMINISTRATOR (Universal Access Bypass)</option>
                      <option value={UserRole.MANAGER}>MANAGER (Highly Privileged Management)</option>
                      <option value={UserRole.AUDITOR}>AUDITOR (Strict View-Only Audit Access)</option>
                      <option value={UserRole.READ_ONLY}>READ_ONLY (View-Only Workspace)</option>
                    </select>
                  </div>
                </div>

          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => { setShowAddModal(false); setFormError(null); }}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#0D2C6C] hover:bg-[#071D4A] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-900/10"
            >
              Establish Account Profile
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* EDIT OPERATOR MODAL USING REUSABLE MODAL FRAMEWORK */}
      <Modal 
        id="user-management-edit-modal"
        isOpen={showEditModal && !!selectedUser} 
        onClose={() => { setShowEditModal(false); setFormError(null); }}
        maxWidthClassName="max-w-lg"
      >
        <form onSubmit={handleEditUser} className="flex flex-col h-full overflow-hidden text-left">
          <ModalHeader onClose={() => { setShowEditModal(false); setFormError(null); }}>
            <h3 className="font-display font-bold text-[#0D2C6C] text-base tracking-tight">
              Modify Practice Account parameters: <span className="text-[#D4AF37]">@{selectedUser?.username}</span>
            </h3>
          </ModalHeader>

          <ModalBody className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-xs text-red-700 rounded-xl flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Display Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Rajesh Gupta"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    />
                  </div>

                  {/* Corporate Email */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Corporate Email Address
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex justify-between">
                      <span>Unique Username</span>
                      <span className="text-[9px] text-[#D4AF37] lowercase">@username</span>
                    </label>
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] font-mono"
                      required
                    />
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Active Contact Mobile
                    </label>
                    <input
                      type="text"
                      value={formMobile}
                      onChange={(e) => setFormMobile(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    />
                  </div>

                  {/* Department select */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Department / Division
                    </label>
                    <select
                      value={formDepartmentId}
                      onChange={(e) => {
                        const newDeptId = e.target.value;
                        setFormDepartmentId(newDeptId);
                        const activeDesgs = getDesignations().filter(d => d.Status === "Active");
                        const related = activeDesgs.filter(d => d.Department_ID === newDeptId);
                        if (related.length > 0) {
                          setFormDesignationId(related[0].Designation_ID);
                          setFormDesignation(related[0].Designation_Name);
                        } else if (activeDesgs.length > 0) {
                          setFormDesignationId(activeDesgs[0].Designation_ID);
                          setFormDesignation(activeDesgs[0].Designation_Name);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    >
                      {getDepartments().filter(d => d.Status === "Active").map(d => (
                        <option key={d.Department_ID} value={d.Department_ID}>
                          {d.Department_Name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Designation select */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Official Designation
                    </label>
                    <select
                      value={formDesignationId}
                      onChange={(e) => {
                        const newDesgId = e.target.value;
                        setFormDesignationId(newDesgId);
                        const d = getDesignations().find(dg => dg.Designation_ID === newDesgId);
                        if (d) setFormDesignation(d.Designation_Name);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    >
                      <option value="">-- Select Designation --</option>
                      {getDesignations().filter(dg => dg.Department_ID === formDepartmentId && dg.Status === "Active").length > 0 && (
                        <optgroup label="Department Designations">
                          {getDesignations()
                            .filter(dg => dg.Department_ID === formDepartmentId && dg.Status === "Active")
                            .map(dg => (
                              <option key={dg.Designation_ID} value={dg.Designation_ID}>
                                {dg.Designation_Name}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      <optgroup label="All Active Practice Designations">
                        {getDesignations()
                          .filter(dg => dg.Status === "Active" && dg.Department_ID !== formDepartmentId)
                          .map(dg => (
                            <option key={dg.Designation_ID} value={dg.Designation_ID}>
                              {dg.Designation_Name}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={formJoiningDate}
                      onChange={(e) => setFormJoiningDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  {/* Primary Account Role */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Account Role Profile
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none bg-white"
                      disabled={selectedUser?.id === currentUser.id} // prevent self-demoting
                    >
                      <option value={UserRole.STAFF}>STAFF (Configurable Access)</option>
                      <option value={UserRole.OWNER}>SuperAdmin (Universal Access Bypass)</option>
                      <option value={UserRole.ADMINISTRATOR}>ADMINISTRATOR (Universal Access Bypass)</option>
                      <option value={UserRole.MANAGER}>MANAGER (Highly Privileged Management)</option>
                      <option value={UserRole.AUDITOR}>AUDITOR (Strict View-Only Audit Access)</option>
                      <option value={UserRole.READ_ONLY}>READ_ONLY (View-Only Workspace)</option>
                    </select>
                  </div>

                  {/* Account Status */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Account Security Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as User["status"])}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none bg-white"
                      disabled={selectedUser?.id === currentUser.id} // prevent self-locking
                    >
                      <option value="ACTIVE">ACTIVE (Authorized to log in)</option>
                      <option value="INACTIVE">INACTIVE (Deactivated completely)</option>
                      <option value="LOCKED">LOCKED (Temporarily account locked)</option>
                      <option value="DISABLED">DISABLED (Access prohibited completely)</option>
                    </select>
                  </div>
                </div>

          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => { setShowEditModal(false); setFormError(null); }}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#0D2C6C] hover:bg-[#071D4A] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-900/10"
            >
              Commit Profiles Changes
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* FORCE OVERWRITE PASSWORD MODAL USING REUSABLE MODAL FRAMEWORK */}
      <Modal 
        id="user-management-reset-password-modal"
        isOpen={showPasswordResetModal && !!selectedUser} 
        onClose={() => { setShowPasswordResetModal(false); setResetPasswordInput(""); }}
        maxWidthClassName="max-w-sm"
      >
        <form onSubmit={handleResetPassword} className="flex flex-col h-full overflow-hidden text-left">
          <ModalHeader onClose={() => { setShowPasswordResetModal(false); setResetPasswordInput(""); }}>
            <h3 className="font-display font-bold text-[#0D2C6C] text-sm tracking-tight flex items-center gap-1.5">
              <Key className="w-4.5 h-4.5 text-[#D4AF37]" />
              Force Reset Credentials
            </h3>
          </ModalHeader>

          <ModalBody className="space-y-4">
            <p className="text-xs text-slate-500 leading-normal">
              You are performing a master cryptographic override of credentials for user <strong className="font-semibold text-slate-700">{selectedUser?.name}</strong> (@{selectedUser?.username}). 
              Old login tokens are forcefully revoked.
            </p>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Salted Password Value
              </label>
              <input
                type="password"
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                required
              />
            </div>
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => { setShowPasswordResetModal(false); setResetPasswordInput(""); }}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#0D2C6C] hover:bg-[#071D4A] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer shadow-md shadow-blue-900/10"
            >
              Update Hash & Void Old Tokens
            </button>
          </ModalFooter>
        </form>
      </Modal>

    </div>
  );
}
