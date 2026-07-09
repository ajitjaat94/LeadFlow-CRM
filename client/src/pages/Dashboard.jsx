import Navebar from "../components/Navebar";
import StatusCard from "../components/StatusCard";
import LeadTable from "../components/LeadTable";
import { useState, useEffect } from "react";
import { CiAlignBottom } from "react-icons/ci";
import { GiNotebook, GiCrossMark } from "react-icons/gi";
import { FaListCheck } from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authRequired = location.state?.authRequired;
  const [status, setStatus] = useState({});
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getLeadsStatus = async () => {
    try {
      // Make API call to fetch dashboard status
      const response = await api.get("/leads/status");

      setStatus(response.data);
    } catch (err) {
      console.error("Status Error:", err);
      setError("Failed to load dashboard status");
    }
  };

  const getLeads = async () => {
    try {
      // Make API call to fetch leads data
      const response = await api.get("/leads");

      console.log(response.data);

      setLeads(response.data.data);
    } catch (err) {
      console.error("Leads Error:", err);
      setError("Failed to load leads");
    }
  };
  // Delete api call
  const deleteLead = async (id) => {
    try {
      await api.delete(`/leads/${id}`);
      // Refresh leads after deletion
      await getLeads();
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const search = searchTerm.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(search) ||
      lead.company?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.status?.toLowerCase().includes(search) ||
      lead.phone?.toLowerCase().includes(search)
    );
  });

  const handleExportCSV = () => {
    if (!leads.length) {
      alert("No leads available to export.");
      return;
    }

    const headers = ["Name", "Company", "Email", "Phone", "Status", "Notes"];
    const rows = leads.map((lead) => [
      lead.name || "",
      lead.company || "",
      lead.email || "",
      lead.phone || "",
      lead.status || "",
      lead.notes || "",
    ]);

    const csvLines = [headers.join(","), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))];
    const csvContent = csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  console.log("Leads Data:", leads);
  useEffect(() => {
    const fetchData = async () => {
      await Promise.allSettled([getLeadsStatus(), getLeads()]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleEdit = (id) => {
    navigate(`/lead/${id}`);
  };

  const handleView = (id) => {
    navigate(`/lead/${id}`);
  };

  // jsx structure for dashboard page
  return (
    <div className="min-h-screen bg-gray-50">
      <Navebar />

      <div className="p-4 sm:p-6">
        {authRequired && (
          <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
            Please login to access your leads and dashboard.
          </div>
        )}
        <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Overview</h1>
            <p className="mt-1 text-sm text-slate-500">Quick actions for managing your leads.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads by name, company, email, status..."
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200 sm:w-[320px]"
            />
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center rounded-2xl border border-purple-600 bg-yellow-300/10 text-black px-5 py-3 text-sm font-semibold  transition hover:border-white/30 hover:bg-white/15"
            >
              Export to CSV
            </button>
            <button
              onClick={() => navigate('/leads')}
              className="inline-flex items-center justify-center rounded-2xl bg-[#d9ff00] px-5 py-3 text-sm font-semibold text-[#02030a] transition hover:opacity-90"
            >
              Add Leads
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            header="Total Leads"
            value={status.totalLeads ?? 0}
            description="All time leads"
            icon={<CiAlignBottom />}
          />

          <StatusCard
            header="Open Leads"
            value={status.openLeads || 0}
            description="Currently open leads"
            icon={<GiNotebook />}
          />

          <StatusCard
            header="Closed Leads"
            value={status.contactedLeads || 0}
            description="Successfully closed leads"
            icon={<FaListCheck />}
          />

          <StatusCard
            header="Lost Leads"
            value={status.lostLeads || 0}
            description="Lost opportunities"
            icon={<GiCrossMark />}
          />
        </div>

        {/* Leads Table */}
        <div className="mt-8">
          <LeadTable
            leads={filteredLeads}
            onView={handleView}
            onDelete={deleteLead}
            onEdit={handleEdit}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
