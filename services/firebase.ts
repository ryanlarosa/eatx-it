import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  writeBatch,
  Firestore,
  QuerySnapshot,
  DocumentData,
  WriteBatch,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import type { FirebaseStorage } from "firebase/storage";

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain
);

// Initialize with placeholders only if unconfigured so the app renders the config-missing banner cleanly
const initConfig = isFirebaseConfigured
  ? firebaseConfig
  : {
      apiKey: "unconfigured",
      authDomain: "unconfigured.firebaseapp.com",
      projectId: "unconfigured",
      storageBucket: "unconfigured.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:0000000000000000000000",
    };

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(initConfig);
} else {
  app = getApp();
}

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);
export const firebaseApp: FirebaseApp = app;
export const secondaryConfig = initConfig;

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- INTERNAL HELPERS ---

export const snapToData = <T>(snapshot: QuerySnapshot<DocumentData>): T[] => {
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as unknown as T));
};

export const sanitizeData = (data: any) => {
  const clean: any = {};
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      clean[key] = data[key];
    }
  });
  return clean;
};

/**
 * Safely executes Firestore batch writes in chunks of 400 (well below the 500-op Firestore limit).
 */
export const commitChunkedBatch = async <T>(
  items: T[],
  applyOp: (batch: WriteBatch, item: T) => void,
  chunkSize: number = 400
) => {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((item) => applyOp(batch, item));
    await batch.commit();
  }
};

export const getSandboxStatus = () => {
  if (localStorage.getItem("eatx_sandbox") === "true") return true;
  if (typeof window !== "undefined") {
    if (window.location.hash.includes("env=sandbox")) return true;
    if (window.location.search.includes("env=sandbox")) return true;
  }
  return false;
};

export const setSandboxMode = (enabled: boolean) => {
  localStorage.setItem("eatx_sandbox", enabled ? "true" : "false");
  window.location.reload();
};

export const getColName = (name: string) =>
  getSandboxStatus() ? `sandbox_${name}` : name;

export const createNotification = async (
  type: "info" | "warning" | "success" | "error",
  title: string,
  message: string,
  link: string = ""
) => {
  const path = getColName("notifications");
  try {
    await addDoc(collection(db, path), {
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      link,
    });
  } catch (e) {
    console.warn("Silent failure creating dashboard notification:", e);
  }
};

export const checkEnvStatus = () => {
  const isSandbox = getSandboxStatus();
  if (!isFirebaseConfigured) {
    return {
      ok: false,
      message: "Firebase not configured — add VITE_FIREBASE_* keys to .env.local",
    };
  }
  return {
    ok: true,
    message: isSandbox ? "Sandbox Mode Active" : "System Online",
  };
};
