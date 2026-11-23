import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import {
  getAppConfig,
  createAssetRequest,
  getSandboxStatus,
} from "../services/storageService";
import {
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Send,
} from "lucide-react";
import StaffPortalGate from "./StaffPortalGate";

const AssetRequestContent: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [requestType, setRequestType] = useState<"individual" | "department">(
    "individual"
  );
  const [submitterName, setSubmitterName] = useState(
    user.displayName || user.email.split("@")[0] || ""
  );
  const [submitterEmail] = useState(user.email || "");
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState("");
  const [requestItems, setRequestItems] = useState<
    { id: number; itemName: string }[]
  >([{ id: Date.now(), itemName: "" }]);
  const [urgency, setUrgency] = useState<"Low" | "Medium" | "High">("Medium");
  const [reason, setReason] = useState("");

  const isSandbox = getSandboxStatus();

  useEffect(() => {
    const init = async () => {
      try {
        const config = await getAppConfig();
        setDepartments(config.departments || []);
      } catch (e) {
        console.warn("Could not load config:", e);
      }
      setLoading(false);
    };
    init();
  }, []);

  const addItem = () =>
    setRequestItems([...requestItems, { id: Date.now(), itemName: "" }]);

  const removeItem = (id: number) => {
    if (requestItems.length === 1) return;
    setRequestItems(requestItems.filter((i) => i.id !== id));
  };

  const updateItem = (id: number, value: string) =>
    setRequestItems(
      requestItems.map((i) => (i.id === id ? { ...i, itemName: value } : i))
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const validItems = requestItems.filter((i) => i.itemName.trim());
    if (validItems.length === 0) {
      alert("Please specify at least one equipment item.");
      return;
    }

    setSubmitting(true);
    try {
      const beneficiaryInfo =
        requestType === "individual"
          ? `For Employee: ${employeeName}`
          : `For Department: ${department} (General Office/Outlet Use)`;

      for (const item of validItems) {
        await createAssetRequest({
          requesterName: submitterName,
          requesterEmail: submitterEmail,
          department,
          category: item.itemName.trim(),
          urgency,
          reason: `${beneficiaryInfo}\n\nJustification: ${reason}`,
        });
      }
      setSubmitted(true);
    } catch {
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setEmployeeName("");
    setRequestItems([{ id: Date.now(), itemName: "" }]);
    setReason("");
    setUrgency("Medium");
  };

  const inputClass =
    "w-full px-3 py-2 text-[14px] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded bg-white dark:bg-[#0F141C] text-[#172B4D] dark:text-[#E6EDF5] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none transition-colors";
  const labelClass =
    "block text-[12px] font-semibold text-[#42526E] dark:text-[#CBD5E1] mb-1";

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-[#0052CC]" size={26} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] border-l-4 border-l-[#00875A] rounded p-6 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="text-[#00875A] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[16px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
                Equipment request submitted
              </h2>
              <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8] mt-1">
                Your request for{" "}
                <strong>
                  {requestItems.filter((i) => i.itemName.trim()).length}
                </strong>{" "}
                item(s) has been sent to EATX IT Procurement. Updates will be sent to{" "}
                <strong>{submitterEmail}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded transition-colors"
          >
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {isSandbox && (
        <div className="px-3 py-2 rounded bg-[#FFFAE6] border border-[#FFE380] text-[#974F0C] text-xs font-medium">
          Sandbox Mode — test submissions only.
        </div>
      )}

      <div>
        <h1 className="text-[20px] font-semibold text-[#172B4D] dark:text-[#E6EDF5] tracking-tight">
          Request IT Equipment
        </h1>
        <p className="text-[13px] text-[#5E6C84] dark:text-[#94A3B8]">
          Request laptops, POS peripherals, printers, or accessories for staff or venue operations.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#161C26] border border-[#DFE3E8] dark:border-[#242E40] rounded overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230]">
          <h2 className="text-[13px] font-semibold text-[#172B4D] dark:text-[#E6EDF5]">
            Procurement request details
          </h2>
        </div>

        <div className="p-5 space-y-5">
          {/* Request Type */}
          <div>
            <label className={labelClass}>Request scope</label>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {(
                [
                  { id: "individual", label: "For an employee" },
                  { id: "department", label: "For a venue / department" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRequestType(opt.id)}
                  className={`py-2 px-3 rounded text-[13px] font-medium border transition-colors ${
                    requestType === opt.id
                      ? "bg-[#0052CC] text-white border-[#0052CC]"
                      : "bg-white dark:bg-[#0F141C] text-[#42526E] dark:text-[#CBD5E1] border-[#C1C7D0] dark:border-[#2E3A4D]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submitter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Requested by *</label>
              <input
                required
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Verified company email</label>
              <input
                type="email"
                readOnly
                value={submitterEmail}
                className={`${inputClass} bg-[#F4F5F7] dark:bg-[#1B2230] text-[#5E6C84] dark:text-[#94A3B8] cursor-not-allowed`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {requestType === "individual" && (
              <div>
                <label className={labelClass}>Beneficiary employee name *</label>
                <input
                  required
                  type="text"
                  placeholder="Full name of employee receiving hardware"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>Department *</label>
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={inputClass}
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Equipment Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Requested equipment items *</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-medium text-[#0052CC] dark:text-[#4C9AFF] hover:underline flex items-center gap-1"
              >
                <Plus size={13} /> Add another item
              </button>
            </div>
            {requestItems.map((item, idx) => (
              <div key={item.id} className="flex gap-2">
                <input
                  required
                  type="text"
                  placeholder={`Item ${idx + 1} (e.g. MacBook Air M3, Thermal Receipt Printer, iPad)`}
                  value={item.itemName}
                  onChange={(e) => updateItem(item.id, e.target.value)}
                  className={inputClass}
                />
                {requestItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="px-2.5 text-[#6B778C] hover:text-[#DE350B] border border-[#C1C7D0] dark:border-[#2E3A4D] rounded"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Urgency */}
          <div>
            <label className={labelClass}>Urgency</label>
            <div className="grid grid-cols-3 gap-2 max-w-md">
              {(["Low", "Medium", "High"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`py-2 px-3 rounded text-[13px] font-medium border transition-colors ${
                    urgency === u
                      ? "bg-[#0052CC] text-white border-[#0052CC]"
                      : "bg-white dark:bg-[#0F141C] text-[#42526E] dark:text-[#CBD5E1] border-[#C1C7D0] dark:border-[#2E3A4D]"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Justification */}
          <div>
            <label className={labelClass}>Business justification *</label>
            <textarea
              required
              rows={3}
              placeholder="Explain the operational requirement, new hire start date, or venue need..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[#EBECF0] dark:border-[#242E40] bg-[#F9FAFB] dark:bg-[#1B2230] flex items-center justify-between gap-3">
          <span className="text-xs text-[#6B778C]">
            Subject to IT &amp; Finance review
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-[#0052CC] hover:bg-[#0043A8] text-white text-[13px] font-medium rounded flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                Submit request <Send size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const PublicAssetRequest: React.FC = () => (
  <StaffPortalGate
    title="Request IT Equipment"
    subtitle="Submit hardware or peripheral procurement requests to EATX IT."
  >
    {(user) => <AssetRequestContent user={user} />}
  </StaffPortalGate>
);

export default PublicAssetRequest;
