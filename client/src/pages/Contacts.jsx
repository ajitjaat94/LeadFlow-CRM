import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MdArchive,
  MdCall,
  MdDeleteOutline,
  MdEdit,
  MdEmail,
  MdEvent,
  MdFileDownload,
  MdFileUpload,
  MdLink,
  MdMerge,
  MdPersonAddAlt1,
  MdSearch,
  MdUnarchive,
} from "react-icons/md";
import * as XLSX from "xlsx";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import FollowUpModal from "../components/follow-ups/FollowUpModal";
import PhoneWhatsAppAction from "../components/PhoneWhatsAppAction";
import { formatFollowUpDate, getBrowserTimeZone, isFollowUpOverdue } from "../utils/followUpTime";
import {
  archiveContact,
  createContact,
  deleteContact,
  getContact,
  getContacts,
  getLeadFields,
  getLeads,
  getSettings,
  linkContactLead,
  mergeContacts as mergeContact,
  mergeDuplicateContactDetails,
  unlinkContactLead,
  updateContact,
} from "../services/api";

const emptyContact = {
  name: "",
  phone: "",
  email: "",
  company: "",
  designation: "",
  city: "",
  notes: "",
  tags: [],
  customFields: {},
};

const standardFields = ["name", "phone", "email", "company", "designation", "city", "notes", "tags"];
const fieldLabels = {
  name: "Name",
  phone: "Phone",
  email: "Email",
  company: "Company",
  designation: "Designation",
  city: "City",
  notes: "Notes",
  tags: "Tags",
};

const normalizeHeader = (value) => String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
const normalizeKey = (value) => normalizeHeader(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const compareFollowUps = (first, second) => `${first.scheduledDate}T${first.scheduledTime}`.localeCompare(`${second.scheduledDate}T${second.scheduledTime}`);

const getContactFollowUpSummary = (contactItem, timeZone) => {
  const pending = contactItem.pendingFollowUps
    || (contactItem.nextFollowUp ? [{ ...contactItem.nextFollowUp, status: "Pending" }] : []);
  const overdue = pending.filter((item) => isFollowUpOverdue(item, timeZone)).sort(compareFollowUps);
  const nextScheduled = pending.filter((item) => !isFollowUpOverdue(item, timeZone)).sort(compareFollowUps);
  return { overdue, nextScheduled: nextScheduled[0] || null };
};

const downloadWorkbook = (rows, filename, type) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Contacts");
  XLSX.writeFile(workbook, filename, { bookType: type });
};

