/**
 * Database Tables Configuration
 * 
 * This file documents all tables used in the IMS application
 */

module.exports = {
  // Main influencer data table
  LIGHT_IMS: 'light_ims',
  
  // Channel data with status information
  CHANNEL_DATA: 'channel_data',
  
  // Language codes mapping
  LANG_WITH_SHORTCODE: 'lang_with_shortcode',
  
  // Collections/Groupings
  COLLECTIONS: 'collections',
  
  // Channel search data
  CHANNEL_SEARCH_DATA: 'channel_search_data',
  
  // Influencer payment information
  INFLUENCER_PAYMENT: 'influencer_payment',
  
  // Admin notes
  ADMINNOTES: 'adminnotes',
  
  // User country data
  USER_COUNTRY: 'user_country',
  
  // Channel social media data
  CHANNEL_SOCIAL: 'channel_social',
  
  // Table relationships and purposes
  TABLE_PURPOSES: {
    'light_ims': 'Main influencer/channel data table',
    'channel_data': 'Channel data with confirmed status (numeric values)',
    'lang_with_shortcode': 'Language codes and shortcodes mapping',
    'collections': 'Collections/groupings of influencers',
    'channel_search_data': 'Search-related channel data',
    'influencer_payment': 'Payment information for influencers',
    'adminnotes': 'Admin notes and comments',
    'user_country': 'User country information',
    'channel_social': 'Channel social media links and data'
  },
  
  // Common column mappings
  COLUMN_MAPPINGS: {
    // Status columns
    STATUS_COLUMN_LIGHT_IMS: 'status', // Text values
    STATUS_COLUMN_CHANNEL_DATA: 'confirmed', // Numeric values (1-7)
    
    // Common ID columns
    ID_COLUMN: 'id',
    
    // Channel name columns
    CHANNEL_NAME: 'channel_name',
    
    // Language columns
    LANGUAGE: 'language',
    
    // Date columns
    ADDED_DATE: 'added_date',
    LAST_UPDATED: 'last_updated',
    CONF_DATE: 'conf_date'
  },
  
  // Status value mappings for channel_data.confirmed
  STATUS_VALUES: {
    UNCONFIRMED: 1,
    AUTO_MAIL: 2,
    MANUAL_MAIL: 3,
    RESPONDED: 4,
    CONFIRMED: 5,
    MANAGED: 6,
    SUSPENDED: 7,
    BMI: 9,
    CONFIRMED_PPC: 10
  },
  
  // Default status filter (for initial load)
  DEFAULT_STATUS_FILTER: [5, 6, 9, 10], // Confirmed, Managed, BMI, Confirmed PPC
  
  // Admin notes table structure
  ADMINNOTES: {
    TABLE: 'adminnotes',
    CHANNEL_ID_COLUMN: 'channel_id',
    NOTE_COLUMN: 'note'
  }
};

