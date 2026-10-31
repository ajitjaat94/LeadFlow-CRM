const MetricCard = ({ label, value, change, detail, icon: Icon, tone = "blue" }) => (
  <article className={`crm-metric-card crm-metric-${tone}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="crm-metric-label">{label}</p>
        <p className="crm-metric-value">{value}</p>
      </div>
      <span className="crm-metric-icon"><Icon size={22} /></span>
    </div>
    <div className="mt-4 flex items-center gap-2 text-xs">
      <span className="crm-metric-change">↗ {change}</span>
      <span className="text-slate-400">{detail}</span>
    </div>
  </article>
);

export default MetricCard;
