import { useState } from "react";
import axios from "axios";

const AddLead = () => {
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
        formData
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
      alert(
        error.response?.data?.message ||
          "Failed to add lead"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Add New Lead
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="block mb-2 font-medium">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter lead name"
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Company
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Enter company name"
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full border rounded-lg p-3"
            >
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter notes"
              rows="4"
              className="w-full border rounded-lg p-3"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            {loading ? "Adding..." : "Add Lead"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddLead;