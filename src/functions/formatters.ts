/**
 * General purpose display formatters for currency, dates and status indicators
 */

export function formatCurrency(value: number): string {
  return (value || 0).toLocaleString('vi-VN') + ' đ';
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (err) {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa mới đây';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return formatDate(isoString);
  } catch (e) {
    return isoString;
  }
}
