import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import {
  db,
  getColName,
  snapToData,
  sanitizeData,
  commitChunkedBatch,
  handleFirestoreError,
  OperationType,
} from "./firebase";
import { Asset, EmployeeITProfile, ITChecklistItem } from "../types";

export const DEFAULT_ONBOARDING_CHECKLIST = (): ITChecklistItem[] => [
  { id: "ob-1", label: "Hardware prepared & configured (Laptop / Mobile / Peripherals)", done: false },
  { id: "ob-2", label: "Google Workspace account created & MFA enabled", done: false },
  { id: "ob-3", label: "Venue / Office Wi-Fi & VPN access configured", done: false },
  { id: "ob-4", label: "POS / Operational system access provisioned", done: false },
  { id: "ob-5", label: "Digital Asset Handover form signed", done: false },
];

export const DEFAULT_ACCESS_CHECKLIST = (): ITChecklistItem[] => [
  { id: "acc-1", label: "Google Workspace (Gmail / Drive / Calendar)", done: false },
  { id: "acc-2", label: "POS System / Back-Office Access", done: false },
  { id: "acc-3", label: "Corporate Wi-Fi / UniFi / Fortinet VPN", done: false },
  { id: "acc-4", label: "Shared Drives & Department Folders", done: false },
  { id: "acc-5", label: "Printers & Venue Peripherals", done: false },
];

export const DEFAULT_OFFBOARDING_CHECKLIST = (): ITChecklistItem[] => [
  { id: "off-1", label: "Google Workspace suspended & mailbox backed up / forwarded", done: false },
  { id: "off-2", label: "POS, Wi-Fi, VPN & third-party access revoked", done: false },
  { id: "off-3", label: "All assigned IT hardware collected & inspected", done: false },
  { id: "off-4", label: "Digital Asset Return form signed", done: false },
  { id: "off-5", label: "Assets reset & returned to IT Storage", done: false },
];

export const getEmployees = async (): Promise<EmployeeITProfile[]> => {
  const path = getColName("employees");
  try {
    const snap = await getDocs(query(collection(db, path), orderBy("name", "asc")));
    return snapToData<EmployeeITProfile>(snap);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

export const listenToEmployees = (cb: (employees: EmployeeITProfile[]) => void) => {
  const path = getColName("employees");
  return onSnapshot(
    query(collection(db, path), orderBy("name", "asc")),
    (snap) => {
      cb(snapToData<EmployeeITProfile>(snap));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};

export const saveEmployeeProfile = async (profile: EmployeeITProfile) => {
  const path = getColName("employees");
  const now = new Date().toISOString();
  const id = profile.id || `emp-${Math.random().toString(36).substr(2, 9)}`;
  const payload: EmployeeITProfile = {
    ...profile,
    id,
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };
  try {
    await setDoc(doc(db, path, id), sanitizeData(payload));
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return id;
  }
};

export const deleteEmployeeProfile = async (id: string) => {
  const path = getColName("employees");
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/**
 * Seeds lightweight Employee IT Profiles from existing assignedEmployee names in Assets
 * that do not yet have a profile in the `employees` collection.
 */
export const syncEmployeesFromAssets = async (
  assets: Asset[],
  existingEmployees: EmployeeITProfile[]
): Promise<number> => {
  const existingNames = new Set(
    existingEmployees.map((e) => e.name.trim().toLowerCase())
  );
  const toCreate: EmployeeITProfile[] = [];
  const seen = new Set<string>();
  const now = new Date().toISOString();

  assets.forEach((asset) => {
    const rawName = asset.assignedEmployee?.trim();
    if (!rawName) return;
    const key = rawName.toLowerCase();
    if (existingNames.has(key) || seen.has(key)) return;
    seen.add(key);

    toCreate.push({
      id: `emp-${Math.random().toString(36).substr(2, 9)}`,
      name: rawName,
      department: asset.department || "",
      location: asset.location || "",
      status: "Active",
      onboardingChecklist: DEFAULT_ONBOARDING_CHECKLIST(),
      accessChecklist: DEFAULT_ACCESS_CHECKLIST(),
      offboardingChecklist: DEFAULT_OFFBOARDING_CHECKLIST(),
      createdAt: now,
      updatedAt: now,
    });
  });

  if (toCreate.length === 0) return 0;

  const path = getColName("employees");
  await commitChunkedBatch(toCreate, (batch, emp) => {
    batch.set(doc(db, path, emp.id), sanitizeData(emp));
  });

  return toCreate.length;
};
