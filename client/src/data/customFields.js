const fieldTypes = ["text", "number", "email", "phone", "date", "dropdown", "checkbox", "url"];

const getWorkspaceKey = () => {
  const savedUser = localStorage.getItem("user");
  if (!savedUser) return "default";

  try {
    const user = JSON.parse(savedUser);
    return user?._id || user?.id || user?.email || "default";
  } catch {
    return "default";
  }
};

const getStorageKey = () => `leadflow-custom-fields-${getWorkspaceKey()}`;

export const getCustomFieldDefinitions = () => {
  const storedFields = localStorage.getItem(getStorageKey());
  return storedFields ? JSON.parse(storedFields) : [];
};

export const saveCustomFieldDefinitions = (fields) => {
  localStorage.setItem(getStorageKey(), JSON.stringify(fields));
};

export const isValidCustomFieldType = (type) => fieldTypes.includes(type);

export const createFieldKey = (name) => name
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

export const customFieldTypeLabels = {
  text: "Text",
  number: "Number",
  email: "Email",
  phone: "Phone",
  date: "Date",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
  url: "URL",
};

export { fieldTypes };
