import { useEffect, useMemo, useState } from "react";
import { MdCheckCircle, MdClose, MdRadioButtonUnchecked, MdRefresh } from "react-icons/md";
import { Link } from "react-router-dom";
import { getDeals, getFollowUps, getLeads } from "../services/api";
import { getProgressStorageKey } from "../utils/progressStorage";

const steps = [
  { key: "leads", label: "Add or import a lead", href: "/leads" },
  { key: "followUps", label: "Schedule a follow-up", href: "/follow-ups" },
  { key: "deals", label: "Create a deal", href: "/deals" },
  { key: "reports", label: "Review reports", href: "/reports" },
];

const GettingStartedChecklist = ({ enabled }) => {
  const dismissedKey = useMemo(() => getProgressStorageKey("getting-started-dismissed"), []);
  const reportsKey = useMemo(() => getProgressStorageKey("reports-reviewed"), []);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissedKey) === "true");
  const [records, setRecords] = useState({ leads: null, followUps: null, deals: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [reportsReviewed] = useState(() => localStorage.getItem(reportsKey) === "true");

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    Promise.allSettled([getLeads(), getFollowUps(), getDeals()])
      .then(([leadsResult, followUpsResult, dealsResult]) => {
        if (!active) return;
        const nextRecords = {
          leads: leadsResult.status === "fulfilled" ? leadsResult.value : null,
          followUps: followUpsResult.status === "fulfilled" ? followUpsResult.value : null,
          deals: dealsResult.status === "fulfilled" ? dealsResult.value : null,
        };
        setRecords(nextRecords);
        const failures = [
          leadsResult.status === "rejected" && "leads",
          followUpsResult.status === "rejected" && "follow-ups",
          dealsResult.status === "rejected" && "deals",
        ].filter(Boolean);
        setError(failures.length ? `Unable to load ${failures.join(", ")} for checklist progress.` : "");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [enabled, retry]);

  const completed = {
    leads: Boolean(records.leads?.length),
    followUps: Boolean(records.followUps?.length),
    deals: Boolean(records.deals?.length),
    reports: reportsReviewed,
  };
  const completeCount = steps.filter((step) => completed[step.key]).length;

  if (!enabled || dismissed) return null;

  return (
    <section className="mb-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="getting-started-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Getting started</p>
          <h2 id="getting-started-title" className="mt-1 text-lg font-bold text-slate-900">Your next steps</h2>
          <p className="mt-1 text-sm text-slate-600">{completeCount} of {steps.length} complete. Follow the steps that fit your workflow; you can dismiss this checklist anytime.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(dismissedKey, "true");
            setDismissed(true);
          }}
          className="grid h-9 w-9 flex-none place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-label="Dismiss getting-started checklist"
        >
          <MdClose />
        </button>
      </div>
      {error && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert"><span>{error} Incomplete items will remain unmarked.</span><button type="button" className="inline-flex min-h-8 items-center gap-1 font-semibold" onClick={() => { setLoading(true); setRetry((count) => count + 1); }}><MdRefresh />Retry</button></div>}
      {loading && <p className="mt-3 text-xs text-slate-500" role="status">Checking saved records…</p>}
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li key={step.key}>
            {completed[step.key] ? (
              <span className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                <MdCheckCircle className="flex-none" aria-hidden="true" />{step.label}
              </span>
            ) : (
              <Link to={step.href} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                <MdRadioButtonUnchecked className="flex-none text-slate-400" aria-hidden="true" />{step.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};

export default GettingStartedChecklist;
