export const APP_TZ = "Europe/Amsterdam";

export function amsterdamNowParts(date = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value;

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function todayISOAmsterdam() {
  const p = amsterdamNowParts();
  return `${p.year}-${p.month}-${p.day}`;
}

export function monthTitleNL(d) {
  const months = [
    "januari","februari","maart","april","mei","juni",
    "juli","augustus","september","oktober","november","december"
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function daysInMonth(d) {
  return endOfMonth(d).getDate();
}

// Monday-first weekday index (Mon=0..Sun=6)
export function weekdayIndexMonFirst(date) {
  const js = date.getDay(); // Sun=0..Sat=6
  return (js + 6) % 7;
}

export function addMonths(cursor, delta) {
  return new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}