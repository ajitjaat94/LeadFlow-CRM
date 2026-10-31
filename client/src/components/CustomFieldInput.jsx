const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100";

const CustomFieldInput = ({ field, value, onChange }) => {
  const updateValue = (nextValue) => onChange(field.key, nextValue);

  if (field.type === "checkbox") {
    return (
      <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => updateValue(event.target.checked)} className="h-4 w-4 accent-purple-600" />
        <span>{field.name}</span>
      </label>
    );
  }

  if (field.type === "dropdown") {
    return (
      <select className={inputClass} value={value || ""} onChange={(event) => updateValue(event.target.value)}>
        <option value="">Select {field.name.toLowerCase()}</option>
        {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  const inputType = field.type === "url" ? "url" : field.type === "date" ? "date" : field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text";
  return <input className={inputClass} type={inputType} value={value ?? ""} onChange={(event) => updateValue(event.target.value)} placeholder={`Enter ${field.name.toLowerCase()}`} required={field.required} />;
};

export default CustomFieldInput;
