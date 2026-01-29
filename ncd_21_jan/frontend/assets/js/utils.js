export function timeAgo(dateString) {
  const diff = Math.floor((Date.now() - new Date(dateString)) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff} minutes ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
  return `${Math.floor(diff / 1440)} days ago`;
}
