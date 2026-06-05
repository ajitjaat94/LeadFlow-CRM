import Input from "./ui/Input";
import Button from "./ui/Button";

const LeadStructure = ({ formData, handleChange, handleSubmit, loading }) => {
  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Manage Lead</h1>

      <div>
        <label className="block mb-2 font-medium">Name</label>
        <Input
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
        <label className="block mb-2 font-medium">Company</label>
        <Input
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
        <label className="block mb-2 font-medium">Email</label>
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
        <label className="block mb-2 font-medium">Phone</label>
        <Input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Enter phone number"
          className="w-full border rounded-lg p-3"
        />
      </div>

      <div>
        <label className="block mb-2 font-medium">Status</label>
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
        <label className="block mb-2 font-medium">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Enter notes"
          rows="4"
          className="w-full border rounded-lg p-3"
        />
      </div>
      <Button
        text={loading ? "Updating..." : "Update"}
        className="bg-blue-500 text-white w-full mt-4"
        disabled={loading}
        onClick={handleSubmit}
      />
    </div>
  );
};

export default LeadStructure;
