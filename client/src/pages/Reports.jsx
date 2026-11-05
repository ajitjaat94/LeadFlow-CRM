import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MdArrowDownward,
  MdArrowUpward,
  MdAccountBalanceWallet,
  MdCalendarToday,
  MdCheckCircle,
  MdDownload,
  MdGroups,
  MdOutlineEventAvailable,
  MdRefresh,
} from "react-icons/md";
import { Link } from "react-router-dom";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import { LEAD_STATUSES } from "../data/leadStatuses";
import { getDeals, getFollowUps, getLeads, getSettings } from "../services/api";
import { getProgressStorageKey } from "../utils/progressStorage";
import { getBrowserTimeZone, getTodayInTimeZone } from "../utils/followUpTime";
import { getDateKeyInTimeZone as dateKeyInTimeZone, getFollowUpRangeStart, getFollowUpReportMetrics, shiftDateKey } from "../utils/followUpReportMetrics";

const periods = [
  { value: "30days", label: "Last 30 days", days: 30 },
  { value: "90days", label: "Last 90 days", days: 90 },
  { value: "12months", label: "Last 12 months", months: 12 },
  { value: "all", label: "All time" },
];

const dealStages = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Won", "Lost"];
const stageColors = {
  New: "bg-sky-500",
  Contacted: "bg-blue-500",
  Qualified: "bg-indigo-500",
  Proposal: "bg-violet-500",
  Negotiation: "bg-amber-500",
  Won: "bg-emerald-500",
  Lost: "bg-rose-400",
  "Won (legacy)": "bg-emerald-300",
  "Lost (legacy)": "bg-rose-300",
  Prospecting: "bg-sky-500",
  Qualification: "bg-indigo-500",
};

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const dateKeyUTC = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCreatedAt = (item) => {
  const date = new Date(item.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const formatMoney = (value, currency) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
};

const groupedMoney = (items, selectValue) => {
  const totals = new Map();
  items.forEach((item) => {
    const currency = item.currency || "INR";
    totals.set(currency, (totals.get(currency) || 0) + selectValue(item));
  });
  if (!totals.size) return formatMoney(0, "INR");
  return [...totals.entries()]
    .map(([currency, value]) => formatMoney(value, currency))
    .join(" · ");
};

const getLeadSource = (lead) => {
  const fields = lead.customFields instanceof Map ? Object.fromEntries(lead.customFields) : lead.customFields || {};
  const source = Object.entries(fields).find(([key]) => ["source", "lead_source"].includes(key.trim().toLowerCase().replace(/[\s-]+/g, "_")))?.[1];
  return String(lead.source || source || "").trim() || "Not recorded";
};

const formatDateKey = (key, options) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
};

