import { collection, doc, getDoc, getDocs, query, setDoc } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  getAuth,
  signInAnonymously,
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import {
  db,
  auth,
  isFirebaseConfigured,
  snapToData,
  secondaryConfig,
  handleFirestoreError,
  OperationType,
} from "./firebase";
import { UserProfile, UserRole } from "../types";

const env = (import.meta as any).env || {};
const SUPER_ADMIN_EMAIL = (env.VITE_SUPER_ADMIN_EMAIL || "it@eatx.com").toLowerCase();

let currentUserProfile: UserProfile | null = null;
const authListeners: Array<(user: UserProfile | null) => void> = [];

export const getCurrentUserProfile = () => currentUserProfile;

// --- RBAC CAPABILITY HELPERS ---

export const isAdminRole = (user: UserProfile | null): boolean =>
  user?.role === "admin";

export const canManageOperations = (user: UserProfile | null): boolean =>
  user?.role === "admin" ||
  user?.role === "technician" ||
  user?.role === "sandbox_user";

export const isReadOnlyRole = (user: UserProfile | null): boolean =>
  user?.role === "management" || user?.role === "viewer";

export const isVendorRole = (user: UserProfile | null): boolean =>
  user?.role === "vendor";

export const ensureAnonymousAuth = async () => {
  if (!isFirebaseConfigured) return;
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
};

if (isFirebaseConfigured) {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          currentUserProfile = { ...data, email: firebaseUser.email || "" };

          const currentSandboxState = localStorage.getItem("eatx_sandbox") === "true";
          if (currentUserProfile.role === "sandbox_user") {
            if (!currentSandboxState) {
              localStorage.setItem("eatx_sandbox", "true");
              window.location.reload();
              return;
            }
          } else if (currentSandboxState) {
            localStorage.setItem("eatx_sandbox", "false");
            window.location.reload();
            return;
          }
        } else if (!firebaseUser.isAnonymous) {
          // Only the explicitly configured super admin email bootstraps as admin.
          // All other first-time users default to read-only 'management' until promoted.
          const isSuperAdmin =
            (firebaseUser.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: (firebaseUser.email || "").toLowerCase(),
            role: isSuperAdmin ? "admin" : "management",
            displayName: firebaseUser.email?.split("@")[0] || "User",
          };
          await setDoc(doc(db, "users", firebaseUser.uid), newProfile);
          currentUserProfile = newProfile;
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("Missing or insufficient permissions")) {
          handleFirestoreError(e, OperationType.GET, "users");
        }
        currentUserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          role: "management",
        };
      }
    } else {
      currentUserProfile = null;
    }
    authListeners.forEach((cb) => cb(currentUserProfile));
  });
}

export const subscribeToAuth = (cb: (user: UserProfile | null) => void) => {
  authListeners.push(cb);
  cb(currentUserProfile);
  return () => {
    const idx = authListeners.indexOf(cb);
    if (idx > -1) authListeners.splice(idx, 1);
  };
};

export const loginUser = async (email: string, pass: string) =>
  signInWithEmailAndPassword(auth, email, pass);

export const logoutUser = async () => signOut(auth);

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const path = "users";
  try {
    const snap = await getDocs(query(collection(db, path)));
    return snapToData<UserProfile>(snap);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

export const adminCreateUser = async (
  email: string,
  pass: string,
  role: UserRole,
  displayName?: string
) => {
  const secondaryApp = initializeApp(secondaryConfig, `SecondaryApp-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    const uid = userCred.user.uid;
    const newProfile: UserProfile = {
      uid,
      email: email.toLowerCase(),
      role,
      displayName: displayName || email.split("@")[0],
    };
    const path = "users";
    try {
      await setDoc(doc(db, path, uid), newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    await signOut(secondaryAuth);
    return true;
  } finally {
    await deleteApp(secondaryApp);
  }
};

export const updateUserRole = async (uid: string, role: UserRole) => {
  const path = "users";
  try {
    await setDoc(doc(db, path, uid), { role }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};
