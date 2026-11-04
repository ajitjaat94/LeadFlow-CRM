export const getBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const getDateTimeParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

export const getTodayInTimeZone = (timeZone, now = new Date()) => {
  const current = getDateTimeParts(now, timeZone);
  return `${current.year}-${current.month}-${current.day}`;
};

export const isFollowUpOverdue = (item, timeZone, now = new Date()) => {
  if (item.status !== "Pending" || !item.scheduledDate || !item.scheduledTime) return false;
  const current = getDateTimeParts(now, timeZone);
  const today = `${current.year}-${current.month}-${current.day}`;
  const currentTime = `${current.hour}:${current.minute}`;
  return item.scheduledDate < today
    || (item.scheduledDate === today && item.scheduledTime < currentTime);
};

export const formatFollowUpDate = (date) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};
