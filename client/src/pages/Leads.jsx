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
    <div className="">
      <Navbar />
      <div className="min-h-screen bg-gray-100 flex justify-center items-start p-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6"
        >
          <LeadStructure
            formData={formData}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            loading={loading}
          />
        </form>
      </div>
    </div>
  );
};

export default Lead;
