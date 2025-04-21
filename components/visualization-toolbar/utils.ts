/**
 * Formats a date string (YYYY-MM-DD) for display
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString;
  }
}

/**
 * Returns a human-readable label for a time period
 */
export function getTimePeriodLabel(timePeriod: string): string {
  switch (timePeriod) {
    case 'last-week':
      return 'Last Week';
    case 'last-month':
      return 'Last Month';
    case 'last-quarter':
      return 'Last Quarter';
    case 'last-year':
      return 'Last Year';
    case 'full-year':
      return 'Full Year';
    case 'custom':
      return 'Custom Range';
    default:
      return timePeriod;
  }
} 