const statusStyles = {
  New: "bg-purple-500/10 border-purple-500/25 text-purple-400",
  Contacted: "bg-blue-500/10   border-blue-500/20   text-blue-400",
  Qualified: "bg-[#d9ff00]/8   border-[#d9ff00]/20  text-[#d9ff00]",
  Closed: "bg-green-500/10  border-green-500/20  text-green-400",
  Lost: "bg-red-500/10    border-red-500/20    text-red-400",
};


const StatusBadge = ({ status }) => {
  const style = statusStyles[status] || statusStyles.New;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};

const LeadTable = ({ leads = [], onView, onEdit, onDelete }) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-purple-500/20 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
        <h2 className="text-sm font-extrabold text-black font-mono tracking-tight">
          Lead<span className="text-purple-400">flow</span> — Leads
        </h2>
        <span className="text-[11px] font-mono text-black bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
          {leads.length} leads
        </span>
      </div>

      {/* ✅ Desktop Table — hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/6">
              {["Name", "Company", "Email", "Phone", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-mono tracking-[0.2em] uppercase text-black font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead._id}
                className="border-b border-white/6 hover:bg-purple-500/10 transition-colors duration-200 last:border-b-0"
              >
                <td className="px-4 py-3 text-sm font-bold text-black whitespace-nowrap">
                  {lead.name}
                </td>
                <td className="px-4 py-3 text-sm text-black/60 whitespace-nowrap">
                  {lead.company}
                </td>
                <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">
                  {lead.email}
                </td>
                <td className="px-4 py-3 text-sm text-black/60 whitespace-nowrap">
                  {lead.phone}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    
                    <button
                      onClick={() => onEdit?.(lead._id)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono border bg-green-500/7 border-green-500/20 text-green-500 hover:bg-green-500/15 transition-all duration-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete?.(lead._id)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono border bg-red-500/8 border-red-500/20 text-red-400 hover:bg-red-500/15 transition-all duration-200"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ Mobile Cards — shown only on small screens */}
      <div className="md:hidden divide-y divide-white/4">
        {leads.map((lead) => (
          <div
            key={lead._id}
            className="p-4 hover:bg-purple-500/10 transition-colors duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-black">{lead.name}</p>
                <p className="text-xs text-black/45 mt-0.5">{lead.company}</p>
              </div>
              <StatusBadge status={lead.status} />
            </div>

            <div className="space-y-1 mb-4">
              <p className="text-xs text-black/40">{lead.email}</p>
              <p className="text-xs text-black/40">{lead.phone}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onView?.(lead)}
                className="flex-1 py-2 rounded-xl text-xs font-bold font-mono border bg-purple-500/10 border-purple-500/25 text-purple-400 hover:bg-purple-500/20 transition-all duration-200"
              >
                View
              </button>
              <button
                onClick={() => onEdit?.(lead)}
                className="flex-1 py-2 rounded-xl text-xs font-bold font-mono border bg-green-500/7 border-green-500/20 text-green-500 hover:bg-green-500/15  transition-all duration-200"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete?.(lead._id)}
                className="flex-1 py-2 rounded-xl text-xs font-bold font-mono border bg-red-500/8 border-red-500/20 text-red-400 hover:bg-red-500/15 transition-all duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {leads.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-white/20 font-mono text-sm">// no leads found</p>
        </div>
      )}
    </div>
  );
};

export default LeadTable;
