module.exports = {
  apps: [{
    name: 'junit-dashboard-api',
    script: './src/server.js',
    instances: 2,  // Use 2 CPU cores, or 'max' for all cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    time: true
  }]
};
