export const getDateOnlyValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

export const getTodayDateOnly = (now = new Date()) => (
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
);

export const isDateOnlyInCurrentMonth = (dateOnly, now = new Date()) => (
  Boolean(dateOnly)
  && dateOnly.slice(0, 7) === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
);

export const formatDateOnly = (dateOnly, options = { day: "numeric", month: "short", year: "numeric" }) => {
  if (!dateOnly) return "No close date";
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return Number.isNaN(date.getTime())
    ? "No close date"
    : new Intl.DateTimeFormat(undefined, { ...options, timeZone: "UTC" }).format(date);
};
