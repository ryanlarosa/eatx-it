
export type AssetStatus = 'Active' | 'In Storage' | 'Under Repair' | 'Retired' | 'Lost/Stolen';
export const ASSET_STATUSES: AssetStatus[] = ['Active', 'In Storage', 'Under Repair', 'Retired', 'Lost/Stolen'];

export type UserRole = 'admin' | 'technician' | 'management' | 'viewer' | 'vendor' | 'requester' | 'sandbox_user';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
}

export interface EmailConfig {
  serviceId: string;
  templateId: string; // The IT Alert Template
  confirmationTemplateId?: string; // The Staff Receipt Template
  publicKey: string;
  targetEmail: string; // The IT Manager email that receives alerts
  enabled: boolean;
}

export interface AppNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface AssetLog {
  id: string;
  assetId: string;
  action: 'Created' | 'Updated' | 'Assigned' | 'Returned' | 'Transferred' | 'Audit' | 'Ticket' | 'Replaced' | 'Retired';
  details: string;
  performedBy: string;
  timestamp: string;
  documentId?: string; // Link to the signed PDF/Image
  ticketId?: string;
}

export interface HandoverDocument {
  id: string;
  employeeName: string;
  assets: { id: string; name: string; serialNumber: string }[];
  signatureBase64: string;
  itSignatureBase64?: string;
  date: string;
  type: 'Handover' | 'Return' | 'Transfer';
  status?: 'Pending' | 'Completed'; // Track multi-step signing progress
}

export interface PendingHandover {
  id: string;
  employeeName: string;
  assetIds: string[];
  assetsSnapshot: { id: string; name: string; serialNumber: string }[];
  createdAt: string;
  createdBy: string;
  status: 'Pending' | 'Completed';
  type: 'Handover' | 'Return' | 'Transfer';
  targetName?: string;
}

export interface IncidentReport {
  id: string;
  ticketNumber: string;
  assetId?: string;
  assetName: string; // Fallback if asset is generic or not in system
  deviceType?: string; // e.g. Laptop, iPad
  reportedSerial?: string; // Optional user input
  imageBase64?: string; // Evidence photo
  location: string;
  reportedBy: string; // Staff name
  reporterEmail?: string; // Email for updates
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'New' | 'Open' | 'In Progress' | 'Waiting for Parts' | 'Resolved' | 'Rejected';
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface AssetRequest {
  id: string;
  requestNumber: string;
  requesterName: string;
  requesterEmail?: string; // Email for updates
  department: string;
  category: string; // What they want (e.g. Laptop)
  urgency: 'Low' | 'Medium' | 'High';
  reason: string;
  status: 'New' | 'Acknowledged' | 'Pending Finance' | 'Approved' | 'Deployed' | 'Rejected';
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  linkedAssetId?: string; // If fulfilled with specific asset
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: string;
  date: string;
  amount: number;
  fileBase64?: string;
  fileName?: string;
  linkedAssetIds: string[];
  createdAt: string;
}

export interface Asset {
  id: string;
  assetTag?: string; // e.g. EATX-LAP-001
  name: string;
  manufacturer?: string;
  model?: string;
  description: string;
  category: string;
  status: AssetStatus;
  location: string;
  venueId?: string;
  department?: string;
  assignedEmployee?: string;
  employeeId?: string;
  serialNumber: string;
  supplier?: string;
  purchaseDate?: string;
  warrantyExpiry?: string; // ISO date YYYY-MM-DD
  purchaseCost?: number;
  disposalDate?: string; // ISO date YYYY-MM-DD
  disposalReason?: string;
  lastUpdated: string;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Waiting on Vendor' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string; // Name of IT staff (e.g. Ryan / Diego)
  assignedToUid?: string;
  venue?: string; // Venue / Location name
  venueId?: string;
  vendor?: string; // Assigned vendor name
  vendorId?: string;
  linkedTicketId?: string; // Internal Help Desk ticket ref
  externalTicketRef?: string; // External ref (Bayzat, ISP, vendor ticket)
  resolutionNotes?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  createdBy: string;
  checklist?: { id: string; text: string; done: boolean }[];
}

export interface Vendor {
  id: string;
  name: string;
  category: string; // Network, POS, CCTV, ISP, Hardware, Printers, Other
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface AppConfig {
  categories: string[];
  locations: string[];
  departments: string[];
}

export interface AssetStats {
  totalValue: number;
  totalAssets: number;
  activeAssets: number;
  repairAssets: number;
  expiringWarranties?: number;
  expiredWarranties?: number;
  byCategory: { name: string; value: number }[];
}

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  estimatedCost: number;
  quantity?: number;
  status: 'Pending' | 'Ordered' | 'Received';
  dueDate: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  targetDate?: string;
  owner?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

export interface ProjectBlocker {
  id: string;
  title: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  resolved: boolean;
  createdAt: string;
}

export interface ManagementDecision {
  id: string;
  title: string;
  details?: string;
  status: 'Pending' | 'Approved' | 'Deferred';
  requestedAt: string;
  decidedAt?: string;
}

export type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed';

export interface Project {
  id: string;
  name: string;
  description: string;
  targetDate: string;
  status: ProjectStatus;
  owner?: string;
  assignedPersonnel?: string[];
  venue?: string;
  progress?: number;
  milestones?: ProjectMilestone[];
  dependencies?: string[];
  blockers?: ProjectBlocker[];
  decisionsRequired?: ManagementDecision[];
  items: ProjectItem[];
}

/**
 * Added PublicStatusResult interface for tracking tickets and requests.
 */
export interface PublicStatusResult {
  id: string;
  type: "Ticket" | "Request";
  status: string;
  subject: string;
  details: string;
  created: string;
  updated?: string;
  notes?: string;
}

// --- PHASE 2: EMPLOYEE IT PROFILES (Lightweight IT-only, non-Bayzat) ---

export type EmployeeITStatus = 'Active' | 'Onboarding' | 'Offboarding' | 'Offboarded';

export interface ITChecklistItem {
  id: string;
  label: string;
  done: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface EmployeeITProfile {
  id: string;
  name: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  location?: string; // Venue / Office name
  venueId?: string;
  status: EmployeeITStatus;
  startDate?: string;
  lastWorkingDay?: string;
  assetReturnConfirmed?: boolean;
  assetReturnConfirmedAt?: string;
  assetReturnConfirmedBy?: string;
  notes?: string;
  onboardingChecklist: ITChecklistItem[];
  accessChecklist: ITChecklistItem[];
  offboardingChecklist: ITChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

// --- PHASE 5: VENUE INFRASTRUCTURE MANAGEMENT ---

export type VenueStatus = 'Operational' | 'Opening Soon' | 'Under Maintenance' | 'Closed';

export interface VenueISP {
  id: string;
  provider: string; // e.g. Etisalat, du
  accountNumber?: string;
  circuitId?: string;
  staticIp?: string;
  bandwidth?: string;
  supportPhone?: string;
  isBackup?: boolean;
  notes?: string;
}

export interface Venue {
  id: string;
  name: string;
  code?: string;
  brand?: string;
  address?: string;
  managerName?: string;
  managerContact?: string;
  status: VenueStatus;
  ispDetails: VenueISP[];
  networkNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type VisitPurpose = 'Routine Check' | 'Incident Response' | 'Installation' | 'Preventive Maintenance' | 'Audit';

export interface VenueVisit {
  id: string;
  venueId: string;
  venueName: string;
  visitDate: string;
  technician: string; // Ryan / Diego
  purpose: VisitPurpose;
  findings: string;
  actionsTaken?: string;
  followUpRequired: boolean;
  createdAt: string;
}
