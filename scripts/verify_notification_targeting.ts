import { NotificationRepository } from "../src/lib/notificationRepository";
import { User, AppNotification } from "../src/types";

// User objects representing actual production accounts
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

const amitUser: User = {
  id: "06158e82-8257-442d-8769-11e2c8292b62",
  user_number: "STF000002",
  email: "amit@jainnagarwal.in",
  username: "amit",
  name: "Amit Agrawal",
  fullName: "Amit Agrawal",
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

async function runNotificationTargetingAudit() {
  console.log("=========================================================");
  console.log(" NOTIFICATION TARGETING & RECIPIENT ISOLATION AUDIT");
  console.log("=========================================================\n");

  let allPassed = true;

  // Test 1: Add a broadcast to All Staff
  const broadcastMsg = NotificationRepository.addNotification({
    type: "Announcement",
    title: "Office Meeting Announcement",
    message: "Monthly practice review meeting scheduled for Friday at 4 PM.",
    channel: "In-App Notification",
    priority: "High",
    targetUserId: "all"
  }, ownerUser);

  // Test 2: Add a private message targeted to Shruti Gupta
  const shrutiMsg = NotificationRepository.addNotification({
    type: "Information",
    title: "Shruti Private Task Assignment",
    message: "Please audit GSTR-3B filings for CL000001.",
    channel: "In-App Notification",
    priority: "High",
    targetUserId: shrutiUser.id
  }, ownerUser);

  // Test 3: Add a private message targeted to Anju Mishra
  const anjuMsg = NotificationRepository.addNotification({
    type: "Information",
    title: "Anju Private Task Assignment",
    message: "Please prepare PTEC returns for CL000002.",
    channel: "In-App Notification",
    priority: "High",
    targetUserId: anjuUser.id
  }, ownerUser);

  // --- RECIPIENT ISOLATION VERIFICATION ---

  // Shruti View
  const shrutiNotifs = NotificationRepository.getNotifications(shrutiUser);
  const shrutiHasBroadcast = shrutiNotifs.some(n => n.id === broadcastMsg.id);
  const shrutiHasShrutiMsg = shrutiNotifs.some(n => n.id === shrutiMsg.id);
  const shrutiHasAnjuMsg = shrutiNotifs.some(n => n.id === anjuMsg.id);

  console.log("1. SHRUTI GUPTA (STF000003) VISIBILITY:");
  console.log(`   - Sees All Staff Broadcast: ${shrutiHasBroadcast ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Sees Shruti Private Message: ${shrutiHasShrutiMsg ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Sees Anju Private Message (MUST BE FALSE): ${!shrutiHasAnjuMsg ? "✓ PASS" : "❌ FAIL"}`);

  if (!shrutiHasBroadcast || !shrutiHasShrutiMsg || shrutiHasAnjuMsg) allPassed = false;

  // Anju View
  const anjuNotifs = NotificationRepository.getNotifications(anjuUser);
  const anjuHasBroadcast = anjuNotifs.some(n => n.id === broadcastMsg.id);
  const anjuHasAnjuMsg = anjuNotifs.some(n => n.id === anjuMsg.id);
  const anjuHasShrutiMsg = anjuNotifs.some(n => n.id === shrutiMsg.id);

  console.log("\n2. ANJU MISHRA (STF000004) VISIBILITY:");
  console.log(`   - Sees All Staff Broadcast: ${anjuHasBroadcast ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Sees Anju Private Message: ${anjuHasAnjuMsg ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Sees Shruti Private Message (MUST BE FALSE): ${!anjuHasShrutiMsg ? "✓ PASS" : "❌ FAIL"}`);

  if (!anjuHasBroadcast || !anjuHasAnjuMsg || anjuHasShrutiMsg) allPassed = false;

  // Amit View
  const amitNotifs = NotificationRepository.getNotifications(amitUser);
  const amitHasBroadcast = amitNotifs.some(n => n.id === broadcastMsg.id);
  const amitHasShrutiMsg = amitNotifs.some(n => n.id === shrutiMsg.id);
  const amitHasAnjuMsg = amitNotifs.some(n => n.id === anjuMsg.id);

  console.log("\n3. AMIT AGRAWAL (STF000002) VISIBILITY:");
  console.log(`   - Sees All Staff Broadcast: ${amitHasBroadcast ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Sees Shruti Private Message (MUST BE FALSE): ${!amitHasShrutiMsg ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Sees Anju Private Message (MUST BE FALSE): ${!amitHasAnjuMsg ? "✓ PASS" : "❌ FAIL"}`);

  if (!amitHasBroadcast || amitHasShrutiMsg || amitHasAnjuMsg) allPassed = false;

  // Owner View
  const ownerNotifs = NotificationRepository.getNotifications(ownerUser);
  const ownerHasBroadcast = ownerNotifs.some(n => n.id === broadcastMsg.id);
  const ownerHasShrutiMsg = ownerNotifs.some(n => n.id === shrutiMsg.id);
  const ownerHasAnjuMsg = ownerNotifs.some(n => n.id === anjuMsg.id);

  console.log("\n4. CHIRAG JAIN (OWNER / SUPERADMIN) VISIBILITY:");
  console.log(`   - Sees All Staff Broadcast: ${ownerHasBroadcast ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Sees Shruti Private Message: ${ownerHasShrutiMsg ? "✓ PASS" : "❌ FAIL"}`);
  console.log(`   - Sees Anju Private Message: ${ownerHasAnjuMsg ? "✓ PASS" : "❌ FAIL"}`);

  if (!ownerHasBroadcast || !ownerHasShrutiMsg || !ownerHasAnjuMsg) allPassed = false;

  console.log("\n=========================================================");
  console.log(` RECIPIENT ISOLATION AUDIT RESULT: ${allPassed ? "🟢 ALL CHECKS PASSED" : "🔴 FAILURE DETECTED"}`);
  console.log("=========================================================\n");
}

runNotificationTargetingAudit();
