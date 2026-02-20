module.exports = {
  apps: [{
    name: 'TZ-PRO',
    script: 'dashboard.js',
    
    // Watch & Restart Settings
    watch: false,
    ignore_watch: ['node_modules', 'backups', 'logs', '.env'],
    
    // Instance Settings
    instances: 1,
    exec_mode: 'fork',
    
    // Auto-restart Configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    
    // Logging
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    
    // Environment
    env: {
      NODE_ENV: 'production'
    },
    
    // Additional Settings
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true
  }]
};
