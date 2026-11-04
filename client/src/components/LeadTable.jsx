import { useCallback, useEffect, useRef, useState } from "react";
import {
  MdCheck,
  MdDeleteOutline,
  MdEdit,
  MdEvent,
  MdKeyboardArrowDown,
  MdMoreVert,
  MdSearch,
  MdVisibility,
} from "react-icons/md";
import { createPortal } from "react-dom";
import { LEAD_QUALIFICATION_STATUSES } from "../data/leadStatuses";

const statusStyles = {
  New: "border-violet-200 bg-violet-50 text-violet-700",
  Contacted: "border-blue-200 bg-blue-50 text-blue-700",
  Qualified: "border-cyan-200 bg-cyan-50 text-cyan-800",
  Proposal: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Negotiation: "border-amber-200 bg-amber-50 text-amber-800",
  Won: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Lost: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusDotStyles = {
  New: "bg-purple-500",
  Contacted: "bg-blue-500",
  Qualified: "bg-cyan-500",
  Proposal: "bg-indigo-500",
  Negotiation: "bg-amber-500",
  Won: "bg-emerald-500",
  Lost: "bg-red-500",
};

const isLegacyLeadStatus = (status) => ["Won", "Lost"].includes(status);
const statusLabel = (status) => isLegacyLeadStatus(status) ? `${status} (legacy)` : status;

const StatusBadge = ({ status, onChange }) => {
  const style = statusStyles[status] || statusStyles.New;

  if (onChange) {
    return (
      <StatusPicker status={status} onChange={onChange} />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
};

const StatusPicker = ({ status, onChange }) => {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const pickerRef = useRef(null);
  const menuRef = useRef(null);

  const updateMenuPosition = () => {
    const button = pickerRef.current?.querySelector("button");
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, left: rect.left });
  };

  useEffect(() => {
    const closePicker = (event) => {
      if (!pickerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closePicker);
    return () => document.removeEventListener("mousedown", closePicker);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold font-mono transition hover:brightness-95 ${statusStyles[status] || statusStyles.New}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Change qualification status, currently ${statusLabel(status)}`}
      >
        <span className={`h-2 w-2 rounded-full ${statusDotStyles[status] || statusDotStyles.New}`} />
        {statusLabel(status)}
        <MdKeyboardArrowDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && createPortal(
        <div ref={menuRef} className="fixed z-[100] max-h-64 min-w-40 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" style={menuPosition} role="listbox">
          {LEAD_QUALIFICATION_STATUSES.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option === status}
              key={option}
              onClick={() => { onChange(option); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <span className={`h-2 w-2 rounded-full ${statusDotStyles[option]}`} />
              <span className="flex-1">{option}</span>
              {option === status && <MdCheck size={15} className="text-purple-600" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
};

const LeadActionMenu = ({ lead, onFollowUp, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const optionCount = Number(Boolean(onFollowUp)) + Number(Boolean(onEdit)) + Number(Boolean(onDelete));
  const options = [
    onFollowUp && { label: "Schedule follow-up", icon: MdEvent, action: () => onFollowUp(lead) },
    onEdit && { label: "Edit lead", icon: MdEdit, action: () => onEdit(lead._id) },
    onDelete && { label: "Delete lead", icon: MdDeleteOutline, action: () => onDelete(lead._id), destructive: true },
  ].filter(Boolean);

  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 190;
    const height = optionCount * 40 + 12;
    setPosition({
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      top: rect.bottom + height > window.innerHeight ? Math.max(8, rect.top - height) : rect.bottom + 4,
    });
  }, [optionCount]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!buttonRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    updatePosition();
    document.addEventListener("mousedown", closeOutside);
    window.addEventListener("keydown", closeEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("keydown", closeEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  if (!options.length) return null;
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        aria-label={`More actions for ${lead.name || "lead"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MdMoreVert size={19} />
      </button>
      {open && createPortal(
        <div ref={menuRef} role="menu" aria-label={`Actions for ${lead.name || "lead"}`} className="fixed z-[110] min-w-[190px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" style={position}>
          {options.map(({ label, icon: Icon, action, destructive }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => { action(); setOpen(false); }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${destructive ? "text-rose-700" : "text-slate-700"}`}
            >
              <Icon size={16} aria-hidden="true" />{label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
};

const LeadTable = ({ leads = [], customFields = [], onView, onFollowUp, onEdit, onDelete, onStatusChange }) => {
  const renderLeadDetails = (lead) => (
    <div className="grid grid-cols-1 gap-2">
      <div className="min-w-0 rounded-lg border border-blue-100 bg-white px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">Notes</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-700 [overflow-wrap:anywhere]">{lead.notes || "No notes added"}</p>
      </div>
      {customFields.map((field) => (
        <div key={field.id || field._id} className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{field.name}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-700 [overflow-wrap:anywhere]">{String(lead.customFields?.[field.key] ?? "-")}</p>
        </div>
      ))}
    </div>
  );

  const renderActions = (lead, compact = false) => (
    <div className={`flex items-center ${compact ? "justify-start gap-2" : "justify-end gap-1.5"}`}>
      {onView && (
        <button type="button" onClick={() => onView(lead._id)} aria-label="View lead" title="View lead" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
          <MdVisibility size={16} aria-hidden="true" />
          <span className={compact ? "hidden min-[420px]:inline" : ""}>View</span>
        </button>
      )}
      <LeadActionMenu lead={lead} onFollowUp={onFollowUp} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );

  return (
    <div className="w-full">
      <div className="crm-lead-table-desktop hidden w-full max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-[940px] table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[25%]" />
            <col className="w-[12%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Lead</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Company</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Notes &amp; custom fields</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <tr key={lead._id} className="align-top transition hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <div className="flex min-w-[150px] items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                      {lead.name?.slice(0, 1).toUpperCase() || "L"}
                    </span>
                    <span title={lead.name || "Unnamed lead"} className="max-w-[200px] truncate text-sm font-semibold text-slate-900">{lead.name || "Unnamed lead"}</span>
                  </div>
                </td>
                <td className="max-w-[190px] px-4 py-4 text-sm text-slate-700"><span title={lead.company || ""} className="block truncate">{lead.company || "-"}</span></td>
                <td className="max-w-[230px] px-4 py-4">
                  <span title={lead.email || ""} className="block truncate text-sm text-slate-700">{lead.email || "-"}</span>
                  <span title={lead.phone || ""} className="mt-1 block truncate text-xs text-slate-600">{lead.phone || "No phone"}</span>
                </td>
                <td className="px-4 py-4">
                  <details className="group w-full min-w-0">
                    <summary className="cursor-pointer list-none text-xs font-medium text-blue-700 hover:text-blue-800">
                      <span className="group-open:hidden">View details</span>
                      <span className="hidden group-open:inline">Hide details</span>
                    </summary>
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-blue-100 bg-blue-50/60 p-2.5">
                      {renderLeadDetails(lead)}
                    </div>
                  </details>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={lead.status} onChange={onStatusChange ? (nextStatus) => onStatusChange(lead._id, nextStatus) : undefined} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end">{renderActions(lead)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="crm-lead-table-cards divide-y divide-slate-100 md:hidden">
        {leads.map((lead) => (
          <article key={lead._id} className="p-4 transition hover:bg-slate-50/80 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                  {lead.name?.slice(0, 1).toUpperCase() || "L"}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{lead.name || "Unnamed lead"}</h3>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{lead.company || "No company"}</p>
                </div>
              </div>
              <StatusBadge status={lead.status} onChange={onStatusChange ? (nextStatus) => onStatusChange(lead._id, nextStatus) : undefined} />
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <p className="truncate text-slate-700" title={lead.email}>{lead.email || "No email"}</p>
              <p className="text-slate-700">{lead.phone || "No phone"}</p>
            </div>

            {(lead.notes || customFields.length > 0) && (
              <details className="group mt-3 overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/60">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100/60">
                  <span className="group-open:hidden">Show notes and additional fields</span>
                  <span className="hidden group-open:inline">Hide notes and additional fields</span>
                  <MdKeyboardArrowDown size={18} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-blue-100 p-2.5">{renderLeadDetails(lead)}</div>
              </details>
            )}

            <div className="mt-4 border-t border-slate-100 pt-3">{renderActions(lead, true)}</div>
          </article>
        ))}
      </div>

      {leads.length === 0 && (
        <div className="px-5 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
            <MdSearch size={22} />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-slate-800">No leads found</h3>
          <p className="mt-1 text-xs text-slate-500">Try another search or add a new lead to get started.</p>
        </div>
      )}
    </div>
  );
};

export default LeadTable;
