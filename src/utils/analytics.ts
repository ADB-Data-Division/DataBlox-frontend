/**
 * Google Analytics 4 utility functions
 * 
 * This service provides easy-to-use functions for tracking user interactions,
 * custom events, and performance metrics in your migration visualization app.
 * 
 * Measurement ID: G-EV8SV1ZMW0
 * 
 * Usage examples:
 * - trackEvent('search', 'location_search', 'bangkok')
 * - trackPageView('/dashboard')
 * - trackUserInteraction('button_click', 'execute_query')
 * - trackMigrationEvent.searchLocation('bangkok', 25)
 * - trackMigrationEvent.executeQuery(3, 'province')
 * 
 * The GA4 script is loaded in app/layout.tsx and will automatically track:
 * - Page views
 * - Enhanced measurements (scrolling, outbound clicks, site search, file downloads)
 * - Custom events via these utility functions
 */

// Extend the Window interface to include gtag
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event',
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

export const GA_MEASUREMENT_ID = 'G-EV8SV1ZMW0';

/**
 * Track a custom event
 * @param action - The action that was performed (e.g., 'search', 'click', 'download')
 * @param category - The category of the event (e.g., 'engagement', 'ecommerce')
 * @param label - Optional label for the event
 * @param value - Optional numeric value for the event
 */
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

/**
 * Track a page view
 * @param pageTitle - The title of the page
 * @param pagePath - The path of the page
 */
export const trackPageView = (pageTitle: string, pagePath: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: pageTitle,
      page_location: `${window.location.origin}${pagePath}`,
    });
  }
};

/**
 * Track user interactions specific to the migration visualization app
 */
export const trackMigrationEvent = {
  // Search interactions
  searchLocation: (query: string, resultCount: number) => {
    trackEvent('search', 'location_search', query, resultCount);
  },

  // Location selection
  selectLocation: (locationType: 'province' | 'district' | 'subDistrict', locationName: string) => {
    trackEvent('select_location', 'user_interaction', `${locationType}:${locationName}`);
  },

  // Query execution
  executeQuery: (locationCount: number, queryType: string) => {
    trackEvent('execute_query', 'analysis', queryType, locationCount);
  },

  // Visualization interactions
  changeVisualization: (visualizationType: string) => {
    trackEvent('change_visualization', 'interface', visualizationType);
  },

  // Filter interactions
  applyFilter: (filterType: string, filterValue: string) => {
    trackEvent('apply_filter', 'data_manipulation', `${filterType}:${filterValue}`);
  },

  // Pagination
  changePage: (pageNumber: number, totalResults: number) => {
    trackEvent('pagination', 'navigation', 'page_change', pageNumber);
  },

  // Time period selection
  selectTimePeriod: (period: string) => {
    trackEvent('select_time_period', 'analysis', period);
  },

  // Export/Download actions
  exportData: (format: string, dataType: string) => {
    trackEvent('export_data', 'data_export', `${dataType}_${format}`);
  },

  // Error tracking
  trackError: (errorType: string, errorMessage: string) => {
    trackEvent('error', 'system', `${errorType}:${errorMessage.substring(0, 100)}`);
  },
};

/**
 * Track general user interactions
 * @param action - The specific action (e.g., 'button_click', 'link_click')
 * @param label - Description of what was clicked/interacted with
 */
export const trackUserInteraction = (action: string, label: string) => {
  trackEvent(action, 'user_interaction', label);
};

/**
 * Track performance metrics
 * @param metric - The performance metric name
 * @param value - The metric value
 * @param unit - The unit of measurement (optional)
 */
export const trackPerformance = (metric: string, value: number, unit?: string) => {
  trackEvent('performance', 'timing', `${metric}${unit ? `_${unit}` : ''}`, value);
};

/**
 * Initialize Google Analytics with additional configuration
 * This is automatically called when the page loads, but can be used
 * for additional configuration if needed
 */
export const initGA = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    // Set user properties or additional config
    window.gtag('config', GA_MEASUREMENT_ID, {
      // Enable enhanced measurement features
      enhanced_measurement: true,
      // Track file downloads
      file_downloads: true,
      // Track outbound clicks
      outbound_clicks: true,
      // Track site search
      site_search: true,
      // Track video engagement
      video_engagement: true,
      // Custom parameters
      custom_map: {
        'custom_parameter_1': 'user_type',
        'custom_parameter_2': 'session_duration'
      }
    });
  }
};