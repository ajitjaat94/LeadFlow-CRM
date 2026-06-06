import { useEffect, useState } from "react";
import axios from "axios";
import LeadStructure from "../components/LeadStructure";
import Navbar from "../components/Navebar";
import { useParams } from "react-router-dom";

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
  const { id } = useParams();
  const handleSubmit = async (e) => {
    e.preventDefault();
    //console.log(formData);

    try {
      let response;
      setLoading(true);
      if (id) {
        response = await axios.put(
          `http://localhost:3000/api/leads/${id}`,
          formData,
        );
      } else {
        response = await axios.post(
          "http://localhost:3000/api/leads",
          formData,
        );
      }

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
      //console.log(error.response);

      console.error("Error:", error);
      alert(error.response?.data?.message || "Failed to add lead");
    } finally {
      setLoading(false);
    }
  };
// get api 
  useEffect(() => {
    async function fetchLead() {
      if (!id) return;
      const response = await axios.get(`http://localhost:3000/api/leads/${id}`);
      setFormData(response.data.data);
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
