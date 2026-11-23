import { collection, doc, getDoc, getDocs, query, setDoc } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  getAuth,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
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

/**
 * Official verified EATX / Bull&Roo Google Workspace domains allowed to authenticate
 * on the IT Ticketing & Request Portal.
 */
export const ALLOWED_COMPANY_DOMAINS: readonly string[] = [
  "bullandroo.com",
  "byronbathers.com",
  "commongroundsdubai.com",
  "dmcclounge.com",
  "eatx.com",
  "encounter.ae",
  "encountercoffee.ae",
  "encountercoffeeroasters.com",
  "frankyinflorence.com",
  "frankyspizzeria.com",
  "harvestandco.com",
  "hawkerboi.com",
  "onlyonsundaes.com",
  "riseanddawnbakehouse.com",
  "splendourfields.com",
  "theguilddubai.com",
  "thesumofusdubai.com",
  "tomandserg.com",
] as const;

export const isAllowedCompanyEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return false;
  return ALLOWED_COMPANY_DOMAINS.includes(parts[1]);
};

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

export const isRequesterOnly = (user: UserProfile | null): boolean =>
  user?.role === "requester";

export const hasInternalConsoleAccess = (user: UserProfile | null): boolean =>
  !!user &&
  ["admin", "technician", "management", "viewer", "sandbox_user"].includes(
    user.role
  );

export const ensureAnonymousAuth = async () => {
  if (!isFirebaseConfigured) return;
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
};

/**
 * Authenticates EATX / Bull&Roo staff via Google Workspace and enforces the
 * official company domain allowlist.
 */
export const signInWithCompanyGoogle = async (): Promise<UserProfile> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  const email = (result.user.email || "").toLowerCase();

  if (!isAllowedCompanyEmail(email)) {
    await signOut(auth);
    throw new Error(
      `Access denied for "${email}". Please sign in with an official EATX / Bull&Roo Google Workspace email.`
    );
  }

  // Return profile (onAuthStateChanged will also sync it)
  return {
    uid: result.user.uid,
    email,
    displayName: result.user.displayName || email.split("@")[0],
    role: currentUserProfile?.role || "requester",
  };
};

if (isFirebaseConfigured) {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          currentUserProfile = {
            ...data,
            email: firebaseUser.email || data.email || "",
            displayName: data.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0],
          };

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
          const emailLower = (firebaseUser.email || "").toLowerCase();
          const isSuperAdmin = emailLower === SUPER_ADMIN_EMAIL;

          if (isSuperAdmin) {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: emailLower,
              role: "admin",
              displayName: firebaseUser.displayName || emailLower.split("@")[0],
            };
            await setDoc(doc(db, "users", firebaseUser.uid), newProfile);
            currentUserProfile = newProfile;
          } else if (isAllowedCompanyEmail(emailLower)) {
            // Staff signing in via Google Workspace get portal-only 'requester' access
            // and CANNOT enter the internal IT / Executive console unless promoted by Admin.
            currentUserProfile = {
              uid: firebaseUser.uid,
              email: emailLower,
              role: "requester",
              displayName: firebaseUser.displayName || emailLower.split("@")[0],
            };
          } else {
            // Non-company email with no pre-created internal profile
            await signOut(auth);
            currentUserProfile = null;
          }
        }
      } catch (e) {
        const emailLower = (firebaseUser.email || "").toLowerCase();
        if (isAllowedCompanyEmail(emailLower)) {
          currentUserProfile = {
            uid: firebaseUser.uid,
            email: emailLower,
            role: "requester",
            displayName: firebaseUser.displayName || emailLower.split("@")[0],
          };
        } else {
          if (e instanceof Error && e.message.includes("Missing or insufficient permissions")) {
            handleFirestoreError(e, OperationType.GET, "users");
          }
          currentUserProfile = null;
        }
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
