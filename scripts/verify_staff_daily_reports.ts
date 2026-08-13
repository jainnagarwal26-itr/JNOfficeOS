import { StaffDailyReportRepository } from "../src/lib/staffDailyReportRepository";
import { User } from "../src/types";

const shrutiUser: User = {
  id: "ce9ce252-fce5-4d4b-be2b-bf96349027a6",
  user_number: "STF000003",
  email: "shruti@jainnagarwal.in",
  username: "shruti",
  name: "Shruti Gupta",
  fullName: "Shruti Gupta",
  role: "STAFF",
  permissions: {
    dashboardView: true,
    clientsView: true,
    clientsEdit: false,
    servicesView: true,
    servicesEdit: false,
    tasksView: true,
    tasksEdit: true,
    documentsView: true,
    documentsEdit: true,
    billingView: true,
    billingEdit: false,
    reportsView: true,
    reportsEdit: false,
    settingsView: true,
    settingsEdit: false,
    auditLogView: false,
    userManagementView: false,
    userManagementEdit: false
  },
  status: "ACTIVE"
};

const anjuUser: User = {
  id: "40f4a361-359b-473e-9f5e-98545068e16c",
  user_number: "STF000004",
  email: "anju@jainnagarwal.in",
  username: "anju",
  name: "Anju Mishra",
  fullName: "Anju Mishra",
  role: "STAFF",
  permissions: {
    dashboardView: true,
    clientsView: true,
    clientsEdit: false,
    servicesView: true,
    servicesEdit: false,
    tasksView: true,
    tasksEdit: true,
    documentsView: true,
    documentsEdit: true,
    billingView: true,
    billingEdit: false,
    reportsView: true,
    reportsEdit: false,
    settingsView: true,
    settingsEdit: false,
    auditLogView: false,
    userManagementView: false,
    userManagementEdit: false
  },
  status: "ACTIVE"
};

const ownerUser: User = {
  id: "57235de4-9fc6-42a5-86f3-df2dbb4506f7",
  user_number: "STF000001",
  email: "jainnagarwal26@gmail.com",
  username: "chiragjain",
  name: "Chirag Jain",
  fullName: "Chirag Jain",
  role: "OWNER",
  permissions: {
    dashboardView: true,
    clientsView: true,
    clientsEdit: true,
    servicesView: true,
    servicesEdit: true,
    tasksView: true,
    tasksEdit: true,
    documentsView: true,
    documentsEdit: true,
    billingView: true,
    billingEdit: true,
    reportsView: true,
    reportsEdit: true,
    settingsView: true,
    settingsEdit: true,
    auditLogView: true,
    userManagementView: true,
    userManagementEdit: true
  },
  status: "ACTIVE"
};

async function runStaffDailyReportAudit() {
  console.log("=========================================================");
  console.log(" MODULE A — STAFF DAILY WORK REPORTING AUDIT");
  console.log("=========================================================\n");

  let allPassed = true;

  // 1. Create Today's Report for Shruti
  const shrutiRes = await StaffDailyReportRepository.saveReport({
    workSummary: "Prepared GSTR-3B audit for CL000001 and ITR documents for CL000002.",
    completedWork: "2 GSTR-3B filings finalized",
    pendingWork: "1 PTEC document awaiting client sign-off",
    hoursWorked: 7.5,
    status: "SUBMITTED"
  }, shrutiUser);

  console.log(`1. Shruti Create/Submit Report: ${shrutiRes.success ? "✓ PASS" : "❌ FAIL"}`);
  if (!shrutiRes.success) allPassed = false;

  // 2. Create Today's Report for Anju
  const anjuRes = await StaffDailyReportRepository.saveReport({
    workSummary: "Completed PTRC return filings for CL000003 and client follow-ups.",
    completedWork: "PTRC filing done",
    pendingWork: "GST registration document review",
    hoursWorked: 8.0,
    status: "SUBMITTED"
  }, anjuUser);

  console.log(`2. Anju Create/Submit Report: ${anjuRes.success ? "✓ PASS" : "❌ FAIL"}`);
  if (!anjuRes.success) allPassed = false;

  // 3. Edit Today's Report (One report per day constraint)
  const shrutiEditRes = await StaffDailyReportRepository.saveReport({
    workSummary: "Prepared GSTR-3B audit for CL000001 and ITR documents for CL000002. Also reviewed PTRC.",
    completedWork: "3 tasks completed",
    hoursWorked: 8.5,
    status: "SUBMITTED"
  }, shrutiUser);

  const shrutiReports = StaffDailyReportRepository.getStaffReports(shrutiUser.id);
  const todayStr = StaffDailyReportRepository.getTodayDateString();
  const shrutiTodayCount = shrutiReports.filter(r => r.reportDate === todayStr).length;

  console.log(`3. Single Report per Staff per Day (Edit Existing): ${shrutiTodayCount === 1 ? "✓ PASS" : "❌ FAIL"} (Count: ${shrutiTodayCount})`);
  if (shrutiTodayCount !== 1) allPassed = false;

  // 4. Staff Isolation Check
  const shrutiViewable = StaffDailyReportRepository.getAllStaffReports(shrutiUser);
  const shrutiSeesAnju = shrutiViewable.some(r => r.staffUserId === anjuUser.id);
  console.log(`4. Staff Isolation (Shruti cannot view Anju's report): ${!shrutiSeesAnju ? "✓ PASS" : "❌ FAIL"}`);
  if (shrutiSeesAnju) allPassed = false;

  // 5. Owner Full Visibility Check
  const ownerViewable = StaffDailyReportRepository.getAllStaffReports(ownerUser);
  const ownerSeesShruti = ownerViewable.some(r => r.staffUserId === shrutiUser.id);
  const ownerSeesAnju = ownerViewable.some(r => r.staffUserId === anjuUser.id);

  console.log(`5. Owner Full Visibility (Owner sees Shruti + Anju): ${ownerSeesShruti && ownerSeesAnju ? "✓ PASS" : "❌ FAIL"}`);
  if (!ownerSeesShruti || !ownerSeesAnju) allPassed = false;

  console.log("\n=========================================================");
  console.log(` MODULE A AUDIT RESULT: ${allPassed ? "🟢 ALL CHECKS PASSED" : "🔴 FAILURE DETECTED"}`);
  console.log("=========================================================\n");
}

runStaffDailyReportAudit();
