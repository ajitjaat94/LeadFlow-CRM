import Navebar from "../components/Navebar";
import StatusCard from "../components/StatusCard";
import LeadTable from "../components/LeadTable";
import { useState, useEffect } from "react";
import axios from "axios";
import { CiAlignBottom } from "react-icons/ci";
import { GiNotebook, GiCrossMark } from "react-icons/gi";
import { FaListCheck } from "react-icons/fa6";
import {  useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState({});
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getLeadsStatus = async () => {
    try {
      // Make API call to fetch dashboard status
      const response = await axios.get(
        "https://leadflow-crm-1pxe.onrender.com/api/status/daskbord-status",
      );

      setStatus(response.data);
    } catch (error) {
      console.error("Status Error:", error);
      setError("Failed to load dashboard status");
    }
  };

  const getLeads = async () => {
    try {
      // Make API call to fetch leads data
      const response = await axios.get("https://leadflow-crm-1pxe.onrender.com/api/leads");

      console.log(response.data);

      setLeads(response.data.data);
    } catch (error) {
      console.error("Leads Error:", error);
      setError("Failed to load leads");
    }
  };
  // Delete api call
  const deleteLead = async (id) => {
    try {
      await axios.delete(`https://leadflow-crm-1pxe.onrender.com/api/leads/${id}`);
      // Refresh leads after deletion
      await getLeads();
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };
  console.log("Leads Data:", leads);
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([getLeadsStatus(), getLeads()]);

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-5 text-center text-lg">Loading...</div>;
  }

  if (error) {
    return <div className="p-5 text-red-500">{error}</div>;
  }
   const handleEdit = (id) => {
    navigate(`/lead/${id}`);
  }
  // jsx structure for dashboard page
  return (
    <div className="min-h-screen bg-gray-50">
      <Navebar />

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusCard
            header="Total Leads"
            value={status.totalLeads || 0}
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
            leads={leads}
            onDelete={deleteLead}
            leads={leads}
            onEdit={handleEdit}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
