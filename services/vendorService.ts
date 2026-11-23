import {
  collection,
  deleteDoc,
  doc,
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
  handleFirestoreError,
  OperationType,
} from "./firebase";
import { Vendor } from "../types";

export const listenToVendors = (cb: (vendors: Vendor[]) => void) => {
  const path = getColName("vendors");
  return onSnapshot(
    query(collection(db, path), orderBy("name", "asc")),
    (snap) => {
      cb(snapToData<Vendor>(snap));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};

export const saveVendor = async (vendor: Vendor) => {
  const path = getColName("vendors");
  const id = vendor.id || `vnd-${Math.random().toString(36).substr(2, 9)}`;
  const payload: Vendor = {
    ...vendor,
    id,
    createdAt: vendor.createdAt || new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, path, id), sanitizeData(payload));
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return id;
  }
};

export const deleteVendor = async (id: string) => {
  const path = getColName("vendors");
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
