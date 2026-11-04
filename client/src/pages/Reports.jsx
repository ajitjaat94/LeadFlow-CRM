import { useEffect, useMemo, useState } from "react";
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
import { getDeals, getFollowUps, getLeads } from "../services/api";

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
  Prospecting: "bg-sky-500",
  Qualification: "bg-indigo-500",
};

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
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
  const source = Object.entries(fields).find(([key]) => key.toLowerCase() === "source")?.[1];
  return String(lead.source || source || "Other").trim() || "Other";
};

const getRangeStart = (periodValue, now) => {
  if (periodValue === "all") return null;
  const selected = periods.find((item) => item.value === periodValue) || periods[0];
  if (selected.months) return new Date(now.getFullYear(), now.getMonth() - selected.months + 1, 1);
  const start = startOfDay(now);
  start.setDate(start.getDate() - selected.days + 1);
  return start;
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

const Reports = () => {
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [period, setPeriod] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [now] = useState(() => new Date());

  const loadReportData = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const [leadData, dealData, followUpData] = await Promise.all([
        getLeads(),
        getDeals(),
        getFollowUps(),
      ]);
      setLeads(leadData || []);
      setDeals(dealData || []);
      setFollowUps(followUpData || []);
      setError("");
      if (refresh) setNotice("Reports updated with the latest CRM data.");
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        setError(requestError.response?.data?.message || "Unable to load reports. Check the API connection and try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([getLeads(), getDeals(), getFollowUps()])
      .then(([leadData, dealData, followUpData]) => {
        if (!active) return;
        setLeads(leadData || []);
        setDeals(dealData || []);
        setFollowUps(followUpData || []);
        setError("");
      })
      .catch((requestError) => {
        if (active && requestError.response?.status !== 401) {
          setError(requestError.response?.data?.message || "Unable to load reports. Check the API connection and try again.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rangeStart = useMemo(() => getRangeStart(period, now), [now, period]);
  const periodLeads = useMemo(() => leads.filter((item) => {
    const createdAt = getCreatedAt(item);
    return createdAt && createdAt <= now && (!rangeStart || createdAt >= rangeStart);
  }), [leads, now, rangeStart]);
  const periodDeals = useMemo(() => deals.filter((item) => {
    const createdAt = getCreatedAt(item);
    return createdAt && createdAt <= now && (!rangeStart || createdAt >= rangeStart);
  }), [deals, now, rangeStart]);
  const periodFollowUps = useMemo(() => followUps.filter((item) => (
    item.scheduledDate
      && item.scheduledDate <= dateKey(now)
      && (!rangeStart || item.scheduledDate >= dateKey(rangeStart))
  )), [followUps, now, rangeStart]);

  const wonLeads = periodLeads.filter((item) => item.status === "Won");
  const lostLeads = periodLeads.filter((item) => item.status === "Lost");
  const openDeals = periodDeals.filter((item) => !["Won", "Lost"].includes(item.stage));
  const wonDeals = periodDeals.filter((item) => item.stage === "Won");
  const pendingFollowUps = periodFollowUps.filter((item) => item.status === "Pending");
  const completedFollowUps = periodFollowUps.filter((item) => item.status === "Completed");
  const conversionRate = periodLeads.length ? Math.round((wonLeads.length / periodLeads.length) * 100) : 0;
  const completionRate = periodFollowUps.length ? Math.round((completedFollowUps.length / periodFollowUps.length) * 100) : 0;
  const weightedPipeline = groupedMoney(openDeals, (item) => (Number(item.value) || 0) * (Number(item.probability) || 0) / 100);
  const wonRevenue = groupedMoney(wonDeals, (item) => Number(item.value) || 0);

  const leadStageRows = LEAD_STATUSES.map((stage) => ({
    name: stage,
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
    if (period === "12months") {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return Array.from({ length: 12 }, (_, index) => {
        const bucketStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + index, 1);
        const bucketEnd = new Date(bucketStart.getFullYear(), bucketStart.getMonth() + 1, 1);
        const getCount = (items) => items.filter((item) => {
          const createdAt = getCreatedAt(item);
          return createdAt && createdAt >= bucketStart && createdAt < bucketEnd;
        }).length;
        return {
          label: bucketStart.toLocaleDateString(undefined, { month: "short" }),
          leads: getCount(periodLeads),
          deals: getCount(periodDeals),
        };
      });
    }

    if (period === "all") {
      const dates = [...leads, ...deals].map(getCreatedAt).filter(Boolean);
      const oldest = dates.length
        ? dates.reduce((minimum, date) => (date < minimum ? date : minimum), dates[0])
        : now;
      const firstYear = Math.max(oldest.getFullYear(), now.getFullYear() - 11);
      return Array.from({ length: now.getFullYear() - firstYear + 1 }, (_, index) => {
        const year = firstYear + index;
        const bucketStart = new Date(year, 0, 1);
        const bucketEnd = new Date(year + 1, 0, 1);
        const getCount = (items) => items.filter((item) => {
          const createdAt = getCreatedAt(item);
          return createdAt && createdAt >= bucketStart && createdAt < bucketEnd;
        }).length;
        return { label: String(year), leads: getCount(periodLeads), deals: getCount(periodDeals) };
      });
    }

    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const start = rangeStart || (() => {
      const dates = [...leads, ...deals].map(getCreatedAt).filter(Boolean);
      if (!dates.length) return new Date(end.getFullYear(), end.getMonth(), 1);
      const earliest = new Date(dates.reduce((minimum, date) => Math.min(minimum, date.getTime()), Number.POSITIVE_INFINITY));
      return new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    })();
    const span = Math.max(1, end.getTime() - start.getTime());
    const bucketCount = 6;
    return Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = new Date(start.getTime() + (span * index) / bucketCount);
      const bucketEnd = index === bucketCount - 1
        ? end
        : new Date(start.getTime() + (span * (index + 1)) / bucketCount);
      const leadsCount = periodLeads.filter((item) => {
        const createdAt = getCreatedAt(item);
        return createdAt && createdAt >= bucketStart && createdAt < bucketEnd;
      }).length;
      const dealsCount = periodDeals.filter((item) => {
        const createdAt = getCreatedAt(item);
        return createdAt && createdAt >= bucketStart && createdAt < bucketEnd;
      }).length;
      return {
        label: bucketStart.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        leads: leadsCount,
        deals: dealsCount,
      };
    });
  }, [deals, leads, now, period, periodDeals, periodLeads, rangeStart]);

  const maxTrend = Math.max(1, ...trendBuckets.flatMap((item) => [item.leads, item.deals]));
  const activityItems = [...followUps]
    .filter((item) => item.status === "Pending"
      && item.scheduledDate
      && item.scheduledTime
      && new Date(`${item.scheduledDate}T${item.scheduledTime}`) >= now)
    .sort((first, second) => `${first.scheduledDate}T${first.scheduledTime}`.localeCompare(`${second.scheduledDate}T${second.scheduledTime}`))
    .slice(0, 6);

  const exportReport = () => {
    if (!periodLeads.length && !periodDeals.length && !periodFollowUps.length) {
      setError("There is no report data in the selected date range to export.");
      return;
    }
    const rows = [
      ["Report section", "Name", "Count", "Value / details"],
      ["Summary", "Leads created", periodLeads.length, ""],
      ["Summary", "Won leads", wonLeads.length, `${conversionRate}% conversion rate`],
      ["Summary", "Lost leads", lostLeads.length, ""],
      ["Summary", "Open deals", openDeals.length, weightedPipeline],
      ["Summary", "Won deals", wonDeals.length, wonRevenue],
      ["Summary", "Pending follow-ups", pendingFollowUps.length, ""],
      ...leadStageRows.map((item) => ["Lead stage", item.name, item.count, ""]),
      ...dealStageRows.map((item) => ["Deal stage", item.name, item.count, item.value]),
      ...sourceRows.map((item) => ["Lead source", item.name, item.count, `${item.share}%`]),
      ...["Pending", "Completed", "Cancelled"].map((status) => [
        "Follow-up status",
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
  const inputClass = "min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className={`crm-shell crm-dashboard-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => { if (window.innerWidth <= 760) setSidebarOpen(false); }} onToggle={() => setSidebarOpen((open) => !open)} />
      <main className="crm-main">
        <DashboardTopbar searchTerm="" onSearchChange={() => {}} onAddLead={exportReport} addButtonLabel="Export report" onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarOpen={sidebarOpen} />
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
              <button type="button" onClick={exportReport} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"><MdDownload />Export CSV</button>
            </div>
          </section>

          {(error || notice) && <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`} role={error ? "alert" : "status"}><span>{error || notice}</span><button type="button" className="font-bold" onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss message">&times;</button></div>}

          <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <Metric label="Leads created" value={loading ? "—" : periodLeads.length} detail={`${leads.length} total in workspace`} icon={MdGroups} tone="bg-blue-50 text-blue-700" />
            <Metric label="Lead win rate" value={`${conversionRate}%`} detail={`${wonLeads.length} won · ${lostLeads.length} lost`} icon={MdCheckCircle} tone="bg-emerald-50 text-emerald-700" />
            <Metric label="Weighted pipeline" value={loading ? "—" : weightedPipeline} detail={`${openDeals.length} open deals in selected period`} icon={MdAccountBalanceWallet} tone="bg-violet-50 text-violet-700" />
            <Metric label="Follow-ups completed" value={`${completionRate}%`} detail={`${completedFollowUps.length} of ${periodFollowUps.length} scheduled`} icon={MdOutlineEventAvailable} tone="bg-amber-50 text-amber-700" />
          </section>

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
              <SectionHeading title="Lead pipeline" detail="Current status of leads created in this period" action={<Link to="/leads" className="text-xs font-bold text-blue-700 hover:text-blue-800">View leads →</Link>} />
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
                {!loading && !sourceRows.length && <p className="py-8 text-center text-xs text-slate-500">No source information available for this period. Leads without a source are counted as “Other”.</p>}
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

          {!loading && <p className="text-center text-[10px] text-slate-400">Report period filters leads and deals by creation date and follow-up completion by scheduled date through today. Lead stage reflects its current status.</p>}
          {loading && <span className="sr-only" role="status">Loading report data</span>}
        </div>
      </main>
    </div>
  );
};

export default Reports;
