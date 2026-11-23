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
  commitChunkedBatch,
  handleFirestoreError,
  OperationType,
} from "./firebase";
import { Venue, VenueVisit } from "../types";

export const listenToVenues = (cb: (venues: Venue[]) => void) => {
  const path = getColName("venues");
  return onSnapshot(
    query(collection(db, path), orderBy("name", "asc")),
    (snap) => cb(snapToData<Venue>(snap)),
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
};

export const saveVenue = async (venue: Venue) => {
  const path = getColName("venues");
  const now = new Date().toISOString();
  const id = venue.id || `ven-${Math.random().toString(36).substr(2, 9)}`;
  const payload: Venue = {
    ...venue,
    id,
    ispDetails: venue.ispDetails || [],
    createdAt: venue.createdAt || now,
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

export const deleteVenue = async (id: string) => {
  const path = getColName("venues");
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const syncVenuesFromLocations = async (
  locations: string[],
  existingVenues: Venue[]
): Promise<number> => {
  const existingNames = new Set(
    existingVenues.map((v) => v.name.trim().toLowerCase())
  );
  const now = new Date().toISOString();
  const toCreate: Venue[] = [];

  locations.forEach((loc) => {
    const clean = loc.trim();
    if (!clean || existingNames.has(clean.toLowerCase())) return;
    toCreate.push({
      id: `ven-${Math.random().toString(36).substr(2, 9)}`,
      name: clean,
      status: "Operational",
      ispDetails: [],
      createdAt: now,
      updatedAt: now,
    });
  });

  if (toCreate.length === 0) return 0;
  const path = getColName("venues");
  await commitChunkedBatch(toCreate, (batch, v) => {
    batch.set(doc(db, path, v.id), sanitizeData(v));
  });
  return toCreate.length;
};

// --- VENUE VISITS ---

export const listenToVenueVisits = (cb: (visits: VenueVisit[]) => void) => {
  const path = getColName("venueVisits");
  return onSnapshot(
    query(collection(db, path), orderBy("visitDate", "desc")),
    (snap) => cb(snapToData<VenueVisit>(snap)),
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
};

export const saveVenueVisit = async (visit: VenueVisit) => {
  const path = getColName("venueVisits");
  const id = visit.id || `vst-${Date.now()}`;
  const payload: VenueVisit = {
    ...visit,
    id,
    createdAt: visit.createdAt || new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, path, id), sanitizeData(payload));
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return id;
  }
};

export const deleteVenueVisit = async (id: string) => {
  const path = getColName("venueVisits");
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
