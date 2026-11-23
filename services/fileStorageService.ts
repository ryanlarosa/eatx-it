import { ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, isFirebaseConfigured } from "./firebase";

export type StorageFolder = "invoices" | "incidents" | "handovers" | "assets";

/**
 * Uploads a File/Blob to Firebase Storage and returns its public download URL.
 */
export const uploadFileToStorage = async (
  folder: StorageFolder,
  file: File,
  customName?: string
): Promise<{ url: string; path: string }> => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase Storage is not configured.");
  }
  const safeName = (customName || file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, path };
};

/**
 * Uploads a base64 Data URL (e.g., canvas signature or image) to Firebase Storage.
 */
export const uploadDataUrlToStorage = async (
  folder: StorageFolder,
  dataUrl: string,
  fileName: string
): Promise<{ url: string; path: string }> => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase Storage is not configured.");
  }
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  await uploadString(storageRef, dataUrl, "data_url");
  const url = await getDownloadURL(storageRef);
  return { url, path };
};

export const deleteFileFromStorage = async (path: string): Promise<void> => {
  if (!isFirebaseConfigured || !path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (e) {
    console.warn("Could not delete storage object:", path, e);
  }
};
