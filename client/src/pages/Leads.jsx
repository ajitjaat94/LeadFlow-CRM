import { useState } from "react";
import axios from "axios";
import LeadStructure from "../components/LeadStructure";

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

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:3000/api/leads",
        formData,
      );

      console.log("Lead Added:", response.data);

      alert("Lead Added Successfully!");

      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        status: "New",
        notes: "",
      });
    } catch (error) {
      console.error("Error:", error);
      alert(error.response?.data?.message || "Failed to add lead");
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
};

export default Lead;
