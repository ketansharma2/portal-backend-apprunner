// utils/dateUtils.js
export const startOfDayUTC = (d = new Date()) => {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
};

export const endOfDayUTC = (d = new Date()) => {
  const dt = new Date(d);
  dt.setUTCHours(23, 59, 59, 999);
  return dt;
};