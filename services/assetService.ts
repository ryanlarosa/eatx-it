
// Fix: Cleaned up modular imports from firebase/firestore to resolve symbol visibility issues
import { 
  addDoc, 
  collection, 
  deleteDoc, 
  doc, 
  getDocs, 
  onSnapshot, 
  orderBy, 
  query, 
  setDoc, 
  where, 
  writeBatch 
} from "firebase/firestore";
import { db, getColName, snapToData, sanitizeData, commitChunkedBatch, handleFirestoreError, OperationType } from "./firebase";
import { getCurrentUserProfile } from "./authService";
import { Asset, AssetLog, AssetStats } from "../types";

export const getAssets = async (): Promise<Asset[]> => {
  const path = getColName("assets");
  try {
    const snap = await getDocs(query(collection(db, path), orderBy("lastUpdated", "desc")));
    return snapToData<Asset>(snap);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

export const listenToAssets = (cb: (assets: Asset[]) => void) => {
  const path = getColName("assets");
  return onSnapshot(query(collection(db, path), orderBy("lastUpdated", "desc")), (snap) => {
    cb(snapToData<Asset>(snap));
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const saveAsset = async (asset: Asset) => {
  const isNew = !asset.id;
  const assetId = asset.id || `ast-${Math.random().toString(36).substr(2, 9)}`;
  const finalAsset = { ...asset, id: assetId, lastUpdated: new Date().toISOString() };
  const path = getColName("assets");
  try {
    await setDoc(doc(db, path, assetId), sanitizeData(finalAsset));
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }

  try {
    const logsPath = getColName("logs");
    await addDoc(collection(db, logsPath), {
      assetId,
      action: isNew ? "Created" : "Updated",
      details: isNew ? `Asset ${asset.name} onboarded.` : `Asset ${asset.name} updated manually.`,
      performedBy: getCurrentUserProfile()?.email || "System",
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    // Silent failure for logs
  }
};

export const deleteAsset = async (id: string) => {
  const path = getColName("assets");
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const importAssetsBulk = async (assets: Asset[]) => {
  const path = getColName("assets");
  try {
    await commitChunkedBatch(assets, (batch, a) => {
      const ref = doc(db, path, a.id);
      batch.set(ref, sanitizeData(a));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getAssetLogs = async (assetId: string): Promise<AssetLog[]> => {
  const path = getColName("logs");
  const q = query(collection(db, path), where("assetId", "==", assetId), orderBy("timestamp", "desc"));
  try {
    const snap = await getDocs(q);
    return snapToData<AssetLog>(snap);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

export type WarrantyStatus = "valid" | "expiring" | "expired" | "none";

export const getWarrantyStatus = (warrantyExpiry?: string, soonDays: number = 60): WarrantyStatus => {
  if (!warrantyExpiry) return "none";
  const expiry = new Date(warrantyExpiry);
  if (isNaN(expiry.getTime())) return "none";
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= soonDays) return "expiring";
  return "valid";
};

export const getStats = (assets: Asset[]): AssetStats => {
  const stats: AssetStats = {
    totalValue: 0,
    totalAssets: assets.length,
    activeAssets: 0,
    repairAssets: 0,
    expiringWarranties: 0,
    expiredWarranties: 0,
    byCategory: [],
  };
  const catMap = new Map<string, number>();
  assets.forEach((a) => {
    const cost = a.purchaseCost || 0;
    stats.totalValue += cost;
    if (a.status === "Active") stats.activeAssets++;
    if (a.status === "Under Repair") stats.repairAssets++;
    const wStatus = getWarrantyStatus(a.warrantyExpiry);
    if (wStatus === "expiring") stats.expiringWarranties = (stats.expiringWarranties || 0) + 1;
    if (wStatus === "expired" && a.status !== "Retired") stats.expiredWarranties = (stats.expiredWarranties || 0) + 1;
    catMap.set(a.category, (catMap.get(a.category) || 0) + cost);
  });
  stats.byCategory = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
  return stats;
};

// Internal helpers for transactions
export const bulkAssignAssetsInternal = (batch: any, assetIds: string[], employeeName: string, docId: string, performer: string) => {
  if (!Array.isArray(assetIds)) return;
  const timestamp = new Date().toISOString();
  assetIds.forEach((id) => {
    if (!id) return;
    batch.update(doc(db, getColName("assets"), id), { assignedEmployee: employeeName, status: "Active", lastUpdated: timestamp });
    batch.set(doc(collection(db, getColName("logs"))), { assetId: id, action: "Assigned", details: `Assigned to ${employeeName}. Doc: ${docId}`, performedBy: performer, timestamp, documentId: docId });
  });
};

export const bulkReturnAssetsInternal = (batch: any, assetIds: string[], docId: string, performer: string) => {
  if (!Array.isArray(assetIds)) return;
  const timestamp = new Date().toISOString();
  assetIds.forEach((id) => {
    if (!id) return;
    batch.update(doc(db, getColName("assets"), id), { assignedEmployee: "", status: "In Storage", lastUpdated: timestamp });
    batch.set(doc(collection(db, getColName("logs"))), { assetId: id, action: "Returned", details: `Returned to storage. Doc: ${docId}`, performedBy: performer, timestamp, documentId: docId });
  });
};

export const bulkTransferAssetsInternal = (batch: any, assetIds: string[], targetName: string, docId: string, performer: string) => {
  if (!Array.isArray(assetIds)) return;
  const timestamp = new Date().toISOString();
  assetIds.forEach((id) => {
    if (!id) return;
    batch.update(doc(db, getColName("assets"), id), { assignedEmployee: targetName, lastUpdated: timestamp });
    batch.set(doc(collection(db, getColName("logs"))), { assetId: id, action: "Transferred", details: `Transferred to ${targetName}. Doc: ${docId}`, performedBy: performer, timestamp, documentId: docId });
  });
};

export const bulkAssignAssets = async (assetIds: string[], employeeName: string, docId: string) => {
  const path = getColName("assets");
  const batch = writeBatch(db);
  bulkAssignAssetsInternal(batch, assetIds, employeeName, docId, getCurrentUserProfile()?.email || "System");
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const bulkReturnAssets = async (assetIds: string[], docId: string) => {
  const path = getColName("assets");
  const batch = writeBatch(db);
  bulkReturnAssetsInternal(batch, assetIds, docId, getCurrentUserProfile()?.email || "System");
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const bulkTransferAssets = async (assetIds: string[], targetName: string, docId: string) => {
  const path = getColName("assets");
  const batch = writeBatch(db);
  bulkTransferAssetsInternal(batch, assetIds, targetName, docId, getCurrentUserProfile()?.email || "System");
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
