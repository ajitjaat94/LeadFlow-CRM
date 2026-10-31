import { useEffect, useMemo, useState } from "react";
import {
  MdArrowDownward,
  MdArrowForward,
  MdArrowUpward,
  MdBolt,
  MdCheckCircle,
  MdGroups,
  MdKeyboardArrowDown,
  MdPersonAddAlt1,
  MdQueryBuilder,
  MdTrendingUp,
} from "react-icons/md";
import DashboardSidebar from "../components/dashboard/DashboardSidebar";
import DashboardTopbar from "../components/dashboard/DashboardTopbar";
import LeadTable from "../components/LeadTable";
import { useLocation, useNavigate } from "react-router-dom";
import {
  deleteLead,
  getFollowUps,
  getLeadFields,
  getLeadStatus,
  getLeads,
  updateLead,
} from "../services/api";

const stages = ["New", "Contacted", "Qualified", "Won"];
const sourceColors = ["blue", "green", "pink", "violet", "slate"];
const chartPeriods = [
  { value: "7days", label: "Last 7 days", days: 7, buckets: 7 },
  { value: "30days", label: "Last 30 days", days: 30, buckets: 6 },
  { value: "90days", label: "Last 90 days", days: 90, buckets: 6 },
  { value: "7months", label: "Last 7 months", months: 7, buckets: 7 },
  { value: "12months", label: "Last 12 months", months: 12, buckets: 12 },
];

const getLeadSource = (lead) => {
  const customFields = lead.customFields || {};
  const sourceField = Object.entries(customFields).find(([key]) => key.toLowerCase() === "source");
  return lead.source || sourceField?.[1] || "Other";
};

const chartBounds = { left: 26, right: 674, top: 30, bottom: 165 };

const getChartX = (index, count) => (
  count > 1
    ? chartBounds.left + (index * (chartBounds.right - chartBounds.left)) / (count - 1)
    : (chartBounds.left + chartBounds.right) / 2
);

const getChartY = (value, maxValue) => (
  chartBounds.bottom - (value / maxValue) * (chartBounds.bottom - chartBounds.top)
);

