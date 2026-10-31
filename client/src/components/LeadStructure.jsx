import { useState } from "react";
import Input from "./ui/Input";
import Button from "./ui/Button";
import AddFieldModal from "./AddFieldModal";
import CustomFieldInput from "./CustomFieldInput";
import { createLeadField } from "../services/api";

const LeadStructure = ({ formData, handleChange, loading, customFields = [], onCustomFieldsChange, onCustomFieldValuesChange }) => {
  const [addFieldOpen, setAddFieldOpen] = useState(false);

  const handleAddField = async (field) => {
    const savedField = await createLeadField(field);
    onCustomFieldsChange?.([...customFields, savedField]);
    setAddFieldOpen(false);
  };

  const handleCustomFieldChange = (key, value) => {
    onCustomFieldValuesChange?.({ ...formData.customFields, [key]: value });
  };

  return (
    <div className="lead-form-layout">
      <div className="lead-form-grid">
        <div className="lead-form-field">
          <label htmlFor="lead-name" className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
          <Input
            id="lead-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter lead name"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-400"
            required
          />
        </div>

        <div className="lead-form-field">
          <label htmlFor="lead-company" className="mb-2 block text-sm font-semibold text-slate-700">Company</label>
          <Input
            id="lead-company"
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="Enter company name"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-400"
            required
          />
        </div>
      </div>

      <div className="lead-form-grid">
        <div className="lead-form-field">
          <label htmlFor="lead-email" className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
          <input
            id="lead-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-400"
            required
          />
        </div>

        <div className="lead-form-field">
          <label htmlFor="lead-phone" className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
          <Input
            id="lead-phone"
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-400"
          />
        </div>
      </div>

      <div className="lead-form-grid">
        <div className="lead-form-field">
          <label htmlFor="lead-status" className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
          <select
            id="lead-status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-400"
          >
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

        <div className="lead-form-field">
          <label htmlFor="lead-notes" className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
          <textarea
            id="lead-notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Enter notes"
            rows="4"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-400"
          />
        </div>
      </div>

      {customFields.length > 0 && (
        <div className="lead-custom-fields">
          <div className="lead-custom-fields-heading">
            <div><p>Custom fields</p><span>Workspace-specific details for this lead</span></div>
          </div>
          <div className="lead-form-grid">
          {customFields.map((field) => (
            <div className="lead-form-field" key={field.id || field._id}>
              {field.type !== "checkbox" && <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor={`custom-${field.key}`}>{field.name}</label>}
              <CustomFieldInput field={field} value={formData.customFields?.[field.key]} onChange={handleCustomFieldChange} />
            </div>
          ))}
          </div>
        </div>
      )}

      <div className="lead-form-add-field">
        <button type="button" onClick={() => setAddFieldOpen(true)} className="lead-add-field-button">+ Add Field</button>
        <span>Add details specific to your workspace when needed.</span>
      </div>

      <div className="lead-form-actions">
        <Button
          text={loading ? "Saving..." : "Save Lead"}
          className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
          disabled={loading}
        />
        <p>Your data will be saved to your account.</p>
      </div>
      {addFieldOpen && <AddFieldModal existingFields={customFields} onClose={() => setAddFieldOpen(false)} onAdd={handleAddField} />}
    </div>
  );
};

export default LeadStructure;