const ContactForm = ({ contact, customFields, saving, error, duplicateMatches, onClose, onSave, onMergeDuplicate }) => {
  const [form, setForm] = useState(() => ({
    ...emptyContact,
    ...contact,
    tags: contact?.tags || [],
    customFields: contact?.customFields || {},
  }));
  const [tagsText, setTagsText] = useState((contact?.tags || []).join(", "));
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements?.length) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };
  const updateCustomField = (key, value) => {
    setForm((current) => ({ ...current, customFields: { ...current.customFields, [key]: value } }));
  };
  const submit = (event) => {
    event.preventDefault();
    onSave({ ...form, tags: [...new Set(tagsText.split(",").map((tag) => tag.trim()).filter(Boolean))] });
  };

  const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
  const basicFields = ["name", "phone", "email", "company", "designation", "city"];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 sm:p-5" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="contact-form-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Contact directory</p>
              <h2 id="contact-form-title" className="mt-1 text-xl font-bold text-slate-900">{contact?._id ? "Edit contact" : "Add contact"}</h2>
              <p className="mt-1 text-xs text-slate-500">Contact: a person whose details can be reused across opportunities.</p>
            </div>
            <button ref={closeButtonRef} type="button" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-white hover:text-slate-700" onClick={onClose} aria-label="Close">&times;</button>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {basicFields.map((field) => (
              <label key={field} className="text-xs font-semibold text-slate-600">
                {fieldLabels[field]}{field === "name" ? " *" : ""}
                <input className={inputClass} name={field} value={form[field] || ""} onChange={updateField} required={field === "name"} type={field === "email" ? "email" : "text"} maxLength={field === "email" ? 254 : 160} placeholder={`Enter ${fieldLabels[field].toLowerCase()}`} />
              </label>
            ))}
          </div>
          <label className="block text-xs font-semibold text-slate-600">Tags <span className="font-normal text-slate-400">(comma separated)</span>
            <input className={inputClass} value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Customer, Prospect, Partner" />
          </label>
          {customFields.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {customFields.map((field) => (
                <label key={field._id || field.id || field.key} className="text-xs font-semibold text-slate-600">
                  {field.name}
                  <input className={inputClass} value={String(form.customFields?.[field.key] ?? "")} onChange={(event) => updateCustomField(field.key, event.target.value)} />
                </label>
              ))}
            </div>
          )}
          <label className="block text-xs font-semibold text-slate-600">Notes
            <textarea className={`${inputClass} resize-y`} name="notes" rows="3" maxLength={10000} value={form.notes || ""} onChange={updateField} placeholder="Conversation context and useful details" />
          </label>
          {error && <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
          {duplicateMatches.length > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3" role="alert">
              <p className="text-sm font-bold text-amber-900">Possible duplicate contact</p>
              <p className="text-xs text-amber-800">Review the matching record and merge these details into it instead of creating a duplicate.</p>
              {duplicateMatches.map((duplicate) => (
                <div key={duplicate._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2.5">
                  <span className="min-w-0 text-xs text-slate-700"><strong>{duplicate.name}</strong>{duplicate.company ? ` · ${duplicate.company}` : ""}{duplicate.email ? ` · ${duplicate.email}` : ""}</span>
                  <button type="button" onClick={() => onMergeDuplicate(duplicate._id, form)} className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-amber-700"><MdMerge />Merge details</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{saving ? "Saving..." : contact?._id ? "Save contact" : "Create contact"}</button>
          </div>
        </form>
      </section>
    </div>
  );
};

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [timeZone, setTimeZone] = useState(getBrowserTimeZone);
  const [timeZoneError, setTimeZoneError] = useState("");
  const [customFields, setCustomFields] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [formContact, setFormContact] = useState(null);
  const [followUpLead, setFollowUpLead] = useState(null);
  const [linkLeadId, setLinkLeadId] = useState("");
  const [mergeContactId, setMergeContactId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [relatedDataError, setRelatedDataError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);

  const loadData = async (archived = showArchived) => {
    const [contactResult, leadResult, fieldsResult, settingsResult] = await Promise.allSettled([
      getContacts(archived),
      getLeads(),
      getLeadFields(),
      getSettings(),
    ]);

    if (contactResult.status === "fulfilled" && Array.isArray(contactResult.value)) {
      setContacts(contactResult.value);
      setLoadError("");
    } else {
      setLoadError("Unable to load contacts. Check your connection and retry.");
    }

    const relatedErrors = [];
    if (leadResult.status === "fulfilled" && Array.isArray(leadResult.value)) {
      setLeads(leadResult.value);
    } else {
      setLeads([]);
      relatedErrors.push("Linked leads are unavailable.");
    }
    if (fieldsResult.status === "fulfilled" && Array.isArray(fieldsResult.value)) {
      setCustomFields(fieldsResult.value);
    } else {
      setCustomFields([]);
      relatedErrors.push("Custom contact fields are unavailable.");
    }
    if (settingsResult.status === "fulfilled") {
      setTimeZone(settingsResult.value.workspace.timeZone || "Asia/Kolkata");
      setTimeZoneError("");
    } else {
      const browserTimeZone = getBrowserTimeZone();
      setTimeZone(browserTimeZone);
      setTimeZoneError(`Workspace timezone is unavailable; follow-up dates use your browser timezone (${browserTimeZone}).`);
    }
    setRelatedDataError(relatedErrors.join(" "));
    if (contactResult.status === "fulfilled") setError("");
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getContacts(showArchived), getLeads(), getLeadFields(), getSettings()])
      .then(([contactResult, leadResult, fieldsResult, settingsResult]) => {
        if (cancelled) return;
        if (contactResult.status === "fulfilled" && Array.isArray(contactResult.value)) {
          setContacts(contactResult.value);
          setLoadError("");
          setError("");
        } else {
          setLoadError("Unable to load contacts. Check your connection and retry.");
        }

        const relatedErrors = [];
        if (leadResult.status === "fulfilled" && Array.isArray(leadResult.value)) setLeads(leadResult.value);
        else {
          setLeads([]);
          relatedErrors.push("Linked leads are unavailable.");
        }
        if (fieldsResult.status === "fulfilled" && Array.isArray(fieldsResult.value)) setCustomFields(fieldsResult.value);
        else {
          setCustomFields([]);
          relatedErrors.push("Custom contact fields are unavailable.");
        }
        if (settingsResult.status === "fulfilled") {
          setTimeZone(settingsResult.value.workspace.timeZone || "Asia/Kolkata");
          setTimeZoneError("");
        } else {
          const browserTimeZone = getBrowserTimeZone();
          setTimeZone(browserTimeZone);
          setTimeZoneError(`Workspace timezone is unavailable; follow-up dates use your browser timezone (${browserTimeZone}).`);
        }
        setRelatedDataError(relatedErrors.join(" "));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [retryCount, showArchived]);

  const availableTags = useMemo(() => [...new Set(contacts.flatMap((item) => item.tags || []))].sort(), [contacts]);
  const companies = useMemo(() => [...new Set(contacts.map((item) => item.company).filter(Boolean))].sort(), [contacts]);
  const owners = useMemo(() => [...new Map(contacts.filter((item) => item.owner).map((item) => [item.owner._id, item.owner])).values()], [contacts]);
  const filteredContacts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return contacts.filter((item) => {
      const matchesSearch = !query || [item.name, item.phone, item.email].some((value) => value?.toLowerCase().includes(query));
      const matchesCompany = !companyFilter || item.company?.toLowerCase() === companyFilter.toLowerCase();
      const matchesOwner = !ownerFilter || item.owner?._id === ownerFilter;
      const matchesTag = !tagFilter || item.tags?.some((tag) => tag.toLowerCase() === tagFilter.toLowerCase());
      return matchesSearch && matchesCompany && matchesOwner && matchesTag;
    });
  }, [companyFilter, contacts, ownerFilter, searchTerm, tagFilter]);

  const hasActiveFilters = Boolean(searchTerm.trim() || companyFilter || ownerFilter || tagFilter);
  const clearFilters = () => {
    setSearchTerm("");
    setCompanyFilter("");
    setOwnerFilter("");
    setTagFilter("");
  };
  const retryLoad = () => {
    setLoading(true);
    setLoadError("");
    setRelatedDataError("");
    setRetryCount((count) => count + 1);
  };

  const openDetails = async (item) => {
    setSelectedContact({ ...item, loadingDetails: true });
    setLinkLeadId("");
    setMergeContactId("");
    try {
      setSelectedContact(await getContact(item._id));
    } catch (requestError) {
      setSelectedContact(item);
      setError(requestError.response?.data?.message || "Unable to load this contact.");
    }
  };

  const saveContact = async (values) => {
    setSaving(true);
    setError("");
    try {
      const saved = values._id ? await updateContact(values._id, values) : await createContact(values);
      setFormContact(null);
      setNotice(values._id ? "Contact updated." : "Contact added.");
      await loadData();
      if (selectedContact?._id === saved._id) setSelectedContact(saved);
    } catch (requestError) {
      const response = requestError.response?.data;
      if (response?.code === "CONTACT_DUPLICATE") {
        setFormContact((current) => ({ ...current, ...values, _id: current?._id }));
        setError(response.message);
        setDuplicateMatches(response.duplicates || []);
      } else {
        setError(response?.message || "Unable to save this contact.");
      }
    } finally {
      setSaving(false);
    }
  };

  const saveCorrectedContactPhone = async (item, phone) => {
    const saved = await updateContact(item._id, { ...item, phone });
    setContacts((current) => current.map((contact) => contact._id === saved._id ? { ...contact, ...saved } : contact));
    setSelectedContact((current) => current?._id === saved._id ? { ...current, ...saved } : current);
    setNotice("Phone number updated with the confirmed international country code.");
  };

  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const closeContactForm = useCallback(() => {
    setFormContact(null);
    setDuplicateMatches([]);
    setError("");
  }, []);
  const startEditing = (item) => {
    setError("");
    setDuplicateMatches([]);
    setFormContact(item || { ...emptyContact });
  };

  const mergeDuplicate = async (targetId, values) => {
    setSaving(true);
    setError("");
    try {
      const saved = formContact?._id
        ? await (async () => {
          await mergeContact(formContact._id, targetId);
          return updateContact(formContact._id, values);
        })()
        : await mergeDuplicateContactDetails(targetId, values);
      setFormContact(null);
      setDuplicateMatches([]);
      setNotice("Contact details merged successfully.");
      await loadData();
      if (selectedContact?._id === saved._id) await openDetails(saved);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to merge contact details.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (item) => {
    try {
      await archiveContact(item._id, !showArchived);
      setNotice(showArchived ? "Contact restored." : "Contact archived. Linked leads and history are kept.");
      setSelectedContact(null);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update this contact.");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.name}? This removes only the contact. Any linked leads and follow-ups will be kept.`)) return;
    try {
      await deleteContact(item._id);
      setNotice("Contact deleted. Linked records were kept.");
      setSelectedContact(null);
      await loadData();
    } catch (requestError) {
      const response = requestError.response?.data;
      if (response?.code === "CONTACT_LINKED") {
        const confirmLinked = window.confirm(
          `${item.name} is linked to ${response.linkedLeadCount} lead(s) and ${response.followUpCount} follow-up(s). Delete only the contact? Leads and follow-ups will remain.`
        );
        if (!confirmLinked) return;
        try {
          await deleteContact(item._id, true);
          setNotice("Contact deleted. Linked leads and follow-ups were kept.");
          setSelectedContact(null);
          await loadData();
        } catch (deleteError) {
          setError(deleteError.response?.data?.message || "Unable to delete this contact.");
        }
      } else {
        setError(response?.message || "Unable to delete this contact.");
      }
    }
  };

  const handleLinkLead = async () => {
    if (!selectedContact?._id || !linkLeadId) return;
    try {
      await linkContactLead(selectedContact._id, linkLeadId);
      setNotice("Lead linked to contact.");
      await loadData();
      await openDetails(selectedContact);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to link this lead.");
    }
  };

  const handleUnlinkLead = async (leadId) => {
    if (!selectedContact?._id || !window.confirm("Unlink this lead from the contact? The lead and its follow-ups will remain.")) return;
    try {
      await unlinkContactLead(selectedContact._id, leadId);
      await openDetails(selectedContact);
      await loadData();
      setNotice("Lead unlinked. The lead and its follow-ups were kept.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to unlink this lead.");
    }
  };

  const handleMerge = async () => {
    if (!selectedContact?._id || !mergeContactId) return;
    const source = contacts.find((item) => item._id === mergeContactId);
    if (!source || !window.confirm(`Merge ${source.name} into ${selectedContact.name}? Linked leads and history will be preserved on the primary contact.`)) return;
    try {
      await mergeContact(selectedContact._id, mergeContactId);
      setNotice("Contacts merged. The duplicate is archived and its linked leads are preserved.");
      setMergeContactId("");
      await loadData();
      await openDetails({ ...selectedContact, ...source, _id: selectedContact._id });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to merge these contacts.");
    }
  };

  const exportRows = () => {
    const fields = customFields.filter((field) => field.key && !standardFields.includes(field.key));
    const headers = [...standardFields.map((field) => fieldLabels[field]), ...fields.map((field) => field.name)];
    const rows = filteredContacts.map((item) => [
      item.name, item.phone, item.email, item.company, item.designation, item.city, item.notes,
      (item.tags || []).join(", "),
      ...fields.map((field) => item.customFields?.[field.key] ?? ""),
    ]);
    return [headers, ...rows];
  };

  const exportContacts = (type) => {
    if (!filteredContacts.length) {
      setError("There are no contacts in this view to export.");
      return;
    }
    const rows = exportRows();
    if (type === "csv") {
      const csv = rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "contacts.csv";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      downloadWorkbook(rows, "contacts.xlsx", "xlsx");
    }
    setNotice(`Exported ${filteredContacts.length} matching contact${filteredContacts.length === 1 ? "" : "s"} from the ${showArchived ? "archived" : "active"} view.`);
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    setError("");
    setNotice("");
    let imported = 0;
    let skipped = 0;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("The selected file has no worksheet.");
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
      if (!rows.length) throw new Error("The selected file has no contact rows.");
      for (const row of rows) {
        const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? "").trim()]));
        const findValue = (...keys) => keys.map((key) => normalized[key]).find(Boolean) || "";
        const name = findValue("name", "full name", "contact name");
        if (!name) {
          skipped += 1;
          continue;
        }
        const knownHeaders = new Set(["name", "full name", "contact name", "phone", "mobile", "phone number", "email", "email address", "company", "company name", "designation", "job title", "city", "notes", "tags"]);
        const custom = {};
        Object.entries(row).forEach(([header, value]) => {
          const normalizedHeader = normalizeHeader(header);
          if (knownHeaders.has(normalizedHeader)) return;
          const field = customFields.find((item) => normalizeHeader(item.name) === normalizedHeader || item.key === normalizeKey(header));
          if (field) custom[field.key] = String(value ?? "").trim();
        });
        const payload = {
          name,
          phone: findValue("phone", "mobile", "phone number"),
          email: findValue("email", "email address"),
          company: findValue("company", "company name"),
          designation: findValue("designation", "job title"),
          city: findValue("city"),
          notes: findValue("notes"),
          tags: findValue("tags").split(",").map((tag) => tag.trim()).filter(Boolean),
          customFields: custom,
        };
        try {
          await createContact(payload);
          imported += 1;
        } catch (requestError) {
          if (requestError.response?.data?.code === "CONTACT_DUPLICATE") skipped += 1;
          else throw requestError;
        }
      }
      setNotice(`Imported ${imported} contact(s); skipped ${skipped} duplicate or unnamed row(s).`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Unable to import this file.");
    } finally {
      setImporting(false);
    }
  };

  const availableLeads = leads.filter((lead) => !selectedContact?.leadIds?.some((id) => String(id) === String(lead._id)));
  const inputBase = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className={`crm-shell crm-dashboard-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => {
        if (window.innerWidth <= 760) setSidebarOpen(false);
      }} onToggle={() => setSidebarOpen((open) => !open)} />
      <main className="crm-main">
        <DashboardTopbar searchTerm={searchTerm} onSearchChange={setSearchTerm} onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />
        <div className="crm-page space-y-5">
          <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm shadow-blue-100/50 sm:flex sm:items-center sm:justify-between sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500" />
            <div className="relative">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Workspace / people</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contacts</h1>
                <span className="rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-bold text-blue-700">{loading ? "Loading" : loadError ? "Unavailable" : `${filteredContacts.length} matching / ${contacts.length} ${showArchived ? "archived" : "contacts"}`}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">People stay connected to your business, even when an opportunity is won or lost.</p>
              <p className="mt-1 text-xs text-slate-500">Contact: a reusable person record that can be linked to multiple leads and deals.</p>
            </div>
            <div className="relative mt-4 flex flex-wrap gap-2 sm:mt-0">
              <input ref={fileInputRef} className="hidden" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importFile} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing || loading || Boolean(loadError)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"><MdFileUpload />{importing ? "Importing..." : "Import contacts"}</button>
              <button type="button" onClick={() => exportContacts("csv")} disabled={loading || Boolean(loadError) || !filteredContacts.length} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"><MdFileDownload />Export CSV</button>
              <button type="button" onClick={() => exportContacts("xlsx")} disabled={loading || Boolean(loadError) || !filteredContacts.length} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"><MdFileDownload />Export Excel</button>
              {!showArchived && <button type="button" onClick={() => startEditing(null)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"><MdPersonAddAlt1 />Add contact</button>}
            </div>
          </section>

          {loadError && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert"><span>{loadError}</span><button type="button" onClick={retryLoad} disabled={loading} className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-semibold hover:bg-rose-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">{loading ? "Retrying..." : "Retry"}</button></div>}
          {relatedDataError && !loadError && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert"><span>{relatedDataError} Some contact actions may be unavailable.</span><button type="button" onClick={retryLoad} disabled={loading} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold hover:bg-amber-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">{loading ? "Retrying..." : "Retry"}</button></div>}
          {timeZoneError && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">{timeZoneError}</p>}

          {(error || notice) && (
            <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`} role={error ? "alert" : "status"}>
              <span>{error || notice}</span>
              <button type="button" className="font-bold" onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss message">&times;</button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-sm font-bold text-slate-900">{showArchived ? "Archived contacts" : "All contacts"}</h2><p className="mt-0.5 text-xs text-slate-600">{loading ? "Loading contacts..." : loadError ? "Contact counts unavailable." : `Showing ${filteredContacts.length} matching of ${contacts.length} contacts.`}</p></div>
                <button type="button" onClick={() => { setLoading(true); setLoadError(""); setShowArchived((value) => !value); setCompanyFilter(""); setOwnerFilter(""); setTagFilter(""); setSearchTerm(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{showArchived ? <MdUnarchive /> : <MdArchive />}{showArchived ? "Active contacts" : "View archived"}</button>
              </div>
              {contacts.length > 0 && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(130px,190px))]">
                <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-blue-400 focus-within:bg-white">
                  <MdSearch size={18} /><input className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search name, phone, email" aria-label="Search contacts" />
                </label>
                {companies.length > 0 && <select className={inputBase} value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} aria-label="Filter by company"><option value="">All companies</option>{companies.map((company) => <option key={company} value={company}>{company}</option>)}</select>}
                {owners.length > 0 && <select className={inputBase} value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} aria-label="Filter by owner"><option value="">All owners</option>{owners.map((owner) => <option key={owner._id} value={owner._id}>{owner.username || owner.email || "Owner"}</option>)}</select>}
                {availableTags.length > 0 && <select className={inputBase} value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} aria-label="Filter by tag"><option value="">All tags</option>{availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>}
                {hasActiveFilters && <button type="button" onClick={clearFilters} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Clear filters</button>}
                <p className="self-center text-xs text-slate-600">Exports include these matching contacts from the {showArchived ? "archived" : "active"} view.</p>
              </div>}
            </div>
            {loading ? <p className="px-5 py-14 text-center text-sm text-slate-600" role="status">Loading contacts...</p>
              : loadError ? null
                : contacts.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600"><MdPersonAddAlt1 size={22} /></span>
                    <h3 className="mt-3 text-sm font-bold text-slate-900">{showArchived ? "No archived contacts" : "No contacts yet"}</h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{showArchived ? "Archived contacts appear here and can be restored." : "Add a contact or import your existing CSV or Excel directory."}</p>
                    {!showArchived && <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <button type="button" onClick={() => startEditing(null)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><MdPersonAddAlt1 />Add contact</button>
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><MdFileUpload />Import contacts</button>
                    </div>}
                  </div>
                )
              : filteredContacts.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600"><MdPersonAddAlt1 size={22} /></span>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">No matching contacts</h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">Try another search or clear the selected filters.</p>
                  <button type="button" onClick={clearFilters} className="mt-4 min-h-10 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Clear filters</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] border-collapse text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Contact</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Phone / email</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Next follow-up</th><th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredContacts.map((item) => (
                        <tr key={item._id} className="align-middle transition hover:bg-blue-50/30">
                          <td className="px-5 py-3.5">
                            <button type="button" onClick={() => openDetails(item)} className="flex min-w-0 items-center gap-3 text-left">
                              <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-sm font-bold text-blue-700">{item.name?.slice(0, 1).toUpperCase() || "C"}</span>
                              <span className="min-w-0"><strong className="block max-w-[190px] truncate text-sm text-slate-900">{item.name}</strong><span className="block text-[11px] text-slate-500">{item.designation || "Contact"}{item.city ? ` · ${item.city}` : ""}</span></span>
                            </button>
                            <div className="mt-1 flex flex-wrap gap-1 pl-[52px]">{(item.tags || []).slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-700">{tag}</span>)}</div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">{item.company || "—"}</td>
                          <td className="px-4 py-3.5"><span className="block text-xs text-slate-700">{item.phone || "No phone"}</span><span className="mt-1 block max-w-[190px] truncate text-[11px] text-slate-500">{item.email || "No email"}</span></td>
                          <td className="px-4 py-3.5 text-xs text-slate-600">{item.owner?.username || item.owner?.email || "You"}</td>
                          <td className="px-4 py-3.5 text-xs text-slate-600">
                            {(() => {
                              const summary = getContactFollowUpSummary(item, timeZone);
                              return summary.overdue.length || summary.nextScheduled ? (
                                <div className="space-y-2">
                                  {summary.overdue.length > 0 && <div><span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-800">Overdue{summary.overdue.length > 1 ? ` · ${summary.overdue.length}` : ""}</span><span className="mt-1 block font-semibold text-slate-700">{summary.overdue[0].type}</span><span>{formatFollowUpDate(summary.overdue[0].scheduledDate)} · {summary.overdue[0].scheduledTime} ({timeZone})</span></div>}
                                  {summary.nextScheduled && <div><span className="block font-semibold text-blue-700">Next scheduled</span><span className="block text-slate-700">{summary.nextScheduled.type}</span><span>{formatFollowUpDate(summary.nextScheduled.scheduledDate)} · {summary.nextScheduled.scheduledTime} ({timeZone})</span></div>}
                                </div>
                              ) : "None pending";
                            })()}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                              {item.phone && <a className="grid h-8 w-8 place-items-center rounded-lg text-emerald-700 hover:bg-emerald-50" href={`tel:${item.phone}`} aria-label={`Call ${item.name}`} title="Call"><MdCall /></a>}
                              {item.phone && <PhoneWhatsAppAction name={item.name} phone={item.phone} compact onSavePhone={(phone) => saveCorrectedContactPhone(item, phone)} />}
                              {item.email && <a className="grid h-8 w-8 place-items-center rounded-lg text-blue-700 hover:bg-blue-50" href={`mailto:${item.email}`} aria-label={`Email ${item.name}`} title="Email"><MdEmail /></a>}
                              <button type="button" onClick={() => openDetails(item)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={`Open ${item.name}`} title="View"><MdLink /></button>
                              <button type="button" onClick={() => startEditing(item)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={`Edit ${item.name}`} title="Edit"><MdEdit /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </section>
        </div>
      </main>

      {formContact && (
        <ContactForm
          key={formContact._id || "new"}
          contact={formContact}
          customFields={customFields}
          saving={saving}
          error={error}
          duplicateMatches={duplicateMatches}
          onClose={closeContactForm}
          onSave={saveContact}
          onMergeDuplicate={mergeDuplicate}
        />
      )}

      {selectedContact && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40" role="presentation" onMouseDown={() => setSelectedContact(null)}>
          <section className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="contact-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-white text-lg font-bold text-blue-700 shadow-sm">{selectedContact.name?.slice(0, 1).toUpperCase() || "C"}</span>
                  <div className="min-w-0"><h2 id="contact-detail-title" className="truncate text-xl font-bold text-slate-900">{selectedContact.name}</h2><p className="mt-0.5 text-sm text-slate-600">{[selectedContact.designation, selectedContact.company, selectedContact.city].filter(Boolean).join(" · ") || "Contact"}</p><p className="mt-1 text-[11px] text-slate-500">Owner: {selectedContact.owner?.username || selectedContact.owner?.email || "You"}</p></div>
                </div>
                <button type="button" onClick={() => setSelectedContact(null)} className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close details">&times;</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedContact.phone && <a className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700" href={`tel:${selectedContact.phone}`}><MdCall />Call</a>}
                {selectedContact.phone && <PhoneWhatsAppAction name={selectedContact.name} phone={selectedContact.phone} onSavePhone={(phone) => saveCorrectedContactPhone(selectedContact, phone)} />}
                {selectedContact.email && <a className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700" href={`mailto:${selectedContact.email}`}><MdEmail />Email</a>}
                <button type="button" onClick={() => startEditing(selectedContact)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><MdEdit />Edit</button>
                <button type="button" onClick={() => handleArchive(selectedContact)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700">{showArchived ? <MdUnarchive /> : <MdArchive />}{showArchived ? "Restore" : "Archive"}</button>
                <button type="button" onClick={() => handleDelete(selectedContact)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700"><MdDeleteOutline />Delete</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">{(selectedContact.tags || []).map((tag) => <span key={tag} className="rounded-full border border-blue-100 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-blue-700">{tag}</span>)}</div>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
              <section>
                <h3 className="text-sm font-bold text-slate-900">Contact information</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[["Phone", selectedContact.phone], ["Email", selectedContact.email], ["Company", selectedContact.company], ["Designation", selectedContact.designation], ["City", selectedContact.city]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm text-slate-700">{value || "—"}</p></div>)}
                  {customFields.map((field) => <div key={field._id || field.key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{field.name}</p><p className="mt-1 break-words text-sm text-slate-700">{String(selectedContact.customFields?.[field.key] ?? "—")}</p></div>)}
                </div>
                <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Notes</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{selectedContact.notes || "No notes yet."}</p></div>
              </section>

              <section className="rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><h3 className="text-sm font-bold text-slate-900">Linked leads</h3><p className="mt-0.5 text-xs text-slate-500">Lead status tracks qualification; deal outcomes stay on their individual deals.</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{selectedContact.linkedLeads?.length || 0}</span></div>
                {selectedContact.loadingDetails ? <p className="p-4 text-xs text-slate-500">Loading linked records...</p> : (selectedContact.linkedLeads || []).length === 0 ? <p className="p-4 text-xs text-slate-500">No linked leads. Link an existing lead below.</p> : (
                  <div className="divide-y divide-slate-100">{selectedContact.linkedLeads.map((lead) => <div key={lead._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{lead.name}</p><p className="text-xs text-slate-500">{lead.company} · <span className="font-semibold">{["Won", "Lost"].includes(lead.status) ? `${lead.status} (legacy)` : lead.status}</span></p></div><div className="flex items-center gap-2"><button type="button" onClick={() => { setLinkLeadId(""); setFollowUpLead(lead); }} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-700"><MdEvent />Follow-up</button><button type="button" onClick={() => handleUnlinkLead(lead._id)} className="text-xs font-semibold text-slate-500 hover:text-rose-600">Unlink</button></div></div>)}</div>
                )}
                <div className="flex flex-col gap-2 border-t border-slate-100 p-3 sm:flex-row">
                  <select className={`${inputBase} min-w-0 flex-1`} value={linkLeadId} onChange={(event) => setLinkLeadId(event.target.value)} aria-label="Choose existing lead to link"><option value="">Choose an existing lead</option>{availableLeads.map((lead) => <option key={lead._id} value={lead._id}>{lead.name} · {lead.company}</option>)}</select>
                  <button type="button" onClick={handleLinkLead} disabled={!linkLeadId} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">Link lead</button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><h3 className="text-sm font-bold text-slate-900">Follow-ups & activity</h3><p className="mt-0.5 text-xs text-slate-500">Scheduled activity from linked leads and contact history.</p></div></div>
                <div className="divide-y divide-slate-100">
                  {[...(selectedContact.followUps || []).map((item) => ({ ...item, activityType: "follow-up", activityDate: `${item.scheduledDate}T${item.scheduledTime || "00:00"}`, detail: `${item.type} · ${item.status}${item.note ? ` · ${item.note}` : ""}` })), ...(selectedContact.activities || []).map((item) => ({ ...item, activityType: item.type, activityDate: item.createdAt, detail: item.description }))].sort((a, b) => new Date(b.activityDate || b.createdAt || 0) - new Date(a.activityDate || a.createdAt || 0)).map((item, index) => <div key={`${item.activityType}-${item._id || item.createdAt}-${index}`} className="flex gap-3 px-4 py-3"><span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${item.activityType === "follow-up" ? "bg-blue-500" : "bg-violet-500"}`} /><div><p className="text-xs font-semibold text-slate-700">{item.detail}</p><p className="mt-0.5 text-[10px] text-slate-400">{item.activityType === "follow-up" ? `${formatFollowUpDate(item.scheduledDate)} · ${item.scheduledTime || "00:00"} (${timeZone})` : new Date(item.activityDate || item.createdAt).toLocaleString()}</p></div></div>)}
                  {(selectedContact.followUps || []).length === 0 && (selectedContact.activities || []).length === 0 && <p className="p-4 text-xs text-slate-500">No activity recorded yet.</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                <h3 className="text-sm font-bold text-slate-900">Merge duplicate contacts</h3>
                <p className="mt-1 text-xs text-slate-500">The selected contact is archived after merge. All linked leads and history move to this contact.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select className={`${inputBase} min-w-0 flex-1`} value={mergeContactId} onChange={(event) => setMergeContactId(event.target.value)} aria-label="Choose duplicate contact"><option value="">Choose duplicate contact</option>{contacts.filter((item) => item._id !== selectedContact._id).map((item) => <option key={item._id} value={item._id}>{item.name}{item.email ? ` · ${item.email}` : ""}</option>)}</select>
                  <button type="button" onClick={handleMerge} disabled={!mergeContactId} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"><MdMerge />Merge into this contact</button>
                </div>
              </section>
            </div>
          </section>
        </div>
      )}

      {followUpLead && <FollowUpModal lead={followUpLead} timeZone={timeZone} onClose={() => setFollowUpLead(null)} onSaved={() => { setFollowUpLead(null); setNotice("Follow-up scheduled."); openDetails(selectedContact); }} />}
    </div>
  );
};

export default Contacts;
