
// Fix: Cleaned up modular imports from firebase/firestore to resolve module resolution issues
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db, getColName, snapToData, sanitizeData, createNotification, handleFirestoreError, OperationType } from "./firebase";
import { sendSystemEmail } from "./configService";
import { getCurrentUserProfile } from "./authService";
import { AssetRequest, IncidentReport, PublicStatusResult } from "../types";

// --- REQUESTS ---

export const listenToRequests = (cb: (reqs: AssetRequest[]) => void) => {
  const path = getColName("requests");
  return onSnapshot(query(collection(db, path), orderBy("createdAt", "desc")), (snap) => {
    cb(snapToData<AssetRequest>(snap));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const createAssetRequest = async (req: Partial<AssetRequest>) => {
  const requestNumber = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newReq = { ...req, requestNumber, status: "New", createdAt: new Date().toISOString() };
  const path = getColName("requests");
  try {
    await addDoc(collection(db, path), sanitizeData(newReq));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  try {
    await createNotification("info", "IT Hub: New Request", `${req.requesterName} requested ${req.category}.`, "/requests");
    await sendSystemEmail("IT Hub: New Asset Request", `${req.requesterName} requested ${req.category}. Ref: ${requestNumber}`, window.location.origin + "/#/requests");
    if (req.requesterEmail) {
      await sendSystemEmail("Request Received: EatX IT Hub", `Hi ${req.requesterName}, your request for ${req.category} is logged. Ref: ${requestNumber}`, window.location.origin + "/#/track", req.requesterEmail, true);
    }
  } catch (e) {}
};

export const updateAssetRequest = async (id: string, updates: Partial<AssetRequest>) => {
  const path = getColName("requests");
  try {
    await updateDoc(doc(db, path, id), sanitizeData(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const fulfillAssetRequest = async (requestId: string, assetId: string, notes: string, employeeName: string) => {
  const batch = writeBatch(db);
  const ts = new Date().toISOString();
  batch.update(doc(db, getColName("requests"), requestId), { status: "Deployed", linkedAssetId: assetId, resolutionNotes: notes, resolvedAt: ts });
  batch.update(doc(db, getColName("assets"), assetId), { status: "Active", assignedEmployee: employeeName, lastUpdated: ts });
  batch.set(doc(collection(db, getColName("logs"))), { assetId, action: "Assigned", details: `Fulfillment: ${requestId}`, performedBy: getCurrentUserProfile()?.email || "System", timestamp: ts });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "multiple_collections");
  }
};

// --- INCIDENTS ---

export const listenToIncidents = (cb: (tickets: IncidentReport[]) => void) => {
  const path = getColName("incidents");
  return onSnapshot(query(collection(db, path), orderBy("createdAt", "desc")), (snap) => {
    cb(snapToData<IncidentReport>(snap));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const createIncidentReport = async (report: Partial<IncidentReport>) => {
  const isTask = report.itemType === "Task";
  const isPosSupy = report.itemType === "POS_Supy";
  const prefix = isTask ? "TSK" : isPosSupy ? (report.posSystem === "Supy" ? "SUPY" : "POS") : "TKT";
  const ticketNumber =
    report.ticketNumber ||
    `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newReport = {
    ...report,
    itemType: report.itemType || "Ticket",
    title: report.title || report.assetName || (isPosSupy ? `${report.posSystem || "POS"} Issue` : "Untitled IT Item"),
    assetName: report.assetName || report.title || (isPosSupy ? `${report.posSystem || "POS"} System` : "General IT"),
    ticketNumber,
    status: report.status || (isTask ? "Open" : "New"),
    createdAt: new Date().toISOString(),
  };
  const path = getColName("incidents");
  try {
    await addDoc(collection(db, path), sanitizeData(newReport));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  // Only fire staff portal alerts for incoming Support Tickets & POS/Supy issues
  if (!isTask) {
    const dest = isPosSupy ? "/pos-supy" : "/tickets";
    try {
      await createNotification(
        "warning",
        isPosSupy ? `New ${report.posSystem || "POS"} Issue` : "New Support Ticket",
        `${report.reportedBy} reported an issue at ${report.location}.`,
        dest
      );
      await sendSystemEmail(
        isPosSupy ? `EATX IT: New ${report.posSystem || "POS"} Issue` : "EATX IT: New Support Ticket",
        `${report.reportedBy} reported: ${report.description}. Ref: ${ticketNumber}`,
        window.location.origin + `/#${dest}`
      );
      if (report.reporterEmail) {
        await sendSystemEmail(
          "Ticket Received: EATX IT",
          `Hi ${report.reportedBy}, your issue at ${report.location} is logged. Ref: ${ticketNumber}`,
          window.location.origin + "/#/track",
          report.reporterEmail,
          true
        );
      }
    } catch (e) {}
  }
  return ticketNumber;
};

export const updateIncidentReport = async (id: string, updates: Partial<IncidentReport>, updateAssetStatus: boolean = false) => {
  const path = getColName("incidents");
  try {
    await updateDoc(doc(db, path, id), sanitizeData(updates));
    if (updateAssetStatus && updates.status === "Resolved") {
      const snap = await getDoc(doc(db, path, id));
      const data = snap.data() as IncidentReport;
      if (data.assetId) {
        await updateDoc(doc(db, getColName("assets"), data.assetId), { status: "Active", lastUpdated: new Date().toISOString() });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const processAssetReplacement = async (ticketId: string, oldAssetId: string, newAssetId: string, notes: string) => {
  const batch = writeBatch(db);
  const ts = new Date().toISOString();
  const path = getColName("incidents");
  let tData;
  try {
    const ticketSnap = await getDoc(doc(db, path, ticketId));
    tData = ticketSnap.data() as IncidentReport;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return;
  }

  batch.update(doc(db, getColName("assets"), oldAssetId), { status: "Retired", lastUpdated: ts, assignedEmployee: "" });
  batch.update(doc(db, getColName("assets"), newAssetId), { status: "Active", location: tData.location, assignedEmployee: tData.reportedBy || "", lastUpdated: ts });
  batch.update(doc(db, path, ticketId), { status: "Resolved", resolvedAt: ts, resolutionNotes: `Replaced with ${newAssetId}. ${notes}` });
  
  const perf = getCurrentUserProfile()?.email || "System";
  batch.set(doc(collection(db, getColName("logs"))), { assetId: oldAssetId, action: "Retired", details: `Replaced in ${tData.ticketNumber}`, performedBy: perf, timestamp: ts });
  batch.set(doc(collection(db, getColName("logs"))), { assetId: newAssetId, action: "Replaced", details: `Replacement in ${tData.ticketNumber}`, performedBy: perf, timestamp: ts });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "multiple_collections");
  }
};

export const deleteIncidentReport = async (id: string) => {
  const path = getColName("incidents");
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getPublicItemStatus = async (refId: string): Promise<PublicStatusResult | null> => {
  try {
    const tSnap = await getDocs(query(collection(db, getColName("incidents")), where("ticketNumber", "==", refId)));
    if (!tSnap.empty) {
      const d = tSnap.docs[0].data() as IncidentReport;
      return {
        id: d.ticketNumber,
        type: "Ticket",
        status: d.status,
        subject: d.itemType === "POS_Supy" ? `${d.posSystem || "POS"} Issue (${d.location})` : d.assetName,
        details: d.description,
        created: d.createdAt,
        updated: d.resolvedAt,
        notes: d.resolutionNotes,
        rejectionReason: d.rejectionReason,
        assignedTo: d.assignedTo,
      };
    }
    const rSnap = await getDocs(query(collection(db, getColName("requests")), where("requestNumber", "==", refId)));
    if (!rSnap.empty) {
      const d = rSnap.docs[0].data() as AssetRequest;
      return {
        id: d.requestNumber,
        type: "Request",
        status: d.status,
        subject: d.category,
        details: d.reason,
        created: d.createdAt,
        updated: d.resolvedAt,
        notes: d.resolutionNotes,
        procurementStage: d.status,
        rejectionReason: d.rejectionReason,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "multiple_collections");
    return null;
  }
};
