export function getCampaignDurationDays(totalBudget, dailyBudget = 5) {
  const total = Number(totalBudget);
  const daily = Number(dailyBudget);
  if (!Number.isFinite(total) || total < 5 || !Number.isFinite(daily) || daily <= 0) return 1;
  return Math.max(1, Math.ceil(total / daily));
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCampaignSchedule(totalBudget, dailyBudget = 5, start = new Date()) {
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  const durationDays = getCampaignDurationDays(totalBudget, dailyBudget);
  endDate.setDate(endDate.getDate() + durationDays - 1);
  return { startDate: formatDate(startDate), endDate: formatDate(endDate), durationDays };
}
