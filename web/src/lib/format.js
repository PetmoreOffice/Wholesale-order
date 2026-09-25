export const money = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 });
export const count = new Intl.NumberFormat('th-TH');

const relative = new Intl.RelativeTimeFormat('th', { numeric: 'auto' });
const dateTimeFormat = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

export function dateTime(value) {
  return value ? dateTimeFormat.format(new Date(value)) : '';
}

export function timeAgo(value, now = Date.now()) {
  if (!value) return '';
  const minutes = Math.round((new Date(value).getTime() - now) / 60000);
  if (Math.abs(minutes) < 1) return 'เมื่อสักครู่';
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return relative.format(days, 'day');
  return dateTime(value);
}
