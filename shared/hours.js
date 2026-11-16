// Shared by the browser and the server-rendered first view.
// Current open/closed status from the store-hours setting, in Keswick (Toronto) time.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hm12 = (hm) => { const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'a.m.' : 'p.m.'}`; };
// A day may have a mid-day break: { open, close, break_start, break_end } (both break times, inside open–close).
export const hasBreak = (d) => !!(d && d.break_start && d.break_end && d.break_start < d.break_end && d.break_start > d.open && d.break_end < d.close);
export const formatTime = hm12;
// "10 a.m. – 7 p.m." plus the break when there is one.
export const dayHoursText = (d) => (d.closed ? 'Closed' : `${hm12(d.open)} – ${hm12(d.close)}`);
export const dayBreakText = (d) => (hasBreak(d) ? `Break ${hm12(d.break_start).replace(/ (a|p)\.m\.$/, (m) => (hm12(d.break_end).endsWith(m) ? '' : m))} – ${hm12(d.break_end)}` : '');
export function storeStatus(hours, now = new Date()) {
  if (!hours?.length) return null;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now).map((x) => [x.type, x.value]));
  const mins = Number(p.hour) * 60 + Number(p.minute);
  const dayIdx = DAY_NAMES.indexOf(p.weekday);
  const toM = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const today = hours.find((h) => h.day === p.weekday);
  if (today && !today.closed && mins >= toM(today.open) && mins < toM(today.close)) {
    if (hasBreak(today)) {
      if (mins >= toM(today.break_start) && mins < toM(today.break_end)) return { open: false, label: `On a short break · back at ${hm12(today.break_end)}` };
      if (mins < toM(today.break_start)) return { open: true, label: `Open now · break at ${hm12(today.break_start)}` };
    }
    return { open: true, label: `Open now · until ${hm12(today.close)}` };
  }
  for (let i = 0; i < 7; i++) {
    const name = DAY_NAMES[(dayIdx + i) % 7];
    const d = hours.find((h) => h.day === name);
    if (!d || d.closed) continue;
    if (i === 0 && mins >= toM(d.open)) continue;
    return { open: false, label: `Closed · opens ${i === 0 ? 'today' : i === 1 ? 'tomorrow' : name} ${hm12(d.open)}` };
  }
  return { open: false, label: 'Closed' };
}
