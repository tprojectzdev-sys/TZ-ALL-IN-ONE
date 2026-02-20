// Dashboard Configuration
// This file is automatically loaded by the dashboard
// DO NOT COMMIT THIS FILE TO GIT

window.DASHBOARD_CONFIG = {
  // Get API key from environment variable
  // Set this in your .env file as DASHBOARD_API_KEY
  apiKey: '__API_KEY_PLACEHOLDER__',
  
  // API endpoints
  apiBase: '/api',
  
  // Refresh intervals (milliseconds)
  statsRefreshInterval: 5000,
  activityRefreshInterval: 10000,
  leaderboardRefreshInterval: 15000,
  
  // Feature flags
  features: {
    fivemIntegration: true,
    musicPlayer: true,
    announcements: true,
    userLookup: true
  }
};

// Auto-set API key to localStorage if not already set
if (window.DASHBOARD_CONFIG.apiKey && window.DASHBOARD_CONFIG.apiKey !== '__API_KEY_PLACEHOLDER__') {
  localStorage.setItem('dashboard_api_key', window.DASHBOARD_CONFIG.apiKey);
}
