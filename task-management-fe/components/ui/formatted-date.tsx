const formatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** Renders an ISO 8601 timestamp in a fixed locale and zone, so server output is stable. */
export function FormattedDate({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatter.format(new Date(iso))} UTC</time>;
}
