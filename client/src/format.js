// SQLite stores dates as "2026-11-26 18:44:00" in UTC. This shows them in the user's local time.
export function formatDate(sqliteDate) {
  const date = new Date(sqliteDate.replace(' ', 'T') + 'Z');
  return date.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
