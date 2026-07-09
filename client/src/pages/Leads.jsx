import { useEffect, useState } from "react";
import LeadStructure from "../components/LeadStructure";
import Navbar from "../components/Navebar";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

const Lead = () => {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    status: "New",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    //console.log(formData);

    try {
      let response;
      setLoading(true);
      if (id) {
        response = await api.put(`/leads/${id}`, formData);
      } else {
        response = await api.post("/leads", formData);
      }

      alert(id ? "Lead updated successfully!" : "Lead added successfully!");

      if (!id) {
        setFormData({
          name: "",
          company: "",
          email: "",
          phone: "",
          status: "New",
          notes: "",
        });
      } else {
        navigate("/leads");
      }
    } catch (error) {
      //console.log(error.response);

      console.error("Error:", error);
      alert(error.response?.data?.message || "Failed to save lead");
    } finally {
      setLoading(false);
    }
  };
// get api 
  useEffect(() => {
    async function fetchLead() {
      if (!id) return;
      try {
        const response = await api.get(`/leads/${id}`);
        setFormData(response.data.data);
      } catch (error) {
        console.error("Error fetching lead", error);
        alert(error.response?.data?.message || "Failed to load lead");
      }
    }
    fetchLead();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#f7f6fb]">
      <Navbar />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-white/90 p-6 shadow-xl shadow-purple-950/10 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Add or Edit Lead</h1>
              <p className="mt-2 text-sm text-slate-500">
                Use this page to create a new lead or update an existing one. All fields are saved to your account.
              </p>
            </div>
            <div className="rounded-3xl bg-purple-500/10 px-4 py-3 text-sm font-medium text-purple-700">
              {id ? "Edit lead details" : "Create new lead"}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-lg sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <LeadStructure
              formData={formData}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              loading={loading}
            />
          </form>
        </section>
      </div>
    </div>
  );
};

export default Lead;
