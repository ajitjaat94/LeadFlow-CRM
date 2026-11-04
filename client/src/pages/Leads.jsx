import { useEffect, useRef, useState } from "react";
import { MdFileDownload, MdFileUpload, MdLink, MdSearch } from "react-icons/md";
import * as XLSX from "xlsx";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import LeadTable from "../components/LeadTable";
import FollowUpModal from "../components/follow-ups/FollowUpModal";
import { LEAD_STATUSES } from "../data/leadStatuses";
import { createLead, createLeadField, deleteLead, getLeadFields, getLeads, getSettings, updateLead } from "../services/api";
import { getBrowserTimeZone } from "../utils/followUpTime";

const exportHeaders = ["Name", "Company", "Email", "Phone", "Source", "Status", "Notes"];
const PAGE_SIZE = 10;
const headerAliases = {
  name: ["name", "full name", "lead name", "contact name", "customer name", "first name", "client", "client name", "company / client", "business / client"],
  company: ["company", "company name", "organization", "organisation", "business", "business name"],
  email: ["email", "email address", "e-mail", "e mail", "mail"],
  phone: ["phone", "phone number", "mobile", "mobile number", "contact number", "telephone", "email / phone", "phone / email"],
  source: ["source", "lead source", "origin", "acquisition source"],
  status: ["status", "lead status", "stage", "pipeline stage"],
  notes: ["notes", "note", "comments", "description", "remarks"],
};

const escapeCsvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const normalizeHeader = (value) => String(value ?? "")
  .replace(/^\uFEFF/, "")
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, " ")
  .replace(/\s+/g, " ");

const customFieldKey = (value, index) => normalizeHeader(value)
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "") || `column_${index + 1}`;

const getHeaderRow = (rows) => {
  let bestIndex = 0;
  let bestScore = -1;
  rows.slice(0, 30).forEach((row, index) => {
    const score = row.reduce((total, cell) => {
      const header = normalizeHeader(cell);
      return total + (Object.values(headerAliases).some((aliases) => aliases.includes(header)) ? 2 : 0);
    }, 0) + (row.filter((cell) => String(cell ?? "").trim()).length > 2 ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];
    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
};

const rowsFromWorkbook = (workbook) => {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "", raw: false });
};

