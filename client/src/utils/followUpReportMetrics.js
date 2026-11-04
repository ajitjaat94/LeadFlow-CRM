import { getDateTimeParts } from "./followUpTime.js";

export const getDateKeyInTimeZone = (date, timeZone) => {
  const parts = getDateTimeParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const shiftDateKey = (date, days) => {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
};

export const getFollowUpRangeStart = (periodValue, today) => {
  if (periodValue === "all") return null;
  if (periodValue === "12months") {
    const [year, month] = today.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 12, 1));
    return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  const days = periodValue === "90days" ? 90 : 30;
  return shiftDateKey(today, 1 - days);
};

export const getFollowUpReportMetrics = (followUps, { startDate, endDate, timeZone, now }) => {
  const duePeriodFollowUps = followUps.filter((item) => item.scheduledDate
    && item.scheduledDate <= endDate
    && (!startDate || item.scheduledDate >= startDate));
  const completedDuringPeriod = followUps.filter((item) => {
    if (item.status !== "Completed" || !item.completedAt) return false;
    const completedAt = new Date(item.completedAt);
    if (Number.isNaN(completedAt.getTime()) || completedAt > now) return false;
    const completedDate = getDateKeyInTimeZone(completedAt, timeZone);
    return completedDate <= endDate && (!startDate || completedDate >= startDate);
  });
  const pendingDue = duePeriodFollowUps.filter((item) => item.status === "Pending");
  const completedDue = duePeriodFollowUps.filter((item) => item.status === "Completed");
  const cancelledDue = duePeriodFollowUps.filter((item) => item.status === "Cancelled");
  const denominator = pendingDue.length + completedDue.length;

  return {
    duePeriodFollowUps,
    completedDuringPeriod,
    pendingDue,
    completedDue,
    cancelledDue,
    duePeriodCompletionRate: denominator ? Math.round((completedDue.length / denominator) * 100) : 0,
  };
};