const Metric = ({ label, value, detail, icon: Icon, tone }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-2 break-words text-lg font-bold leading-tight text-slate-900 sm:text-xl">{value}</p>
        <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
      </div>
      <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${tone}`}><Icon size={20} /></span>
    </div>
  </article>
);

const SectionHeading = ({ title, detail, action }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
    <div><h2 className="text-sm font-bold text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div>
    {action}
  </div>
);

const ReportsLoadingSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading report data">
    <span className="sr-only" role="status">Loading report data</span>
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-4"><div className="h-3 w-2/5 rounded bg-slate-200" /><div className="mt-4 h-6 w-3/5 rounded bg-slate-100" /><div className="mt-3 h-3 w-4/5 rounded bg-slate-100" /></div>)}
    </div>
    <div className="grid gap-4 2xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"><div className="h-4 w-1/3 rounded bg-slate-200" /><div className="mt-3 h-3 w-2/3 rounded bg-slate-100" /><div className="mt-8 h-36 rounded-xl bg-slate-100" /></div>)}
    </div>
  </div>
);

const Reports = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [timeZone, setTimeZone] = useState(getBrowserTimeZone);
  const [timeZoneError, setTimeZoneError] = useState("");
  const [period, setPeriod] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [now] = useState(() => new Date());

  const fetchReportData = useCallback(async () => {
    const data = await Promise.all([
      getLeads(),
      getDeals(),
      getFollowUps(),
    ]);
    if (!data.every(Array.isArray)) {
      throw new Error("The reports API returned incomplete data. Retry to load the report.");
    }
    return data;
  }, []);

  const loadReportData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setLoading(true);
    setLoadError("");
    try {
      const [leadData, dealData, followUpData] = await fetchReportData();
      setLeads(leadData || []);
      setDeals(dealData || []);
      setFollowUps(followUpData || []);
      localStorage.setItem(getProgressStorageKey("reports-reviewed"), "true");
      setLoadError("");
      if (refresh) setNotice("Reports updated with the latest CRM data.");
    } catch (requestError) {
      setLoadError(requestError.response?.data?.message || requestError.message || "Unable to load reports. Check the API connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchReportData]);

  useEffect(() => {
    let active = true;
    fetchReportData()
      .then(([leadData, dealData, followUpData]) => {
        if (!active) return;
        setLeads(leadData);
        setDeals(dealData);
        setFollowUps(followUpData);
        localStorage.setItem(getProgressStorageKey("reports-reviewed"), "true");
        setLoadError("");
      })
      .catch((requestError) => {
        if (active) {
          setLoadError(requestError.response?.data?.message || requestError.message || "Unable to load reports. Check the API connection and try again.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchReportData]);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((settings) => {
        if (!active) return;
        setTimeZone(settings.workspace.timeZone || "Asia/Kolkata");
        setTimeZoneError("");
      })
      .catch(() => {
        if (!active) return;
        const browserTimeZone = getBrowserTimeZone();
        setTimeZone(browserTimeZone);
        setTimeZoneError(`Workspace timezone is unavailable; follow-up report dates use your browser timezone (${browserTimeZone}).`);
      });
    return () => { active = false; };
  }, []);

  const todayInTimeZone = getTodayInTimeZone(timeZone, now);
  const followUpRangeStart = getFollowUpRangeStart(period, todayInTimeZone);
  const periodLeads = useMemo(() => leads.filter((item) => {
    const createdAt = getCreatedAt(item);
    if (!createdAt || createdAt > now) return false;
    const createdDateKey = dateKeyInTimeZone(createdAt, timeZone);
    return createdDateKey <= todayInTimeZone && (!followUpRangeStart || createdDateKey >= followUpRangeStart);
  }), [followUpRangeStart, leads, now, timeZone, todayInTimeZone]);
  const periodDeals = useMemo(() => deals.filter((item) => {
    const createdAt = getCreatedAt(item);
    if (!createdAt || createdAt > now) return false;
    const createdDateKey = dateKeyInTimeZone(createdAt, timeZone);
    return createdDateKey <= todayInTimeZone && (!followUpRangeStart || createdDateKey >= followUpRangeStart);
  }), [deals, followUpRangeStart, now, timeZone, todayInTimeZone]);
  const followUpMetrics = useMemo(() => getFollowUpReportMetrics(followUps, {
    startDate: followUpRangeStart,
    endDate: todayInTimeZone,
    timeZone,
    now,
  }), [followUps, followUpRangeStart, now, timeZone, todayInTimeZone]);
  const {
    duePeriodFollowUps: periodFollowUps,
    completedDuringPeriod,
    pendingDue: pendingFollowUps,
    completedDue: completedFollowUps,
    cancelledDue: cancelledFollowUps,
    duePeriodCompletionRate: dueFollowUpCompletionRate,
  } = followUpMetrics;

  const openDeals = periodDeals.filter((item) => !["Won", "Lost"].includes(item.stage));
  const wonDeals = periodDeals.filter((item) => item.stage === "Won");
  const lostDeals = periodDeals.filter((item) => item.stage === "Lost");
  const decidedDeals = wonDeals.length + lostDeals.length;
  const scheduledFollowUpCount = pendingFollowUps.length + completedFollowUps.length;
  const conversionRate = decidedDeals ? Math.round((wonDeals.length / decidedDeals) * 100) : 0;
  const weightedPipeline = groupedMoney(openDeals, (item) => (Number(item.value) || 0) * (Number(item.probability) || 0) / 100);
  const wonRevenue = groupedMoney(wonDeals, (item) => Number(item.value) || 0);

  const leadStageRows = LEAD_STATUSES.map((stage) => ({
    name: ["Won", "Lost"].includes(stage) ? `${stage} (legacy)` : stage,
    count: periodLeads.filter((item) => item.status === stage).length,
  }));
  const maxLeadStage = Math.max(1, ...leadStageRows.map((item) => item.count));
  const dealStageRows = dealStages.map((stage) => {
    const stageDeals = periodDeals.filter((item) => item.stage === stage);
    return {
      name: stage,
      count: stageDeals.length,
      value: groupedMoney(stageDeals, (item) => Number(item.value) || 0),
      share: periodDeals.length ? Math.round((stageDeals.length / periodDeals.length) * 100) : 0,
    };
  });
  const sourceRows = useMemo(() => {
    const sources = new Map();
    periodLeads.forEach((item) => {
      const source = getLeadSource(item);
      sources.set(source, (sources.get(source) || 0) + 1);
    });
    return [...sources.entries()]
      .map(([name, count]) => ({ name, count, share: periodLeads.length ? Math.round((count / periodLeads.length) * 100) : 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 7);
  }, [periodLeads]);

  const trendBuckets = useMemo(() => {
    const countCreatedBetween = (items, startKey, endKey, includeEnd = false) => items.filter((item) => {
      const createdAt = getCreatedAt(item);
      if (!createdAt || createdAt > now) return false;
      const key = dateKeyInTimeZone(createdAt, timeZone);
      return key >= startKey && (includeEnd ? key <= endKey : key < endKey);
    }).length;

    if (period === "12months") {
      const [currentYear, currentMonth] = todayInTimeZone.split("-").map(Number);
      const monthStart = new Date(Date.UTC(currentYear, currentMonth - 12, 1));
      return Array.from({ length: 12 }, (_, index) => {
        const bucketStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + index, 1));
        const bucketEnd = new Date(Date.UTC(bucketStart.getUTCFullYear(), bucketStart.getUTCMonth() + 1, 1));
        const startKey = dateKeyUTC(bucketStart);
        const endKey = dateKeyUTC(bucketEnd);
        return {
          label: formatDateKey(startKey, { month: "short" }),
          leads: countCreatedBetween(periodLeads, startKey, endKey),
          deals: countCreatedBetween(periodDeals, startKey, endKey),
        };
      });
    }

    if (period === "all") {
      const dates = [...leads, ...deals].map(getCreatedAt).filter(Boolean)
        .map((createdAt) => dateKeyInTimeZone(createdAt, timeZone));
      const currentYear = Number(todayInTimeZone.slice(0, 4));
      const firstYear = dates.length
        ? Math.max(dates.reduce((oldestYear, key) => Math.min(oldestYear, Number(key.slice(0, 4))), currentYear), currentYear - 11)
        : currentYear;
      return Array.from({ length: currentYear - firstYear + 1 }, (_, index) => {
        const year = firstYear + index;
        const startKey = `${year}-01-01`;
        const endKey = `${year + 1}-01-01`;
        return {
          label: String(year),
          leads: countCreatedBetween(periodLeads, startKey, endKey),
          deals: countCreatedBetween(periodDeals, startKey, endKey),
        };
      });
    }

    const startKey = followUpRangeStart || `${todayInTimeZone.slice(0, 7)}-01`;
    const endKey = shiftDateKey(todayInTimeZone, 1);
    const startDay = Date.parse(`${startKey}T00:00:00Z`) / 86400000;
    const endDay = Date.parse(`${endKey}T00:00:00Z`) / 86400000;
    const spanDays = Math.max(1, endDay - startDay);
    const bucketCount = 6;
    return Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = new Date((startDay + Math.floor((spanDays * index) / bucketCount)) * 86400000);
      const bucketEnd = index === bucketCount - 1
        ? endKey
        : dateKeyUTC(new Date((startDay + Math.floor((spanDays * (index + 1)) / bucketCount)) * 86400000));
      const bucketStartKey = dateKeyUTC(bucketStart);
      return {
        label: formatDateKey(bucketStartKey, { day: "numeric", month: "short" }),
        leads: countCreatedBetween(periodLeads, bucketStartKey, bucketEnd),
        deals: countCreatedBetween(periodDeals, bucketStartKey, bucketEnd),
      };
    });
  }, [deals, followUpRangeStart, leads, now, period, periodDeals, periodLeads, timeZone, todayInTimeZone]);

  const maxTrend = Math.max(1, ...trendBuckets.flatMap((item) => [item.leads, item.deals]));
  const activityItems = [...followUps]
    .filter((item) => item.status === "Pending"
      && item.scheduledDate
      && item.scheduledTime
      && new Date(`${item.scheduledDate}T${item.scheduledTime}`) >= now)
    .sort((first, second) => `${first.scheduledDate}T${first.scheduledTime}`.localeCompare(`${second.scheduledDate}T${second.scheduledTime}`))
    .slice(0, 6);

  const exportReport = () => {
    if (!periodLeads.length && !periodDeals.length && !periodFollowUps.length && !completedDuringPeriod.length) {
      setError("There is no report data in the selected date range to export.");
      return;
    }
    const exportTime = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "long",
      timeZone,
    }).format(new Date());
    const selectedDateRange = `${followUpRangeStart || "All time"} to ${todayInTimeZone}`;
    const rows = [
      ["Report metadata", "Value"],
      ["Report name", "LeadFlow performance report"],
      ["Selected date range", selectedDateRange],
      ["Timezone", timeZone],
      ["Exported at", exportTime],
      [],
      ["Report section", "Name", "Count", "Value / details"],
      ["Summary", "Leads created", periodLeads.length, ""],
      ["Summary", "Deal win rate", `${conversionRate}%`, `${wonDeals.length} won of ${decidedDeals} decided deals`],
      ["Summary", "Open deals", openDeals.length, weightedPipeline],
      ["Summary", "Won deals", wonDeals.length, wonRevenue],
      ["Summary", "Lost deals", lostDeals.length, ""],
      ["Summary", "Pending follow-ups due in period", pendingFollowUps.length, ""],
      ["Follow-up completion", "Completed during selected period (completion timestamp)", completedDuringPeriod.length, "CompletedAt is required; historical records with no timestamp are excluded"],
      ["Follow-up completion", "Completed with scheduled date in selected period", completedFollowUps.length, ""],
      ["Follow-up completion", "Due-period completion rate", `${dueFollowUpCompletionRate}%`, `${completedFollowUps.length} completed of ${scheduledFollowUpCount} pending or completed; cancelled excluded`],
      ["Follow-up completion", "Cancelled in scheduled-date period", cancelledFollowUps.length, "Excluded from completion-rate denominator"],
      ...leadStageRows.map((item) => ["Lead stage", item.name, item.count, ""]),
      ...dealStageRows.map((item) => ["Deal stage", item.name, item.count, item.value]),
      ...sourceRows.map((item) => ["Lead source", item.name, item.count, `${item.share}%`]),
      ...["Pending", "Completed", "Cancelled"].map((status) => [
        "Follow-up status (scheduled-date cohort)",
        status,
        periodFollowUps.filter((item) => item.status === status).length,
        "",
      ]),
    ];
    const contents = rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `leadflow-report-${period}-${dateKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Report CSV downloaded.");
    setError("");
  };

  const selectedPeriod = periods.find((item) => item.value === period)?.label || "Last 30 days";
  const selectedDateRange = `${followUpRangeStart || "All time"} to ${todayInTimeZone}`;
  const inputClass = "min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className={`crm-shell crm-dashboard-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => { if (window.innerWidth <= 760) setSidebarOpen(false); }} onToggle={() => setSidebarOpen((open) => !open)} />
      <main className="crm-main">
        <DashboardTopbar searchTerm={searchTerm} onSearchChange={setSearchTerm} onAddLead={exportReport} addButtonLabel="Export report" onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />
        <div className="crm-page space-y-5">
          <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500" />
            <div className="relative">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Workspace / insights</p>
              <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1><span className="rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-bold text-blue-700">{selectedPeriod}</span></div>
              <p className="mt-1 text-sm text-slate-600">Live performance summaries from your leads, deals, and follow-up activity.</p>
            </div>
            <div className="relative mt-4 flex flex-wrap items-center gap-2 sm:mt-0">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500"><MdCalendarToday /><span className="sr-only">Report date range</span><select className={inputClass} value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Report date range">{periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <button type="button" onClick={() => loadReportData(true)} disabled={refreshing || loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><MdRefresh className={refreshing ? "animate-spin" : ""} />Refresh</button>
              <button type="button" onClick={exportReport} disabled={loading || Boolean(loadError)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><MdDownload />Export CSV</button>
            </div>
          </section>

          {(error || notice) && <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`} role={error ? "alert" : "status"}><span>{error || notice}</span><button type="button" className="font-bold" onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss message">&times;</button></div>}
          {timeZoneError && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">{timeZoneError}</p>}

          {loadError ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center" role="alert">
              <h2 className="text-sm font-bold text-rose-900">Reports could not be loaded</h2>
              <p className="mt-1 text-sm text-rose-800">{loadError}</p>
              <button type="button" onClick={() => loadReportData()} disabled={loading} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"><MdRefresh />Retry</button>
            </section>
          ) : loading ? <ReportsLoadingSkeleton /> : <>
          <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
            <Metric label="Leads created" value={loading ? "—" : periodLeads.length} detail={`${leads.length} total in workspace`} icon={MdGroups} tone="bg-blue-50 text-blue-700" />
            <Metric label="Deal win rate" value={`${conversionRate}%`} detail={`${wonDeals.length} won of ${decidedDeals} decided deals`} icon={MdCheckCircle} tone="bg-emerald-50 text-emerald-700" />
            <Metric label="Weighted pipeline" value={loading ? "—" : weightedPipeline} detail={`${openDeals.length} open deals in selected period`} icon={MdAccountBalanceWallet} tone="bg-violet-50 text-violet-700" />
            <Metric label="Due-period completion rate" value={`${dueFollowUpCompletionRate}%`} detail={`${completedFollowUps.length} of ${scheduledFollowUpCount} due · cancelled excluded`} icon={MdOutlineEventAvailable} tone="bg-amber-50 text-amber-700" />
            <Metric label="Completed during period" value={loading ? "—" : completedDuringPeriod.length} detail="Based on completion timestamp; undated history excluded" icon={MdCalendarToday} tone="bg-cyan-50 text-cyan-700" />
          </section>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading title="Follow-up completion by scheduled date" detail={`${selectedDateRange} · ${timeZone} · cancelled items are excluded from the rate`} />
            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-700">Completed follow-ups due in period</span>
                <span className="font-bold text-slate-900">{completedFollowUps.length} / {scheduledFollowUpCount}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Due-period follow-up completion rate" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dueFollowUpCompletionRate}>
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${dueFollowUpCompletionRate}%` }} />
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-500">
                <span>{dueFollowUpCompletionRate}% completion rate · denominator is pending + completed follow-ups scheduled in range</span>
                <span>{cancelledFollowUps.length} cancelled excluded</span>
              </div>
              <p className="text-[11px] text-slate-500">The separate “Completed during period” total uses completion timestamps, even when the scheduled date is outside this period. Historical completed items without a timestamp are not counted in that total.</p>
            </div>
          </article>

          <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeading title="Activity trend" detail={`Leads and deals created · ${period === "all" ? "yearly trend" : selectedPeriod}`} action={<span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500"><MdArrowUpward className="text-blue-600" /> Leads <MdArrowDownward className="ml-2 text-violet-600" /> Deals</span>} />
              <div className="p-4 sm:p-5">
                {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading activity...</p>
                  : <div className="flex h-56 items-end gap-2 border-b border-slate-200 px-1 pb-2 sm:h-64 sm:gap-4 sm:px-3">
                    {trendBuckets.map((bucket, index) => {
                      const leadHeight = bucket.leads ? Math.max(8, (bucket.leads / maxTrend) * 100) : 0;
                      const dealHeight = bucket.deals ? Math.max(8, (bucket.deals / maxTrend) * 100) : 0;
                      return <div key={`${bucket.label}-${index}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                        <div className="mb-1 flex h-full w-full items-end justify-center gap-1">
                          <div title={`${bucket.leads} leads`} className="relative min-h-0 w-3/12 max-w-8 rounded-t-md bg-blue-500 transition-all sm:w-5/12" style={{ height: `${leadHeight}%` }} />
                          <div title={`${bucket.deals} deals`} className="relative min-h-0 w-3/12 max-w-8 rounded-t-md bg-violet-500 transition-all sm:w-5/12" style={{ height: `${dealHeight}%` }} />
                        </div>
                        <span className="mt-2 w-full truncate text-center text-[9px] font-semibold text-slate-500 sm:text-[10px]">{bucket.label}</span>
                      </div>;
                    })}
                  </div>}
                {!loading && !periodLeads.length && !periodDeals.length && <p className="mt-3 text-center text-xs text-slate-500">No lead or deal activity in this date range yet.</p>}
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeading title="Lead qualification" detail="Current lead status; historical Won/Lost lead values are retained as legacy statuses" action={<Link to="/leads" className="text-xs font-bold text-blue-700 hover:text-blue-800">View leads →</Link>} />
              <div className="space-y-4 p-4 sm:p-5">
                {leadStageRows.map((item) => <div key={item.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-slate-700">{item.name}</span><span className="text-slate-500">{item.count}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${stageColors[item.name]}`} style={{ width: `${(item.count / maxLeadStage) * 100}%` }} /></div>
                </div>)}
                {!loading && !periodLeads.length && <p className="py-6 text-center text-xs text-slate-500">No leads in this range.</p>}
              </div>
            </article>
          </section>

          <section className="grid gap-4 2xl:grid-cols-2">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeading title="Deals by stage" detail={`Value and count · ${selectedPeriod}`} action={<Link to="/deals" className="text-xs font-bold text-blue-700 hover:text-blue-800">Open deals →</Link>} />
              <div className="divide-y divide-slate-100">
                {dealStageRows.map((item) => <div key={item.name} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className={`h-8 w-1.5 flex-none rounded-full ${stageColors[item.name] || "bg-slate-400"}`} />
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-slate-800">{item.name}</p><p className="text-xs font-semibold text-slate-600">{item.count} deal{item.count === 1 ? "" : "s"}</p></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${stageColors[item.name] || "bg-slate-400"}`} style={{ width: `${item.share}%` }} /></div></div>
                  <span className="max-w-[45%] text-right text-xs font-bold text-slate-800">{item.value}</span>
                </div>)}
                {!loading && !periodDeals.length && <p className="p-6 text-center text-xs text-slate-500">No deals in this range. <Link className="font-bold text-blue-700" to="/deals">Create a deal</Link></p>}
              </div>
              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-600 sm:px-5"><span className="font-semibold">Won revenue:</span> {wonRevenue}</div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <SectionHeading title="Lead sources" detail="Where new leads in this period came from" action={<Link to="/leads" className="text-xs font-bold text-blue-700 hover:text-blue-800">View leads →</Link>} />
              <div className="space-y-4 p-4 sm:p-5">
                {sourceRows.map((item, index) => <div key={item.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-700">{item.name}</span><span className="flex-none text-slate-500">{item.count} · {item.share}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-pink-500", "bg-indigo-500"][index]}`} style={{ width: `${item.share}%` }} /></div>
                </div>)}
                {!loading && !sourceRows.length && <p className="py-8 text-center text-xs text-slate-500">No leads in this period.</p>}
              </div>
            </article>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading title="Upcoming follow-ups" detail="Next scheduled activities across your calendar" action={<Link to="/calendar" className="text-xs font-bold text-blue-700 hover:text-blue-800">Open calendar →</Link>} />
            {activityItems.length ? <div className="divide-y divide-slate-100">
              {activityItems.map((item) => <div key={item._id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-blue-50 text-blue-700"><MdCalendarToday /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{item.leadId?.name || "Unknown lead"} <span className="font-normal text-slate-500">· {item.type}</span></p><p className="mt-0.5 truncate text-[11px] text-slate-500">{item.leadId?.company || "No company"}{item.note ? ` · ${item.note}` : ""}</p></div>
                <span className="text-right text-xs font-semibold text-slate-600">{item.scheduledDate} · {item.scheduledTime}</span>
              </div>)}
            </div> : <div className="px-5 py-9 text-center"><p className="text-sm font-semibold text-slate-700">No pending follow-ups in this period</p><p className="mt-1 text-xs text-slate-500">Scheduled follow-ups will appear here.</p><Link to="/calendar" className="mt-3 inline-block text-xs font-bold text-blue-700">Go to calendar →</Link></div>}
          </section>

          <p className="text-center text-[10px] text-slate-400">Leads and deals are filtered by creation date. Follow-up completion totals use completion timestamps; the due-period rate uses scheduled dates from {selectedDateRange} and excludes cancelled items. Dates use {timeZone}. Deal stages are sale outcomes; lead Won/Lost values are historical only and do not determine deal win rate.</p>
          </>}
        </div>
      </main>
    </div>
  );
};

export default Reports;
