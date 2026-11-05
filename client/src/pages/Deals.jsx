import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MdAccountBalanceWallet,
  MdCalendarToday,
  MdDeleteOutline,
  MdEdit,
  MdFilterList,
  MdSearch,
  MdShowChart,
  MdViewKanban,
  MdViewList,
} from "react-icons/md";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import { createDeal, deleteDeal, getContacts, getDeals, getLeads, updateDeal } from "../services/api";
import { formatDateOnly, getDateOnlyValue, getTodayDateOnly, isDateOnlyInCurrentMonth } from "../utils/dealDates";

const stages = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Won", "Lost"];
const probabilities = { Prospecting: 10, Qualification: 25, Proposal: 50, Negotiation: 75, Won: 100, Lost: 0 };
const currencies = ["INR", "USD", "EUR", "GBP"];
const emptyDeal = {
  name: "",
  value: "0",
  currency: "INR",
  stage: "Prospecting",
  probability: "10",
  expectedCloseDate: "",
  contactId: "",
  leadId: "",
  notes: "",
};

const dateInputValue = (value) => {
  return getDateOnlyValue(value);
};

const formatMoney = (value, currency) => new Intl.NumberFormat(undefined, {
  style: "currency",
  currency,
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

const groupedMoney = (items, selector) => {
  const totals = new Map();
  items.forEach((item) => {
    const currency = item.currency || "INR";
    totals.set(currency, (totals.get(currency) || 0) + selector(item));
  });
  if (!totals.size) return formatMoney(0, "INR");
  return [...totals.entries()].map(([currency, value]) => formatMoney(value, currency)).join(" · ");
};

const dealPayload = (item) => ({
  name: item.name,
  value: item.value,
  currency: item.currency || "INR",
  stage: item.stage,
  probability: item.probability,
  expectedCloseDate: dateInputValue(item.expectedCloseDate),
  contactId: item.contact?._id || item.contact || "",
  leadId: item.lead?._id || item.lead || "",
  notes: item.notes || "",
});

const DealForm = ({ deal, initialValues, contacts, leads, relatedDataError, saving, error, onClose, onSave, onRetryRelatedData }) => {
  const [form, setForm] = useState(() => {
    const initial = deal ? { ...emptyDeal, ...dealPayload(deal) } : { ...emptyDeal, ...initialValues };
    const probability = ["Won", "Lost"].includes(initial.stage) ? probabilities[initial.stage] : initial.probability;
    return { ...initial, value: String(initial.value ?? 0), probability: String(probability ?? 10) };
  });
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

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      if (name !== "stage") return { ...current, [name]: value };
      const currentStageHasManualProbability = !["Won", "Lost"].includes(current.stage)
        && Number(current.probability) !== probabilities[current.stage];
      const nextProbability = ["Won", "Lost"].includes(value)
        ? probabilities[value]
        : currentStageHasManualProbability
          ? Number(current.probability)
          : probabilities[value];
      return { ...current, stage: value, probability: String(nextProbability) };
    });
  };
  const submit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      value: Number(form.value),
      probability: ["Won", "Lost"].includes(form.stage) ? probabilities[form.stage] : Number(form.probability),
    });
  };

  const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 sm:p-5" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="deal-form-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Sales pipeline</p>
          <h2 id="deal-form-title" className="mt-1 text-xl font-bold text-slate-900">{deal ? "Edit deal" : "Create deal"}</h2>
          <p className="mt-1 text-sm text-slate-600">Deal: a specific sales opportunity with a value and expected close date. Each deal has its own sale outcome.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
          <label className="block text-xs font-semibold text-slate-600">Deal name *
            <input className={inputClass} name="name" value={form.name} onChange={change} maxLength={160} placeholder="e.g. Annual software renewal" required />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="deal-value" className="block text-xs font-semibold text-slate-600">Deal value</label>
              <div className="mt-1.5 flex gap-2">
                <label className="sr-only" htmlFor="deal-currency">Deal currency</label>
                <select id="deal-currency" className={`${inputClass} mt-0 w-24 flex-none`} name="currency" value={form.currency} onChange={change}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select>
                <input id="deal-value" className={`${inputClass} mt-0 min-w-0`} name="value" value={form.value} onChange={change} type="number" min="0" step="0.01" required />
              </div>
            </div>
            <label className="text-xs font-semibold text-slate-600">Deal stage
              <select className={inputClass} name="stage" value={form.stage} onChange={change}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select>
              <span className="mt-1 block font-normal text-slate-500">Won or Lost closes this deal only; a lead or contact can have multiple deals.</span>
            </label>
            <label className="text-xs font-semibold text-slate-600">Win probability (%)
              <input className={inputClass} name="probability" value={form.probability} onChange={change} type="number" min="0" max="100" step="1" required disabled={["Won", "Lost"].includes(form.stage)} aria-describedby="deal-probability-help" />
              <span id="deal-probability-help" className="mt-1 block font-normal text-slate-500">{form.stage === "Won" ? "Won deals always use 100%." : form.stage === "Lost" ? "Lost deals always use 0%." : "Your estimated chance of winning this deal; used for the weighted forecast. Enter 0–100%."}</span>
            </label>
            <label className="text-xs font-semibold text-slate-600">Expected close date
              <input className={inputClass} name="expectedCloseDate" value={form.expectedCloseDate} onChange={change} type="date" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Linked contact
              <select className={inputClass} name="contactId" value={form.contactId} onChange={change}>
                <option value="">No contact linked</option>
                {contacts.map((contact) => <option key={contact._id} value={contact._id}>{contact.name}{contact.company ? ` · ${contact.company}` : ""}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Related lead
              <select className={inputClass} name="leadId" value={form.leadId} onChange={change}>
                <option value="">No lead linked</option>
                {leads.map((lead) => <option key={lead._id} value={lead._id}>{lead.name}{lead.company ? ` · ${lead.company}` : ""}</option>)}
              </select>
            </label>
          </div>
          {relatedDataError && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status"><span>{relatedDataError}</span><button type="button" onClick={onRetryRelatedData} className="font-bold underline underline-offset-2">Retry</button></div>}
          <label className="block text-xs font-semibold text-slate-600">Notes
            <textarea className={`${inputClass} resize-y`} name="notes" value={form.notes} onChange={change} rows="3" maxLength={10000} placeholder="Deal context, next steps, and key requirements" />
          </label>
          {error && <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button ref={closeButtonRef} type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : deal ? "Save changes" : "Create deal"}</button>
          </div>
        </form>
      </section>
    </div>
  );
};

const MetricCard = ({ label, value, detail, icon: Icon, tone }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 break-words text-lg font-bold leading-tight text-slate-900 sm:text-xl">{value}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p></div>
      <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${tone}`}><Icon size={20} /></span>
    </div>
  </article>
);

const Deals = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All stages");
  const [currencyFilter, setCurrencyFilter] = useState("All currencies");
  const [view, setView] = useState("board");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [relatedDataError, setRelatedDataError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const saveInProgress = useRef(false);
  const prefillHandled = useRef(false);
  const closeDealForm = useCallback(() => {
    setEditing(null);
    setFormError("");
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getDeals(), getContacts(), getLeads()])
      .then(([dealResult, contactResult, leadResult]) => {
        if (!active) return;
        if (dealResult.status === "rejected") {
          setLoadError(dealResult.reason.response?.data?.message || "Unable to load deals. Check your connection and retry.");
          return;
        }
        setDeals(dealResult.value);
        setContacts(contactResult.status === "fulfilled" ? contactResult.value : []);
        setLeads(leadResult.status === "fulfilled" ? leadResult.value : []);
        if (contactResult.status === "rejected" || leadResult.status === "rejected") {
          setRelatedDataError("Some linked contact or lead options could not be loaded. Retry to load them.");
        } else {
          setRelatedDataError("");
          const leadId = location.state?.createDealForLeadId;
          const editDealId = location.state?.editDealId;
          if ((leadId || editDealId) && !prefillHandled.current) {
            if (editDealId) {
              const selectedDeal = dealResult.value.find((item) => String(item._id) === String(editDealId));
              if (!selectedDeal) {
                setError("The selected deal could not be found in your workspace.");
              } else {
                setEditing(selectedDeal);
                setFormError("");
              }
            } else {
            const relatedLead = leadResult.value.find((item) => String(item._id) === String(leadId));
            if (!relatedLead) {
              setError("The selected lead could not be found. Choose an existing lead to create a deal.");
            } else {
              const relatedContact = contactResult.value.find((item) => item.leadIds?.some((id) => String(id) === String(leadId)));
              setEditing({
                ...emptyDeal,
                leadId: relatedLead._id,
                contactId: relatedContact?._id || "",
              });
              setFormError("");
            }
            }
            prefillHandled.current = true;
            navigate("/deals", { replace: true, state: null });
          }
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location.state?.createDealForLeadId, location.state?.editDealId, navigate, retryCount]);

  const currencyOptions = useMemo(() => [...new Set(deals.map((item) => item.currency || "INR"))].sort(), [deals]);
  const filteredDeals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return deals.filter((item) => {
      const matchesSearch = !query || [
        item.name, item.contact?.name, item.contact?.company, item.lead?.name, item.lead?.company, item.stage,
      ].some((value) => value?.toLowerCase().includes(query));
      const matchesStage = stageFilter === "All stages" || item.stage === stageFilter;
      const matchesCurrency = currencyFilter === "All currencies" || item.currency === currencyFilter;
      return matchesSearch && matchesStage && matchesCurrency;
    }).sort((a, b) => {
      const firstDate = a.expectedCloseDate ? new Date(a.expectedCloseDate).getTime() : Number.MAX_SAFE_INTEGER;
      const secondDate = b.expectedCloseDate ? new Date(b.expectedCloseDate).getTime() : Number.MAX_SAFE_INTEGER;
      return firstDate - secondDate || new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [currencyFilter, deals, search, stageFilter]);

  const openDeals = deals.filter((item) => !["Won", "Lost"].includes(item.stage));
  const wonDeals = deals.filter((item) => item.stage === "Won");
  const today = new Date();
  const closeThisMonth = deals.filter((item) => {
    if (["Won", "Lost"].includes(item.stage)) return false;
    return isDateOnlyInCurrentMonth(dateInputValue(item.expectedCloseDate), today);
  }).length;
  const overdueDeals = openDeals.filter((item) => {
    const closeDate = dateInputValue(item.expectedCloseDate);
    return closeDate && closeDate < getTodayDateOnly(today);
  }).length;

  const save = async (values) => {
    if (saveInProgress.current) return;
    saveInProgress.current = true;
    setSaving(true);
    setFormError("");
    try {
      if (editing?._id) {
        const updated = await updateDeal(editing._id, values);
        setDeals((current) => current.map((item) => item._id === updated._id ? updated : item));
        setNotice("Deal updated.");
      } else {
        const created = await createDeal(values);
        setDeals((current) => [created, ...current]);
        setNotice("Deal created.");
      }
      setEditing(null);
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || "Unable to save this deal.");
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  };

  const changeStage = async (item, stage) => {
    const previous = item;
    const stageHasManualProbability = !["Won", "Lost"].includes(item.stage)
      && Number(item.probability) !== probabilities[item.stage];
    const probability = ["Won", "Lost"].includes(stage)
      ? probabilities[stage]
      : stageHasManualProbability
        ? Number(item.probability)
        : probabilities[stage];
    setDeals((current) => current.map((entry) => entry._id === item._id
      ? { ...entry, stage, probability }
      : entry));
    try {
      const updated = await updateDeal(item._id, {
        ...dealPayload(item),
        stage,
        probability,
      });
      setDeals((current) => current.map((entry) => entry._id === updated._id ? updated : entry));
    } catch (requestError) {
      setDeals((current) => current.map((entry) => entry._id === previous._id ? previous : entry));
      setError(requestError.response?.data?.message || "Unable to save the stage change. The deal remains in its previous stage.");
    }
  };

  const removeDeal = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteDeal(item._id);
      setDeals((current) => current.filter((entry) => entry._id !== item._id));
      setNotice("Deal deleted.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete this deal.");
    }
  };

  const startEditing = (item = null) => {
    setFormError("");
    setEditing(item || { ...emptyDeal, value: 0, probability: 10 });
  };
  const retryLoad = () => {
    setLoading(true);
    setLoadError("");
    setRelatedDataError("");
    setRetryCount((count) => count + 1);
  };
  const changeViewByKeyboard = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextView = event.key === "Home" || event.key === "ArrowLeft" ? "board" : "list";
    setView(nextView);
    document.getElementById(`deals-view-${nextView}`)?.focus();
  };

  const inputClass = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  const renderCard = (item) => (
    <article key={item._id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button type="button" onClick={() => startEditing(item)} className="block max-w-full text-left text-sm font-bold text-slate-900 hover:text-blue-700">{item.name}</button>
          <p className="mt-1 truncate text-xs text-slate-500">{item.contact?.name || item.lead?.name || "No linked contact"}</p>
        </div>
        <div className="flex flex-none">
          <button type="button" onClick={() => startEditing(item)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={`Edit ${item.name}`} title="Edit"><MdEdit /></button>
          <button type="button" onClick={() => removeDeal(item)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${item.name}`} title="Delete"><MdDeleteOutline /></button>
        </div>
      </div>
      <p className="mt-3 text-base font-bold text-slate-900">{formatMoney(item.value, item.currency || "INR")}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>{item.expectedCloseDate ? `Close ${formatDateOnly(dateInputValue(item.expectedCloseDate))}` : "No close date"}</span>
        <span className="font-semibold text-blue-700">{item.probability}% likely</span>
      </div>
      <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Move stage
        <select className={`${inputClass} mt-1 w-full py-1.5 text-xs font-semibold normal-case tracking-normal`} value={item.stage} onChange={(event) => changeStage(item, event.target.value)} aria-label={`Stage for ${item.name}`}>
          {stages.map((stage) => <option key={stage}>{stage}</option>)}
        </select>
      </label>
      {item.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.notes}</p>}
    </article>
  );

  return (
    <div className={`crm-shell crm-dashboard-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => { if (window.innerWidth <= 760) setSidebarOpen(false); }} onToggle={() => setSidebarOpen((open) => !open)} />
      <main className="crm-main">
        <DashboardTopbar onAddLead={() => startEditing()} addButtonLabel="Add deal" onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />
        <div className="crm-page space-y-5">
          <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500" />
            <div className="relative">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Workspace / revenue</p>
              <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-slate-900">Deals</h1><span className="rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-bold text-blue-700">{loading ? "Loading" : loadError ? "Unavailable" : `${filteredDeals.length} deals`}</span></div>
              <p className="mt-1 text-sm text-slate-600">Manage opportunities, forecast revenue, and move deals through your pipeline.</p>
            </div>
          </section>

          {(error || notice) && <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`} role={error ? "alert" : "status"}><span>{error || notice}</span><button type="button" className="font-bold" onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss message">&times;</button></div>}

          {loading ? <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600" role="status">Loading deal metrics...</p>
            : loadError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-800" role="status">Deal metrics are unavailable until deals load.</p>
              : <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Open pipeline" value={groupedMoney(openDeals, (item) => Number(item.value) || 0)} detail={`${openDeals.length} current open deal(s) · all-time, ignores filters`} icon={MdAccountBalanceWallet} tone="bg-blue-50 text-blue-700" />
            <MetricCard label="Weighted forecast" value={groupedMoney(openDeals, (item) => (Number(item.value) || 0) * (Number(item.probability) || 0) / 100)} detail="Current open deals · all-time, ignores filters" icon={MdShowChart} tone="bg-violet-50 text-violet-700" />
            <MetricCard label="Won revenue" value={groupedMoney(wonDeals, (item) => Number(item.value) || 0)} detail={`${wonDeals.length} all-time won deal(s) · ignores filters`} icon={MdAccountBalanceWallet} tone="bg-emerald-50 text-emerald-700" />
            <MetricCard label="Close dates" value={`${closeThisMonth} this month`} detail={`${overdueDeals} overdue open deal(s) · ignores filters`} icon={MdCalendarToday} tone="bg-amber-50 text-amber-700" />
          </section>
          }

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-sm font-bold text-slate-900">Pipeline</h2><p className="mt-0.5 text-xs text-slate-500">Search, filter, and update deal stages. Stage changes save immediately.</p></div>
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Pipeline view" onKeyDown={changeViewByKeyboard}>
                  <button id="deals-view-board" type="button" role="tab" aria-controls="deals-view-panel" aria-selected={view === "board"} tabIndex={view === "board" ? 0 : -1} onClick={() => setView("board")} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${view === "board" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}><MdViewKanban size={18} />Board</button>
                  <button id="deals-view-list" type="button" role="tab" aria-controls="deals-view-panel" aria-selected={view === "list"} tabIndex={view === "list" ? 0 : -1} onClick={() => setView("list")} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${view === "list" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}><MdViewList size={18} />List</button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_repeat(2,minmax(150px,210px))]">
                <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-blue-400 focus-within:bg-white"><MdSearch size={18} /><input className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search deals, companies, contacts" aria-label="Search deals" /></label>
                <label className="flex items-center gap-2"><MdFilterList className="text-slate-400" /><select className={`${inputClass} min-h-10 min-w-0 flex-1`} value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} aria-label="Filter by stage"><option>All stages</option>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
                <select className={`${inputClass} min-h-10`} value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value)} aria-label="Filter by currency"><option>All currencies</option>{currencyOptions.map((currency) => <option key={currency}>{currency}</option>)}</select>
              </div>
            </div>
            {loading ? <div id="deals-view-panel" role="tabpanel" aria-labelledby={`deals-view-${view}`} tabIndex={0} className="px-5 py-14 text-center text-sm text-slate-600"><p role="status">Loading deals...</p></div>
              : loadError ? <div id="deals-view-panel" role="tabpanel" aria-labelledby={`deals-view-${view}`} tabIndex={0} className="px-5 py-12 text-center"><div role="alert"><h3 className="text-sm font-bold text-rose-800">Deals couldn’t be loaded</h3><p className="mt-1 text-xs text-rose-700">{loadError}</p><button type="button" onClick={retryLoad} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Retry</button></div></div>
              : filteredDeals.length === 0 ? <div id="deals-view-panel" role="tabpanel" aria-labelledby={`deals-view-${view}`} tabIndex={0} className="px-5 py-16 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600"><MdShowChart size={22} /></span><h3 className="mt-3 text-sm font-bold text-slate-800">{deals.length ? "No matching deals" : "Your pipeline is ready"}</h3><p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">{deals.length ? "Try changing the search or filters." : "Add your first deal to start tracking pipeline value and expected revenue."}</p>{!deals.length && <button type="button" onClick={() => startEditing()} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Add your first deal</button>}</div>
                : view === "board" ? <div id="deals-view-panel" role="tabpanel" aria-labelledby="deals-view-board" tabIndex={0} className="grid items-start gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 sm:p-4 md:grid-cols-2 2xl:grid-cols-3">{stages.filter((stage) => stageFilter === "All stages" || stageFilter === stage).map((stage) => {
                  const stageDeals = filteredDeals.filter((item) => item.stage === stage);
                  return <section key={stage} className="min-h-40 rounded-xl bg-slate-50/80 p-2.5">
                    <div className="mb-2 flex items-center justify-between gap-2 px-1 py-1"><div className="flex items-center gap-2"><h3 className="text-xs font-bold text-slate-800">{stage}</h3><span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-slate-500">{stageDeals.length}</span></div><span className="text-[10px] font-semibold text-slate-500">{groupedMoney(stageDeals, (item) => Number(item.value) || 0)}</span></div>
                    <div className="space-y-2">{stageDeals.length ? stageDeals.map(renderCard) : <p className="rounded-lg border border-dashed border-slate-200 bg-white/60 px-3 py-5 text-center text-[11px] text-slate-400">No deals in this stage</p>}</div>
                  </section>;
                })}</div>
                  : <div id="deals-view-panel" role="tabpanel" aria-labelledby="deals-view-list" tabIndex={0} className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"><table className="w-full min-w-[900px] border-collapse text-left">
                    <thead className="bg-slate-50"><tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500"><th className="px-5 py-3">Deal</th><th className="px-4 py-3">Contact / lead</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Probability</th><th className="px-4 py-3">Expected close</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{filteredDeals.map((item) => <tr key={item._id} className="transition hover:bg-blue-50/30">
                      <td className="px-5 py-3"><button type="button" onClick={() => startEditing(item)} className="text-left text-sm font-bold text-slate-900 hover:text-blue-700">{item.name}</button>{item.notes && <p className="mt-0.5 max-w-48 truncate text-[11px] text-slate-500">{item.notes}</p>}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.contact?.name || "—"}{item.lead?.name && <span className="block text-[10px] text-slate-400">Lead: {item.lead.name}</span>}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-800">{formatMoney(item.value, item.currency || "INR")}</td>
                      <td className="px-4 py-3"><select className={`${inputClass} py-1.5 text-xs`} value={item.stage} onChange={(event) => changeStage(item, event.target.value)} aria-label={`Stage for ${item.name}`}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.probability}%</td><td className="px-4 py-3 text-xs text-slate-600">{item.expectedCloseDate ? formatDateOnly(dateInputValue(item.expectedCloseDate)) : "—"}</td>
                      <td className="px-5 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => startEditing(item)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={`Edit ${item.name}`}><MdEdit /></button><button type="button" onClick={() => removeDeal(item)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${item.name}`}><MdDeleteOutline /></button></div></td>
                    </tr>)}</tbody>
                  </table></div>}
          </section>
        </div>
      </main>
      {editing && <DealForm key={editing._id || "new-deal"} deal={editing._id ? editing : null} initialValues={editing} contacts={contacts} leads={leads} relatedDataError={relatedDataError} saving={saving} error={formError} onClose={closeDealForm} onSave={save} onRetryRelatedData={retryLoad} />}
    </div>
  );
};

export default Deals;