const getTrendPath = (values, maxValue) => values.map((value, index) => {
  const x = getChartX(index, values.length);
  const y = getChartY(value, maxValue);
  return `${index === 0 ? "M" : "L"} ${x} ${y}`;
}).join(" ");

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authRequired = location.state?.authRequired;
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState({});
  const [error, setError] = useState("");
  const [customFields, setCustomFields] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("accessToken"));
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [chartPeriod, setChartPeriod] = useState("7months");
  const [greetingExpiresAt, setGreetingExpiresAt] = useState(
    () => Number(location.state?.greetingExpiresAt) || 0
  );
  const [greetingTime, setGreetingTime] = useState(() => {
    const expiresAt = Number(location.state?.greetingExpiresAt);
    return expiresAt ? new Date(expiresAt - 2 * 60 * 1000) : new Date();
  });

  useEffect(() => {
    if (!accessToken) return undefined;

    let active = true;
    Promise.all([getLeads(), getLeadStatus(), getLeadFields(), getFollowUps()])
      .then(([leadData, statusData, fieldData, followUps]) => {
        if (!active) return;
        setLeads(leadData || []);
        setStatus(statusData || {});
        setCustomFields(fieldData || []);
        setUpcomingFollowUps(
          (followUps || [])
            .filter((item) => item.status === "Pending")
            .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
        );
        setError("");
      })
      .catch((requestError) => {
        if (active && requestError.response?.status !== 401) {
          setError("Unable to load dashboard data. Please check your API connection.");
        }
      });

    return () => { active = false; };
  }, [accessToken]);

  useEffect(() => {
    if (!greetingExpiresAt) return undefined;

    const timeoutId = window.setTimeout(
      () => {
        setGreetingExpiresAt(0);
        navigate(location.pathname, { replace: true, state: {} });
      },
      Math.max(0, greetingExpiresAt - Date.now())
    );
    return () => window.clearTimeout(timeoutId);
  }, [greetingExpiresAt, location.pathname, navigate]);

  const handleDeleteLead = async (id) => {
    try {
      await deleteLead(id);
      setLeads((currentLeads) => currentLeads.filter((lead) => lead._id !== id));
    } catch {
      setError("Unable to delete this lead.");
    }
  };

  const handleStatusChange = async (id, nextStatus) => {
    const previousLead = leads.find((lead) => lead._id === id);
    setLeads((currentLeads) => currentLeads.map((lead) => (
      lead._id === id ? { ...lead, status: nextStatus } : lead
    )));
    try {
      await updateLead(id, { status: nextStatus });
    } catch {
      setLeads((currentLeads) => currentLeads.map((lead) => (
        lead._id === id ? { ...lead, status: previousLead.status } : lead
      )));
      setError("Unable to save the status change.");
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const search = searchTerm.toLowerCase();
    return [lead.name, lead.company, lead.email, lead.status, lead.phone]
      .some((value) => value?.toLowerCase().includes(search));
  });

  const leadMetrics = useMemo(() => {
    const countStatus = (name) => leads.filter((lead) => lead.status === name).length;
    const converted = countStatus("Won");
    const lost = countStatus("Lost");
    return {
      total: status.totalLeads ?? leads.length,
      converted,
      inProgress: leads.filter((lead) => !["Won", "Lost"].includes(lead.status)).length,
      lost,
      conversionRate: leads.length ? Math.round((converted / leads.length) * 100) : 0,
    };
  }, [leads, status.totalLeads]);

  const sourceStats = useMemo(() => {
    const counts = leads.reduce((result, lead) => {
      const source = String(getLeadSource(lead) || "Other");
      result[source] = (result[source] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percentage: leads.length ? Math.round((count / leads.length) * 100) : 0,
      }));
  }, [leads]);

  const pipelineCounts = stages.map((stage) => ({
    stage,
    count: leads.filter((lead) => lead.status === stage).length,
  }));
  const allStatuses = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
  const statusCounts = allStatuses.map((name) => ({
    name,
    count: leads.filter((lead) => lead.status === name).length,
  }));
  const maxStatusCount = Math.max(1, ...statusCounts.map((item) => item.count));

  const chartData = useMemo(() => {
    const now = new Date();
    const period = chartPeriods.find((item) => item.value === chartPeriod) || chartPeriods[3];
    let buckets;

    if (period.months) {
      buckets = Array.from({ length: period.buckets }, (_, index) => {
        const monthOffset = period.months - period.buckets + index;
        const start = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        return { start, end };
      }).reverse();
    } else {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - period.days + 1);
      const bucketDuration = (period.days * 24 * 60 * 60 * 1000) / period.buckets;
      buckets = Array.from({ length: period.buckets }, (_, index) => ({
        start: new Date(start.getTime() + index * bucketDuration),
        end: new Date(start.getTime() + (index + 1) * bucketDuration),
      }));
    }

    const leadsPerBucket = buckets.map(({ start, end }) => leads.filter((lead) => {
      const createdAt = new Date(lead.createdAt);
      return createdAt >= start && createdAt < end;
    }));
    const monthlyLeads = leadsPerBucket.map((bucket) => bucket.length);
    const monthlyWon = leadsPerBucket.map((bucket) => bucket.filter((lead) => lead.status === "Won").length);
    const largestValue = Math.max(0, ...monthlyLeads, ...monthlyWon);
    const axisMax = largestValue <= 4 ? Math.max(1, largestValue) : Math.ceil(largestValue / 4) * 4;
    const tickCount = Math.min(axisMax, 4);
    const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
      const value = axisMax - (index * axisMax) / tickCount;
      const y = chartBounds.top + (index * (chartBounds.bottom - chartBounds.top)) / tickCount;
      return { value, y };
    });
    return {
      label: period.label,
      labels: buckets.map(({ start }) => start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })),
      leads: monthlyLeads,
      won: monthlyWon,
      max: axisMax,
      ticks,
      hasActivity: monthlyLeads.some(Boolean) || monthlyWon.some(Boolean),
    };
  }, [chartPeriod, leads]);

  const recentLeads = [...leads].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  const userName = (() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return user?.username?.split(" ")[0] || "there";
    } catch {
      return "there";
    }
  })();
  const greeting = greetingTime.getHours() < 12
    ? "Good morning"
    : greetingTime.getHours() < 17
      ? "Good afternoon"
      : "Good evening";

  const handleExportCSV = () => {
    if (!leads.length) {
      alert("No leads available to export.");
      return;
    }
    const headers = ["Name", "Company", "Email", "Phone", "Status", "Notes"];
    const rows = leads.map((lead) => [lead.name, lead.company, lead.email, lead.phone, lead.status, lead.notes]);
    const csvLines = [
      headers.join(","),
      ...rows.map((row) => row.map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(",")),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`crm-shell crm-dashboard-shell ${sidebarOpen ? "crm-sidebar-expanded" : "crm-sidebar-collapsed"}`}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => {
        if (window.innerWidth <= 760) setSidebarOpen(false);
      }} onToggle={() => setSidebarOpen((open) => !open)} />
      <main className="crm-main">
        <DashboardTopbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAddLead={() => navigate("/leads/new")}
          authRequired={authRequired}
          onAuthenticated={(authData) => {
            setAccessToken(authData.accessToken);
            if (authData.accessToken && authData.greetingExpiresAt) {
              setGreetingTime(new Date(authData.greetingExpiresAt - 2 * 60 * 1000));
              setGreetingExpiresAt(authData.greetingExpiresAt);
            } else {
              setGreetingExpiresAt(0);
              setLeads([]);
              setStatus({});
              setCustomFields([]);
              setUpcomingFollowUps([]);
            }
          }}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          sidebarOpen={sidebarOpen}
        />
        <div className="crm-page crm-dashboard-page">
          {error && <div className="crm-dashboard-error" role="alert">{error}</div>}

          <section className="crm-dashboard-overview">
            <div className="crm-dashboard-heading">
              <div>
                <p className="crm-dashboard-eyebrow">Workspace overview</p>
                {greetingExpiresAt > 0 && (
                  <h1>{greeting}, {userName}! <span aria-hidden="true">👋</span></h1>
                )}
                <p>Here&apos;s what&apos;s happening with your CRM today.</p>
              </div>
              <div className="crm-today-pill">
                <span>Today</span>
                <span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </div>
            </div>

            <div className="crm-metrics-grid">
              <article className="crm-dashboard-metric crm-metric-blue">
                <span className="crm-dashboard-metric-icon"><MdGroups size={22} /></span>
                <p>Total leads</p>
                <strong>{leadMetrics.total}</strong>
                <span className="crm-dashboard-metric-detail"><MdTrendingUp /> Your pipeline</span>
                <span className="crm-metric-sparkline crm-sparkline-blue" aria-hidden="true" />
              </article>
              <article className="crm-dashboard-metric crm-metric-violet">
                <span className="crm-dashboard-metric-icon"><MdCheckCircle size={22} /></span>
                <p>Converted</p>
                <strong>{leadMetrics.converted}</strong>
                <span className="crm-dashboard-metric-detail"><MdArrowUpward /> {leadMetrics.conversionRate}% conversion</span>
                <span className="crm-metric-sparkline crm-sparkline-violet" aria-hidden="true" />
              </article>
              <article className="crm-dashboard-metric crm-metric-sky">
                <span className="crm-dashboard-metric-icon"><MdBolt size={22} /></span>
                <p>In progress</p>
                <strong>{leadMetrics.inProgress}</strong>
                <span className="crm-dashboard-metric-detail"><MdQueryBuilder /> Active opportunities</span>
                <span className="crm-metric-sparkline crm-sparkline-sky" aria-hidden="true" />
              </article>
              <article className="crm-dashboard-metric crm-metric-rose">
                <span className="crm-dashboard-metric-icon"><MdArrowDownward size={22} /></span>
                <p>Lost</p>
                <strong>{leadMetrics.lost}</strong>
                <span className="crm-dashboard-metric-detail crm-metric-negative">Closed lost</span>
                <span className="crm-metric-sparkline crm-sparkline-rose" aria-hidden="true" />
              </article>
            </div>
          </section>

          <div className="crm-dashboard-grid crm-dashboard-grid-primary">
            <section className="crm-dashboard-card crm-lead-overview-card">
              <div className="crm-dashboard-card-heading">
                <div><h2>Leads overview</h2><p>Lead creation and conversions · {chartData.label.toLowerCase()}</p></div>
                <label className="relative inline-flex shrink-0 items-center">
                  <span className="sr-only">Chart time period</span>
                  <select
                    className="crm-period-label cursor-pointer appearance-none pr-7 outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                    value={chartPeriod}
                    onChange={(event) => setChartPeriod(event.target.value)}
                  >
                    {chartPeriods.map((period) => (
                      <option key={period.value} value={period.value}>{period.label}</option>
                    ))}
                  </select>
                  <MdKeyboardArrowDown className="pointer-events-none absolute right-2 text-slate-500" size={16} aria-hidden="true" />
                </label>
              </div>
              <div className="crm-chart-legend">
                <span><i className="crm-legend-blue" />New leads</span>
                <span><i className="crm-legend-violet" />Converted</span>
              </div>
              <div className="crm-line-chart relative">
                <div className="crm-chart-y-labels">
                  {chartData.ticks.map((tick) => (
                    <span key={`${tick.value}-${tick.y}`}>{tick.value}</span>
                  ))}
                </div>
                <svg viewBox="0 0 680 200" role="img" aria-label={`New leads and conversions for ${chartData.label.toLowerCase()}`}>
                  {chartData.ticks.map((tick) => (
                    <line key={tick.y} x1="24" y1={tick.y} x2="670" y2={tick.y} className="crm-chart-gridline" />
                  ))}
                  {chartData.hasActivity && (
                    <>
                      <path
                        d={`${getTrendPath(chartData.leads, chartData.max)} L ${chartBounds.right} ${chartBounds.bottom} L ${chartBounds.left} ${chartBounds.bottom} Z`}
                        className="crm-chart-area-blue"
                      />
                      <path d={getTrendPath(chartData.leads, chartData.max)} className="crm-chart-line-blue" />
                      <path d={getTrendPath(chartData.won, chartData.max)} className="crm-chart-line-violet" />
                      {chartData.leads.map((value, index) => (
                        <circle
                          key={`lead-${chartData.labels[index]}`}
                          cx={getChartX(index, chartData.leads.length)}
                          cy={getChartY(value, chartData.max)}
                          r="4"
                          className="fill-blue-600 stroke-white stroke-2"
                        >
                          <title>{`${chartData.labels[index]}: ${value} new leads`}</title>
                        </circle>
                      ))}
                      {chartData.won.map((value, index) => (
                        <circle
                          key={`won-${chartData.labels[index]}`}
                          cx={getChartX(index, chartData.won.length)}
                          cy={getChartY(value, chartData.max)}
                          r="4"
                          className="fill-violet-600 stroke-white stroke-2"
                        >
                          <title>{`${chartData.labels[index]}: ${value} conversions`}</title>
                        </circle>
                      ))}
                    </>
                  )}
                </svg>
                {!chartData.hasActivity && (
                  <p className="absolute inset-0 grid place-items-center text-center text-xs font-medium text-slate-400">
                    No lead activity during this period
                  </p>
                )}
              </div>
              <div className="crm-chart-x-labels" style={{ gridTemplateColumns: `repeat(${chartData.labels.length}, minmax(0, 1fr))` }}>
                {chartData.labels.map((label) => <span key={label}>{label}</span>)}
              </div>
            </section>

            <section className="crm-dashboard-card">
              <div className="crm-dashboard-card-heading">
                <div><h2>Lead sources</h2><p>Where your leads come from</p></div>
                <span className="crm-period-label">All time</span>
              </div>
              <div className="crm-source-list">
                {sourceStats.length ? sourceStats.map((source, index) => (
                  <div className="crm-source-item" key={source.name}>
                    <span className={`crm-source-icon crm-source-${sourceColors[index]}`}><MdPersonAddAlt1 size={17} /></span>
                    <div className="crm-source-content">
                      <div className="crm-source-label"><strong>{source.name}</strong><span>{source.percentage}%</span></div>
                      <div className="crm-source-track"><span className={`crm-source-fill crm-source-fill-${sourceColors[index]}`} style={{ width: `${source.percentage}%` }} /></div>
                    </div>
                  </div>
                )) : <p className="crm-dashboard-empty">Add leads to see your sources.</p>}
              </div>
            </section>
          </div>

          <div className="crm-dashboard-grid crm-dashboard-grid-secondary">
            <section className="crm-dashboard-card">
              <div className="crm-dashboard-card-heading">
                <div><h2>Sales pipeline</h2><p>Leads by current stage</p></div>
                <button className="crm-text-link" type="button" onClick={() => navigate("/leads")}>View leads <MdArrowForward /></button>
              </div>
              <div className="crm-pipeline-stages">
                {pipelineCounts.map((item, index) => (
                  <div className={`crm-pipeline-stage crm-pipeline-stage-${index}`} key={item.stage}>
                    <span>{item.stage === "Won" ? "Closed" : item.stage}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="crm-dashboard-card">
              <div className="crm-dashboard-card-heading">
                <div><h2>Upcoming tasks</h2><p>Your next scheduled follow-ups</p></div>
                <button className="crm-text-link" type="button" onClick={() => navigate("/follow-ups")}>View all <MdArrowForward /></button>
              </div>
              <ul className="crm-dashboard-task-list">
                {upcomingFollowUps.slice(0, 4).map((item) => (
                  <li key={item._id}>
                    <span className="crm-task-status-dot" />
                    <span className="crm-task-name">{item.type} {item.leadId?.name ? `with ${item.leadId.name}` : ""}</span>
                    <span className="crm-task-date">{item.scheduledDate}</span>
                  </li>
                ))}
                {upcomingFollowUps.length === 0 && <li className="crm-dashboard-empty">No upcoming tasks scheduled.</li>}
              </ul>
            </section>
          </div>

          <div className="crm-dashboard-grid crm-dashboard-grid-secondary">
            <section className="crm-dashboard-card crm-recent-leads-card">
              <div className="crm-dashboard-card-heading">
                <div><h2>Recent leads</h2><p>Your latest opportunities in one view</p></div>
                <button className="crm-text-link" type="button" onClick={() => navigate("/leads")}>View all <MdArrowForward /></button>
              </div>
              <LeadTable
                leads={filteredLeads.length ? recentLeads.filter((lead) => filteredLeads.some((item) => item._id === lead._id)).slice(0, 5) : []}
                customFields={customFields}
                onView={(id) => navigate(`/lead/${id}`)}
                onDelete={handleDeleteLead}
                onEdit={(id) => navigate(`/lead/${id}`)}
                onStatusChange={handleStatusChange}
              />
            </section>

            <section className="crm-dashboard-card">
              <div className="crm-dashboard-card-heading">
                <div><h2>Recent activity</h2><p>Latest leads added to your workspace</p></div>
                <button className="crm-text-link" type="button" onClick={() => navigate("/leads")}>View all <MdArrowForward /></button>
              </div>
              <ul className="crm-dashboard-activity-list">
                {recentLeads.slice(0, 5).map((lead) => (
                  <li key={lead._id}>
                    <span className="crm-activity-avatar">{lead.name?.slice(0, 1).toUpperCase() || "L"}</span>
                    <span className="crm-activity-copy">
                      <strong>{lead.name || "New lead"}</strong>
                      <small>{lead.company || "Lead"} · {lead.status || "New"}</small>
                    </span>
                    <span className="crm-activity-status">{lead.status || "New"}</span>
                  </li>
                ))}
                {recentLeads.length === 0 && <li className="crm-dashboard-empty">New lead activity will appear here.</li>}
              </ul>
            </section>
          </div>

          <div className="crm-dashboard-grid crm-dashboard-grid-secondary crm-dashboard-grid-bottom">
            <section className="crm-dashboard-card crm-conversion-card">
              <div className="crm-dashboard-card-heading">
                <div><h2>Conversion rate</h2><p>Leads converted to won</p></div>
              </div>
              <div className="crm-conversion-content">
                <div className="crm-conversion-donut" style={{ "--conversion-rate": `${leadMetrics.conversionRate}%` }}>
                  <div><strong>{leadMetrics.conversionRate}%</strong><span>Conversion</span></div>
                </div>
                <div className="crm-conversion-legend">
                  <p><i className="crm-legend-blue" /><strong>{leadMetrics.total}</strong> Total leads</p>
                  <p><i className="crm-legend-green" /><strong>{leadMetrics.converted}</strong> Converted</p>
                  <p><i className="crm-legend-amber" /><strong>{leadMetrics.inProgress}</strong> In progress</p>
                  <p><i className="crm-legend-rose" /><strong>{leadMetrics.lost}</strong> Lost</p>
                </div>
              </div>
            </section>

            <section className="crm-dashboard-card">
              <div className="crm-dashboard-card-heading">
                <div><h2>Pipeline health</h2><p>Current lead distribution by stage</p></div>
              </div>
              <div className="crm-health-list">
                {statusCounts.map((item, index) => (
                  <div className="crm-health-row" key={item.name}>
                    <span>{item.name}</span>
                    <div className="crm-health-track"><i style={{ width: `${(item.count / maxStatusCount) * 100}%` }} /></div>
                    <strong>{item.count}</strong>
                    {index === 0 && <span className="crm-health-spacer" />}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <button className="crm-dashboard-export" type="button" onClick={handleExportCSV}>
            <span><strong>Export lead report</strong><small>Download a CSV snapshot of your leads.</small></span>
            <MdArrowForward size={19} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
