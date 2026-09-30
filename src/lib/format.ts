// DATE + TIME FORMATTERS — tiny helpers used across the UI.

/** "3 min ago", "2 days ago"… friendly relative timestamps for feeds. */
export function timeAgo(dateString: string): string {
  const then = new Date(dateString).getTime();
  const seconds = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.33, "week"], [12, "month"], [Infinity, "year"],
  ];
  let value = seconds;
  let unit = "second";
  for (const [factor, name] of units) {
    if (value < factor) { unit = name; break; }
    value = Math.floor(value / factor);
    unit = name;
    if (name === "year") break;
  }
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

/** "Sat, 14 Jun • 5:30 PM" — for event cards. */
export function formatEventDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    weekday: "short", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit",
  });
}

/** TRUE if an event is still in the future. */
export function isUpcoming(dateString: string): boolean {
  return new Date(dateString).getTime() >= Date.now();
}
