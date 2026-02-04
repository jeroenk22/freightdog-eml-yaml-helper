/* helpers.time.js
   Datum/tijd helpers + conversies.
*/

function dtLocalToYaml(val) {
  return val ? val.replace("T", " ") : "";
}

function yamlToDtLocal(val) {
  return val ? val.replace(" ", "T") : "";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ymd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

function parseTimeHHMM(value) {
  const s = (value ?? "").toString().trim();
  if (!s) return "00:00";
  // accept "08:00", "08:00:00", "8:00"
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "00:00";
  return `${pad2(m[1])}:${m[2]}`;
}

function nextBusinessDay(fromDate) {
  const d = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate(),
  );
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); // Sun=0, Sat=6
  return d;
}
