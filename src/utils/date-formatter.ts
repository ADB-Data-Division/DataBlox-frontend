/**
 * Date formatting utilities for consistent date display across the application
 */

/**
 * Formats an ISO8601 date string to "MMM YYYY" format
 * @param isoDateString - ISO8601 date string (e.g., "2024-01-01T00:00:00" or "2025-01-01T00:00:00")
 * @returns Formatted date string in "MMM YYYY" format (e.g., "Jan 2024")
 */
export function formatToMonthYear(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date provided to formatToMonthYear: ${isoDateString}`);
      return isoDateString; // Return original string if parsing fails
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error(`Error formatting date ${isoDateString}:`, error);
    return isoDateString; // Return original string if error occurs
  }
}

/**
 * Formats a date range from two ISO8601 date strings to "MMM YYYY - MMM YYYY" format
 * @param startDate - ISO8601 start date string
 * @param endDate - ISO8601 end date string (treated as exclusive)
 * @returns Formatted date range string (e.g., "Jan 2024 - Dec 2024")
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const formattedStart = formatToMonthYear(startDate);
  
  // Since endDate is exclusive, we need to show the last included month
  // Subtract one day from endDate to get the actual last included date
  const endDateObj = new Date(endDate);
  endDateObj.setDate(endDateObj.getDate() - 1);
  const formattedEnd = formatToMonthYear(endDateObj.toISOString());
  
  // If both dates are the same month/year, show only once
  if (formattedStart === formattedEnd) {
    return formattedStart;
  }
  
  return `${formattedStart} - ${formattedEnd}`;
}

/**
 * Formats an ISO8601 date string to a full date format
 * @param isoDateString - ISO8601 date string
 * @returns Formatted date string in "MMM DD, YYYY" format (e.g., "Jan 01, 2024")
 */
export function formatToFullDate(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date provided to formatToFullDate: ${isoDateString}`);
      return isoDateString;
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error(`Error formatting date ${isoDateString}:`, error);
    return isoDateString;
  }
}
