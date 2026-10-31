import { useEffect, useRef, useState } from "react";
import { MdFileDownload, MdFileUpload, MdLink, MdSearch } from "react-icons/md";
import * as XLSX from "xlsx";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import LeadTable from "../components/LeadTable";
import FollowUpModal from "../components/follow-ups/FollowUpModal";
import { createLead, createLeadField, deleteLead, getLeadFields, getLeads, updateLead } from "../services/api";

const exportHeaders = ["Name", "Company", "Email", "Phone", "Status", "Notes"];
const validStatuses = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
const headerAliases = {
  name: ["name", "full name", "lead name", "contact name", "customer name", "first name", "client", "client name", "company / client", "business / client"],
  company: ["company", "company name", "organization", "organisation", "business", "business name"],
  email: ["email", "email address", "e-mail", "e mail", "mail"],
  phone: ["phone", "phone number", "mobile", "mobile number", "contact number", "telephone", "email / phone", "phone / email"],
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
  const url = new URL(value);
  const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match || !url.hostname.endsWith("google.com")) throw new Error("Paste a valid Google Sheets URL.");
  const gid = url.searchParams.get("gid") || url.hash.match(/gid=(\d+)/)?.[1] || "0";
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
};

const Leads = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [customFields, setCustomFields] = useState([]);
  const [followUpLead, setFollowUpLead] = useState(null);
  const [followUpSuccess, setFollowUpSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const fileInputRef = useRef(null);

  useEffect(() => {
    Promise.all([getLeads(), getLeadFields()])
      .then(([leadData, fieldData]) => {
        setCustomFields(fieldData || []);
        const serverLeads = leadData || [];
        const savedLead = location.state?.savedLead;
        if (!savedLead) {
          setLeads(serverLeads);
          return;
        }

        setLeads([savedLead, ...serverLeads.filter((lead) => lead._id !== savedLead._id)]);
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch((error) => {
        if (error.response?.status !== 401) setError("Unable to load leads. Please check your API connection.");
      })
      .finally(() => setLoading(false));
  }, [location.state?.savedLead]);
  const filteredLeads = leads.filter((lead) =>
    [lead.name, lead.company, lead.email, lead.phone, lead.status]
      .some((value) => value?.toLowerCase().includes(searchTerm.toLowerCase())),
  );

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
    setLeads((currentLeads) => currentLeads.map((lead) => lead._id === id ? { ...lead, status } : lead));
    try {
      await updateLead(id, { status });
    } catch {
      setLeads((currentLeads) => currentLeads.map((lead) => lead._id === id ? { ...lead, status: previousLead.status } : lead));
      setError("Unable to save the status change.");
    }
  };

  const getExportRows = () => {
    if (!leads.length) {
      setError("There are no leads to export.");
      return null;
    }
    return [exportHeaders, ...leads.map((lead) => [lead.name, lead.company, lead.email, lead.phone, lead.status, lead.notes])];
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const rows = getExportRows();
    if (!rows) return;
    const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "leads.csv");
  };

  const handleExportExcel = () => {
    const rows = getExportRows();
    if (!rows) return;
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    downloadBlob(XLSX.write(workbook, { bookType: "xlsx", type: "array" }), "leads.xlsx");
  };

  const importRows = async (rows, sourceName) => {
    if (rows.length < 2) throw new Error(`The ${sourceName} must include a header row and at least one lead.`);

    const headerRowIndex = getHeaderRow(rows);
    const headerLabels = rows[headerRowIndex].map((header, index) => String(header ?? "").trim() || `Column ${index + 1}`);
    const sourceHeaders = headerLabels.map(normalizeHeader);
    const headers = sourceHeaders.map((header, index) => Object.entries(headerAliases).find(([, aliases]) => aliases.includes(header))?.[0] || header || `column_${index + 1}`);
    const customHeaders = headerLabels.map((header, index) => customFieldKey(header, index));
    const standardHeaders = new Set(Object.keys(headerAliases));
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
        if (fieldError.response?.status !== 409) throw fieldError;
      }
    }
    if (createdFields.length) setCustomFields((currentFields) => [...currentFields, ...createdFields]);

    const importedLeads = [];
    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const sourceRow = rows[rowIndex] || [];
      if (!sourceRow.some((cell) => String(cell ?? "").trim())) continue;

      const row = Object.fromEntries(headers.map((header, index) => [header, String(sourceRow[index] ?? "").trim()]));
      const customFieldValues = Object.fromEntries(customHeaders.map((header, index) => [header, String(sourceRow[index] ?? "").trim()]).filter(([, value]) => value));
      const fallbackName = Object.values(row).find((value) => value) || `Imported lead ${rowIndex}`;
      const company = row.company || "Imported Leads";
      const email = row.email || `imported-${Date.now()}-${rowIndex}@leadflow.local`;
      const status = validStatuses.includes(row.status) ? row.status : "New";
      importedLeads.push(await createLead({ name: row.name || fallbackName, company, email, phone: row.phone, status, notes: row.notes, customFields: customFieldValues }));
    }

    setLeads((currentLeads) => [...importedLeads.reverse(), ...currentLeads]);
    setFollowUpSuccess(`Imported ${importedLeads.length} lead${importedLeads.length === 1 ? "" : "s"} from ${sourceName}. All source columns were preserved as custom fields.`);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setFollowUpSuccess("");
    setImporting(true);
    try {
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      const rows = isCsv ? parseCsv(await file.text()) : rowsFromWorkbook(XLSX.read(await file.arrayBuffer(), { type: "array" }));
      await importRows(rows, isCsv ? "CSV file" : "Excel file");
    } catch (importError) {
      setError(importError.message || "Unable to import this file.");
    } finally {
      setImporting(false);
    }
  };

  const handleImportGoogleSheet = async () => {
    const input = window.prompt("Paste a public or published Google Sheets URL:");
    if (!input?.trim()) return;

    setError("");
    setFollowUpSuccess("");
    setImporting(true);
    try {
      const response = await fetch(googleSheetCsvUrl(input.trim()));
      if (!response.ok) throw new Error("Google Sheet could not be read. Publish it or allow anyone with the link to view it.");
      await importRows(parseCsv(await response.text()), "Google Sheet");
    } catch (importError) {
      setError(importError.message || "Unable to import this Google Sheet.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={`crm-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => {
        if (window.innerWidth <= 760) setSidebarOpen(false);
      }} onToggle={() => setSidebarOpen((open) => !open)} />
      <main className="crm-main">
        <DashboardTopbar searchTerm={searchTerm} onSearchChange={setSearchTerm} onAddLead={() => navigate("/leads/new")} onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />
        <div className="crm-page space-y-5">
          <section className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm shadow-blue-100/50 sm:flex-row sm:items-center sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500" />
            <div className="relative">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Workspace</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-bold text-blue-700 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {filteredLeads.length} total
                </span>
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-600">Manage contacts, follow-ups, and sales opportunities.</p>
            </div>
            <div className="relative grid w-full grid-cols-2 gap-2 min-[520px]:flex min-[520px]:w-auto min-[520px]:flex-wrap min-[520px]:items-center min-[520px]:justify-end">
              <input ref={fileInputRef} className="hidden" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleImportFile} />
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:border-blue-700 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60" type="button" onClick={() => fileInputRef.current?.click()} disabled={importing}><MdFileUpload size={17} />{importing ? "Importing..." : "Import"}</button>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60" type="button" onClick={handleImportGoogleSheet} disabled={importing}><MdLink size={17} />Sheets</button>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2" type="button" onClick={handleExportCSV}><MdFileDownload size={17} />CSV</button>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2" type="button" onClick={handleExportExcel}><MdFileDownload size={17} />Excel</button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">All leads</h2>
                <p className="mt-0.5 text-xs text-slate-500">Search and manage leads in your workspace.</p>
              </div>
              <label className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-400 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 sm:max-w-xs">
                <MdSearch size={18} />
                <input className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search leads..." aria-label="Search leads" />
              </label>
            </div>
            {error && <p className="mx-4 mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5" role="alert">{error}</p>}
            {followUpSuccess && <p className="mx-4 mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:mx-5" role="status">{followUpSuccess}</p>}
            {loading ? <p className="px-5 py-14 text-center text-sm text-slate-500">Loading leads...</p> : <LeadTable leads={filteredLeads} customFields={customFields} onView={(id) => navigate(`/lead/${id}`)} onFollowUp={setFollowUpLead} onEdit={(id) => navigate(`/lead/${id}`)} onDelete={handleDeleteLead} onStatusChange={handleStatusChange} />}
          </section>
        </div>
      </main>
      {followUpLead && <FollowUpModal lead={followUpLead} onClose={() => setFollowUpLead(null)} onSaved={() => { setFollowUpLead(null); setFollowUpSuccess("Follow-up scheduled successfully."); }} />}
    </div>
  );
};

export default Leads;
