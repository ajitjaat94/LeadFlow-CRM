import { useState } from "react";
import { createFieldKey, customFieldTypeLabels, fieldTypes } from "../data/customFields";

const AddFieldModal = ({ existingFields, onClose, onAdd }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const key = createFieldKey(trimmedName);
    const dropdownOptions = options.split(",").map((option) => option.trim()).filter(Boolean);

    if (!trimmedName) return setError("Field name is required.");
    if (!key) return setError("Enter a field name with at least one letter or number.");
    if (existingFields.some((field) => field.key === key || field.name.toLowerCase() === trimmedName.toLowerCase())) return setError("A field with this name already exists.");
    if (!fieldTypes.includes(type)) return setError("Choose a valid field type.");
    if (type === "dropdown" && dropdownOptions.length === 0) return setError("Add at least one dropdown option.");

    setSaving(true);
    onAdd({ name: trimmedName, key, type, options: type === "dropdown" ? dropdownOptions : [], required: false, order: existingFields.length })
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to create field."))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="presentation" onMouseDown={onClose}>
      <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="add-field-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 id="add-field-title" className="text-xl font-bold text-slate-900">Add field</h2><p className="mt-1 text-sm text-slate-500">Create an additional field for this workspace.</p></div>
          <button type="button" className="text-xl leading-none text-slate-400 hover:text-slate-700" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="space-y-4" onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit(event);
          }
        }}>
          <div><label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="custom-field-name">Field name</label><input id="custom-field-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter field name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" /></div>
          <div><label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="custom-field-type">Field type</label><select id="custom-field-type" value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100">{fieldTypes.map((fieldType) => <option key={fieldType} value={fieldType}>{customFieldTypeLabels[fieldType]}</option>)}</select></div>
          {type === "dropdown" && <div><label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="custom-field-options">Options</label><input id="custom-field-options" value={options} onChange={(event) => setOptions(event.target.value)} placeholder="Villa, Apartment, Office" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" /><p className="mt-1 text-xs text-slate-500">Separate options with commas.</p></div>}
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button type="button" onClick={handleSubmit} disabled={saving} className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Adding..." : "Add field"}</button></div>
        </div>
      </section>
    </div>
  );
};

export default AddFieldModal;