const googleSheetCsvUrl = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid Google Sheets link.");
  }
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com") {
    throw new Error("Enter a Google Sheets link that starts with https://docs.google.com/.");
  }
  const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) throw new Error("This link does not look like a Google Sheets spreadsheet.");
  const gid = url.searchParams.get("gid") || url.hash.match(/gid=(\d+)/)?.[1] || "0";
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${encodeURIComponent(gid)}`;
};

const Leads = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [timeZone, setTimeZone] = useState(getBrowserTimeZone);
  const [timeZoneError, setTimeZoneError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [fieldsError, setFieldsError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [customFields, setCustomFields] = useState([]);
  const [followUpLead, setFollowUpLead] = useState(null);
  const [followUpSuccess, setFollowUpSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [sheetsDialogOpen, setSheetsDialogOpen] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const closeSidebarOnMobile = () => {
      if (window.innerWidth <= 760) setSidebarOpen(false);
    };
    window.addEventListener("resize", closeSidebarOnMobile);
    return () => window.removeEventListener("resize", closeSidebarOnMobile);
  }, []);

  useEffect(() => {
    let active = true;

    Promise.allSettled([getLeads(), getLeadFields(), getSettings()])
      .then(([leadResult, fieldResult, settingsResult]) => {
        if (!active) return;
        if (leadResult.status === "fulfilled" && Array.isArray(leadResult.value)) {
          const savedLead = location.state?.savedLead;
          const serverLeads = leadResult.value;
          setLeads(savedLead
            ? [savedLead, ...serverLeads.filter((lead) => lead._id !== savedLead._id)]
            : serverLeads);
        } else {
          setLeads([]);
          setLoadError("Unable to load leads. Check your connection and retry.");
        }

        if (fieldResult.status === "fulfilled" && Array.isArray(fieldResult.value)) {
          setCustomFields(fieldResult.value);
        } else {
          setCustomFields([]);
          setFieldsError("Custom fields could not be loaded. Retry to see all lead details.");
        }
        if (settingsResult.status === "fulfilled") {
          setTimeZone(settingsResult.value.workspace.timeZone || "Asia/Kolkata");
          setTimeZoneError("");
        } else {
          const browserTimeZone = getBrowserTimeZone();
          setTimeZone(browserTimeZone);
          setTimeZoneError(`Workspace timezone is unavailable; follow-up dates use your browser timezone (${browserTimeZone}).`);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [location.state?.savedLead, retryCount]);

  const retryLoading = () => {
    setLoading(true);
    setLoadError("");
    setFieldsError("");
    setRetryCount((count) => count + 1);
  };

  useEffect(() => {
    if (!sheetsDialogOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !importing) setSheetsDialogOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sheetsDialogOpen, importing]);

  const showImportPrompt = Boolean(location.state?.openImport);
  const clearImportPrompt = () => navigate(location.pathname, { replace: true, state: {} });

  const openFilePicker = () => {
    setError("");
    fileInputRef.current?.click();
    if (showImportPrompt) clearImportPrompt();
  };

  const getLeadSource = (lead) => {
    const fields = lead.customFields instanceof Map ? Object.fromEntries(lead.customFields) : lead.customFields || {};
    const value = Object.entries(fields).find(([key]) => ["source", "lead_source"].includes(key.trim().toLowerCase().replace(/[\s-]+/g, "_")))?.[1];
    return String(lead.source || value || "").trim() || "Not recorded";
  };
  const sourceOptions = [...new Set(leads.map(getLeadSource))].sort((a, b) => a.localeCompare(b));
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredLeads = leads.filter((lead) => {
    const source = getLeadSource(lead);
    const matchesSearch = !normalizedSearch || [
      lead.name, lead.company, lead.email, lead.phone, lead.status, source,
    ].some((value) => String(value || "").toLocaleLowerCase().includes(normalizedSearch));
    return matchesSearch
      && (statusFilter === "All" || lead.status === statusFilter)
      && (sourceFilter === "All" || source === sourceFilter);
  });
  const pageCount = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleLeads = filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasActiveFilters = Boolean(normalizedSearch || statusFilter !== "All" || sourceFilter !== "All");
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setSourceFilter("All");
    setPage(1);
  };
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleDeleteLead = async (id) => {
    try {
      await deleteLead(id);
      setLeads((currentLeads) => currentLeads.filter((lead) => lead._id !== id));
    } catch {
      setError("Unable to delete this lead.");
    }
  };

  const handleStatusChange = async (id, status) => {
    const previousLead = leads.find((lead) => lead._id === id);
    if (!previousLead || previousLead.status === status) return;
    try {
      await updateLead(id, { status });
      setLeads((currentLeads) => currentLeads.map((lead) => lead._id === id ? { ...lead, status } : lead));
      setError("");
    } catch {
      setError("Unable to save the status change.");
    }
  };

  const getExportRows = () => {
    return [exportHeaders, ...filteredLeads.map((lead) => [lead.name, lead.company, lead.email, lead.phone, getLeadSource(lead), lead.status, lead.notes])];
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportCSV = () => {
    if (!filteredLeads.length) return;
    const rows = getExportRows();
    const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "leads.csv");
    setFollowUpSuccess(`Exported ${filteredLeads.length} matching lead${filteredLeads.length === 1 ? "" : "s"} as CSV.`);
  };

  const handleExportExcel = () => {
    if (!filteredLeads.length) return;
    const rows = getExportRows();
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    downloadBlob(XLSX.write(workbook, { bookType: "xlsx", type: "array" }), "leads.xlsx");
    setFollowUpSuccess(`Exported ${filteredLeads.length} matching lead${filteredLeads.length === 1 ? "" : "s"} as Excel.`);
  };

  const importRows = async (rows, sourceName) => {
    if (rows.length < 2) throw new Error(`The ${sourceName} must include a header row and at least one lead.`);

    const headerRowIndex = getHeaderRow(rows);
    const headerLabels = rows[headerRowIndex].map((header, index) => String(header ?? "").trim() || `Column ${index + 1}`);
    const sourceHeaders = headerLabels.map(normalizeHeader);
    const headers = sourceHeaders.map((header, index) => Object.entries(headerAliases).find(([, aliases]) => aliases.includes(header))?.[0] || header || `column_${index + 1}`);
    const requiredHeaders = ["name", "company", "email"];
    const standardHeaders = new Set(Object.keys(headerAliases));
    const importKeys = headers.map((header, index) => standardHeaders.has(header) ? header : customFieldKey(headerLabels[index], index));
    if (importKeys.some((key, index) => importKeys.indexOf(key) !== index)) {
      throw new Error(`The ${sourceName} has duplicate columns. Rename or remove duplicate headers and try again.`);
    }
    const missingHeaders = requiredHeaders.filter((required) => !headers.includes(required));
    if (missingHeaders.length) {
      throw new Error(`The ${sourceName} needs columns for name, company, and email. Missing: ${missingHeaders.join(", ")}.`);
    }

    const customHeaders = headerLabels.map((header, index) => customFieldKey(header, index));
    const importedFieldDefinitions = headerLabels
      .map((name, index) => ({ name, key: customHeaders[index], type: "text", required: false, order: index }))
      .filter((field, index) => !standardHeaders.has(headers[index]) && field.key);

    const existingKeys = new Set(customFields.map((field) => field.key));
    const createdFields = [];
    for (const field of importedFieldDefinitions) {
      if (existingKeys.has(field.key)) continue;
      try {
        const savedField = await createLeadField(field);
        createdFields.push(savedField);
        existingKeys.add(field.key);
      } catch (fieldError) {
        if (fieldError.response?.status === 409) {
          existingKeys.add(field.key);
          continue;
        }
        throw new Error(`Could not prepare the "${field.name}" custom field. No leads were imported; check the field and retry.`, { cause: fieldError });
      }
    }
    if (createdFields.length) setCustomFields((currentFields) => [...currentFields, ...createdFields]);

    const existingEmails = new Set(leads.map((lead) => String(lead.email || "").trim().toLowerCase()).filter(Boolean));
    const existingPhones = new Set(leads.map((lead) => String(lead.phone || "").replace(/\D/g, "")).filter((phone) => phone.length >= 7));
    const batchEmails = new Set();
    const batchPhones = new Set();
    const candidates = [];
    const skipped = [];
    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const sourceRow = rows[rowIndex] || [];
      if (!sourceRow.some((cell) => String(cell ?? "").trim())) continue;

      const row = Object.fromEntries(headers.map((header, index) => [header, String(sourceRow[index] ?? "").trim()]));
      const customFieldValues = Object.fromEntries(customHeaders
        .map((header, index) => [header, String(sourceRow[index] ?? "").trim()])
        .filter(([, value], index) => value && !standardHeaders.has(headers[index])));
      const sheetRow = rowIndex + 1;
      const missingValues = requiredHeaders.filter((required) => !row[required]);
      if (missingValues.length) {
        skipped.push(`row ${sheetRow}: missing ${missingValues.join(", ")}`);
        continue;
      }

      const email = row.email.toLowerCase();
      const phone = String(row.phone || "").replace(/\D/g, "");
      if (existingEmails.has(email) || batchEmails.has(email) || (phone.length >= 7 && (existingPhones.has(phone) || batchPhones.has(phone)))) {
        skipped.push(`row ${sheetRow}: duplicate email or phone`);
        continue;
      }

      const normalizedStatus = LEAD_STATUSES.find((status) => status.toLowerCase() === row.status.toLowerCase()) || "New";
      batchEmails.add(email);
      if (phone.length >= 7) batchPhones.add(phone);
      candidates.push({
        sheetRow,
        payload: {
          name: row.name,
          company: row.company,
          email: row.email,
          phone: row.phone,
          source: row.source,
          status: normalizedStatus,
          notes: row.notes,
          customFields: customFieldValues,
        },
      });
    }

    if (!candidates.length) {
      const detail = skipped.slice(0, 3).join("; ");
      throw new Error(`No leads were imported from the ${sourceName}.${detail ? ` ${detail}` : ""}`);
    }

    const importedLeads = [];
    const failures = [];
    for (const [index, candidate] of candidates.entries()) {
      setImportProgress(`Saving lead ${index + 1} of ${candidates.length}...`);
      try {
        const savedLead = await createLead(candidate.payload);
        if (!savedLead?._id) throw new Error("The server did not return the saved lead.");
        importedLeads.push(savedLead);
        existingEmails.add(candidate.payload.email.toLowerCase());
        const phone = String(candidate.payload.phone || "").replace(/\D/g, "");
        if (phone.length >= 7) existingPhones.add(phone);
      } catch {
        failures.push(`row ${candidate.sheetRow}: save failed`);
      }
    }

    if (importedLeads.length) {
      setLeads((currentLeads) => [...importedLeads.reverse(), ...currentLeads]);
      const summary = [`Imported ${importedLeads.length} lead${importedLeads.length === 1 ? "" : "s"} from ${sourceName}.`];
      if (skipped.length) summary.push(`${skipped.length} skipped`);
      if (failures.length) summary.push(`${failures.length} could not be saved`);
      setFollowUpSuccess(`${summary.join(" ")}${skipped.length || failures.length ? ` Review: ${[...skipped, ...failures].slice(0, 3).join("; ")}` : " All rows were saved."}`);
      return;
    }
    throw new Error(`No leads could be saved. ${failures.slice(0, 3).join("; ")}`);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setFollowUpSuccess("");
    setImporting(true);
    setImportProgress("Reading file...");
    try {
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      const rows = isCsv ? parseCsv(await file.text()) : rowsFromWorkbook(XLSX.read(await file.arrayBuffer(), { type: "array" }));
      await importRows(rows, isCsv ? "CSV file" : "Excel file");
    } catch (importError) {
      setError(importError.message || "Unable to import this file.");
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  };

  const handleImportGoogleSheet = async () => {
    setError("");
    setFollowUpSuccess("");
    setImporting(true);
    setImportProgress("Connecting to Google Sheets...");
    try {
      const response = await fetch(googleSheetCsvUrl(sheetsUrl.trim()));
      if (!response.ok) throw new Error("Google Sheet could not be read. Allow anyone with the link to view it or download it as CSV and use Import.");
      await importRows(parseCsv(await response.text()), "Google Sheet");
      setSheetsDialogOpen(false);
      setSheetsUrl("");
    } catch (importError) {
      const message = importError instanceof TypeError
        ? "Google Sheets could not be reached. Check that the sheet is shared publicly, or download it as CSV and use Import."
        : importError.message || "Unable to import this Google Sheet.";
      setError(message);
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  };

  return (
    <div className={`crm-shell crm-dashboard-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => {
        if (window.innerWidth <= 760) setSidebarOpen(false);
      }} onToggle={() => setSidebarOpen((open) => !open)} />
      <main className="crm-main">
        <DashboardTopbar searchTerm={searchTerm} onSearchChange={handleSearchChange} onAddLead={() => navigate("/leads/new")} onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />
        <div className="crm-page space-y-5">
          <section className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm shadow-blue-100/50 sm:flex-row sm:items-center sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500" />
            <div className="relative">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Workspace</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-bold text-blue-700 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {loading ? "Loading" : loadError ? "Unavailable" : `${leads.length} total`}
                </span>
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-600">Manage contacts, follow-ups, and sales opportunities.</p>
            </div>
            <div className="relative grid w-full grid-cols-2 gap-2 min-[520px]:flex min-[520px]:w-auto min-[520px]:flex-wrap min-[520px]:items-center min-[520px]:justify-end">
              <input ref={fileInputRef} className="hidden" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleImportFile} />
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:border-blue-700 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60" type="button" onClick={openFilePicker} disabled={importing}><MdFileUpload size={17} />{importing ? "Importing..." : "Import"}</button>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60" type="button" onClick={() => { setError(""); setSheetsDialogOpen(true); }} disabled={importing}><MdLink size={17} />Google Sheets</button>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={handleExportCSV} disabled={loading || !filteredLeads.length}><MdFileDownload size={17} />Export CSV</button>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={handleExportExcel} disabled={loading || !filteredLeads.length}><MdFileDownload size={17} />Export Excel</button>
            </div>
          </section>

          {showImportPrompt && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3" role="status" aria-label="Import leads">
              <p className="text-sm font-medium text-slate-800">Choose a CSV or Excel file to import leads.</p>
              <div className="flex gap-2">
                <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" onClick={openFilePicker}><MdFileUpload size={16} /> Choose file</button>
                <button type="button" className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" onClick={clearImportPrompt}>Cancel</button>
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">All leads</h2>
                <p className="mt-0.5 text-xs text-slate-600">{loading ? "Loading leads..." : loadError ? "Lead counts unavailable." : `Showing ${filteredLeads.length} matching of ${leads.length} leads.`}</p>
              </div>
              <label className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 sm:max-w-xs">
                <MdSearch size={18} />
                <input className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500" value={searchTerm} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Search leads..." aria-label="Search leads" />
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Status
                <select className="h-9 min-w-36 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-normal text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                  <option value="All">All statuses</option>
                  {LEAD_STATUSES.map((status) => <option key={status} value={status}>{["Won", "Lost"].includes(status) ? `${status} (legacy)` : status}</option>)}
                </select>
              </label>
              <p className="self-center text-xs text-slate-500">Won/Lost lead filters show historical statuses only; sales outcomes are tracked on deals.</p>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                Source
                <select className="h-9 min-w-36 max-w-56 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-normal text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setPage(1); }}>
                  <option value="All">All sources</option>
                  {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
              </label>
              {hasActiveFilters && <button type="button" onClick={clearFilters} className="min-h-9 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Clear filters</button>}
              <p className="ml-auto self-center text-xs text-slate-600">Exports include these matching leads.</p>
            </div>
            {importProgress && <p className="px-5 py-3 text-sm font-medium text-blue-700" role="status" aria-live="polite">{importProgress}</p>}
            {loadError && <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-5" role="alert"><span>{loadError}</span><button type="button" onClick={retryLoading} className="rounded-md border border-red-300 bg-white px-3 py-1.5 font-semibold text-red-800 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">Retry</button></div>}
            {fieldsError && <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-5" role="alert"><span>{fieldsError}</span><button type="button" onClick={retryLoading} className="rounded-md border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Retry</button></div>}
            {timeZoneError && <p className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-5" role="status">{timeZoneError}</p>}
            {error && <p className="mx-4 mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5" role="alert">{error}</p>}
            {followUpSuccess && <p className="mx-4 mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:mx-5" role="status">{followUpSuccess}</p>}
            {loading ? <p className="px-5 py-14 text-center text-sm text-slate-600" role="status">Loading leads...</p>
              : loadError ? null
                : leads.length === 0 ? <div className="px-5 py-10 text-center">
                  <h3 className="text-base font-semibold text-slate-900">No leads yet</h3>
                  <p className="mt-1 text-sm text-slate-600">Add your first lead or import your existing list.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={() => navigate("/leads/new")} className="min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Add lead</button>
                    <button type="button" onClick={openFilePicker} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Import leads</button>
                  </div>
                </div>
                  : filteredLeads.length === 0 ? <div className="px-5 py-10 text-center">
                    <h3 className="text-base font-semibold text-slate-900">No matching leads</h3>
                    <p className="mt-1 text-sm text-slate-600">Try another search or clear the selected filters.</p>
                    <button type="button" onClick={clearFilters} className="mt-4 min-h-10 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Clear filters</button>
                  </div>
                    : <LeadTable leads={visibleLeads} customFields={customFields} onView={(id) => navigate(`/lead/${id}`)} onFollowUp={setFollowUpLead} onEdit={(id) => navigate(`/lead/${id}/edit`)} onDelete={handleDeleteLead} onStatusChange={handleStatusChange} />}
            {!loading && !loadError && filteredLeads.length > PAGE_SIZE && (
              <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5" aria-label="Lead pages">
                <p className="text-xs text-slate-600">Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length}</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Previous</button>
                  <span className="text-xs text-slate-700" aria-live="polite">Page {currentPage} of {pageCount}</span>
                  <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Next</button>
                </div>
              </nav>
            )}
          </section>
        </div>
      </main>
      {sheetsDialogOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !importing) setSheetsDialogOpen(false); }}>
        <form className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="sheets-import-title" onSubmit={(event) => { event.preventDefault(); handleImportGoogleSheet(); }}>
          <h2 id="sheets-import-title" className="text-lg font-semibold text-slate-900">Import from Google Sheets</h2>
          <p className="mt-1 text-sm text-slate-600">Share the sheet so anyone with the link can view it. Include name, company, and email columns. If it will not load, download it as CSV and use Import.</p>
          <label htmlFor="google-sheet-url" className="mt-4 block text-sm font-semibold text-slate-800">Google Sheets link</label>
          <input id="google-sheet-url" type="url" required value={sheetsUrl} onChange={(event) => setSheetsUrl(event.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" autoFocus />
          {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
          {importProgress && <p className="mt-3 text-sm text-blue-700" role="status" aria-live="polite">{importProgress}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={importing} onClick={() => setSheetsDialogOpen(false)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Cancel</button>
            <button type="submit" disabled={importing} className="min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{importing ? "Importing..." : "Import sheet"}</button>
          </div>
        </form>
      </div>}
      {followUpLead && <FollowUpModal lead={followUpLead} leads={leads} leadsLoading={loading} leadsError={loadError} onRetryLeads={retryLoading} timeZone={timeZone} onClose={() => setFollowUpLead(null)} onSaved={() => { setFollowUpLead(null); setFollowUpSuccess("Follow-up scheduled successfully."); }} />}
    </div>
  );
};

export default Leads;
