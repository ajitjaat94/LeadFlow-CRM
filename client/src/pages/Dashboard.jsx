import Navebar from "../components/Navebar";
import StatusCard from "../components/StatusCard";
import LeadTable from "../components/LeadTable";
import { useState, useEffect } from "react";
import axios from "axios";
import AddLead from "./AddLead";

const Dashboard = () => {
  const [status, setStatus] = useState({});
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getLeadsStatus = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/status/daskbord-status",
      );

      setStatus(response.data);
    } catch (error) {
      console.error("Status Error:", error);
      setError("Failed to load dashboard status");
    }
  };

  const getLeads = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/leads");

      console.log(response.data);

      setLeads(response.data.data);
    } catch (error) {
      console.error("Leads Error:", error);
      setError("Failed to load leads");
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navebar />

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
        <p className="text-red-500 mb-6">
          This fully not completed but gives an overview of the dashboard.
        </p>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusCard
            header="Total Leads"
            value={status.totalLeads || 0}
            description="All time leads"
            icon="📊"
          />

          <StatusCard
            header="Open Leads"
            value={status.openLeads || 0}
            description="Currently open leads"
            icon="📋"
          />

          <StatusCard
            header="Closed Leads"
            value={status.contactedLeads || 0}
            description="Successfully closed leads"
            icon="✅"
          />

          <StatusCard
            header="Lost Leads"
            value={status.lostLeads || 0}
            description="Lost opportunities"
            icon="❌"
          />
        </div>

        {/* Leads Table */}
        <div className="mt-8">
         <LeadTable leads={leads} />
          
        </div>
      </div>
<AddLead />
    </div>
  );
};

export default Dashboard;
