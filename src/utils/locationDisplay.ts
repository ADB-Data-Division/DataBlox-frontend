/**
 * Utility functions for shortening location names in visualizations
 */

/**
 * Generate a short name for districts and sub-districts
 * @param fullName - The full name of the location
 * @param type - The type of location ('district' or 'subDistrict')
 * @returns Shortened name for display
 */
export function getShortLocationName(fullName: string, type: 'district' | 'subDistrict'): string {
  if (!fullName || typeof fullName !== 'string') {
    return '';
  }

  // For districts and sub-districts, take first letter of each word
  // Examples:
  // "Roi Et" -> "RE"
  // "Sakon Nakhon" -> "SN"
  // "Loei" -> "L"
  // "Hat Yai" -> "HY"

  const words = fullName.trim().split(/\s+/);

  if (words.length === 1) {
    // Single word: take first 2-3 letters, but not more than the word length
    return words[0].substring(0, Math.min(3, words[0].length)).toUpperCase();
  } else {
    // Multiple words: take first letter of each word
    return words.map(word => word.charAt(0)).join('').toUpperCase();
  }
}

/**
 * Get display text for a location in map visualizations
 * @param locationName - Full location name
 * @param locationCode - Location code (for provinces)
 * @param locationType - Type of location
 * @returns Object with displayText and tooltipText
 */
export function getLocationDisplayInfo(
  locationName: string,
  locationCode: string | undefined,
  locationType: 'province' | 'district' | 'subDistrict'
): { displayText: string; tooltipText: string } {
  const tooltipText = locationName;

  let displayText: string;

  switch (locationType) {
    case 'province':
      // For provinces, prefer the full name for readability on the map
      displayText = locationName;
      break;

    case 'district':
    case 'subDistrict':
      displayText = getShortLocationName(locationName, locationType);
      break;

    default:
      displayText = locationName;
  }

  return { displayText, tooltipText };
}
