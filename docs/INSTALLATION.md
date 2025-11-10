# JUnit Test Results Dashboard - Installation Guide

## Quick Start Overview

This guide will help you set up the JUnit Test Results Dashboard with MongoDB backend on Ubuntu 24.04.

**What you'll install:**

- MongoDB 7.0 (database)
- Node.js 20 LTS (backend runtime)
- PM2 (process manager)
- Nginx (web server for frontend)
- Backend API (Express.js)
- Frontend Dashboard (HTML/JS)

**Time required:** 30-60 minutes

---

## Step 1: System Preparation

### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Essential Tools

```bash
sudo apt install -y build-essential curl wget git
```

---

## Step 2: Install MongoDB 7.0

### Add MongoDB Repository

```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt update
```

### Install MongoDB

```bash
sudo apt install -y mongodb-org
```

### Start MongoDB

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Verify MongoDB is Running

```bash
sudo systemctl status mongod
```

You should see `active (running)` in green.

### Configure MongoDB Security

```bash
# Connect to MongoDB shell
mongosh

# In the MongoDB shell, run these commands:
use admin
db.createUser({
  user: "admin",
  pwd: "CHANGE_THIS_ADMIN_PASSWORD",
  roles: [ { role: "userAdminAnyDatabase", role: "root" } ]
})

use junit_test_results
db.createUser({
  user: "junit_app",
  pwd: "CHANGE_THIS_APP_PASSWORD",
  roles: [ { role: "readWrite", db: "junit_test_results" } ]
})

exit
```

### Enable MongoDB Authentication

```bash
# Edit MongoDB configuration
sudo nano /etc/mongod.conf
```

Find the `security` section and uncomment/add:

```yaml
security:
    authorization: enabled

net:
    bindIp: 127.0.0.1
    port: 27017
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### Restart MongoDB

```bash
sudo systemctl restart mongod
```

---

## Step 3: Install Node.js 20 LTS

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

---

## Step 4: Install PM2 Process Manager

```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

---

## Step 5: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## Step 6: Set Up Backend Application

### Create Application Directory

```bash
# Create directory
sudo mkdir -p /opt/junit-dashboard
sudo chown $USER:$USER /opt/junit-dashboard
```

### Copy Backend Files

```bash
# Navigate to the backend directory you downloaded
cd /path/to/downloaded/files

# Copy backend files to /opt/junit-dashboard
cp -r backend/* /opt/junit-dashboard/
```

### Install Dependencies

```bash
cd /opt/junit-dashboard
npm install
```

### Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit environment file
nano .env
```

Update these values in the `.env` file:

```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Use the MongoDB password you set earlier
MONGODB_URI=mongodb://junit_app:YOUR_APP_PASSWORD_HERE@localhost:27017/junit_test_results?authSource=junit_test_results

# Update with your actual frontend URLs
CORS_ORIGIN=http://localhost
ALLOWED_ORIGINS=http://localhost,http://YOUR_SERVER_IP,http://YOUR_DOMAIN

MAX_FILE_SIZE=52428800
MAX_FILES=20
UPLOAD_DIR=./uploads

LOG_LEVEL=info
LOG_DIR=./logs
```

Replace:

- `YOUR_APP_PASSWORD_HERE` with the password you set for `junit_app` user
- `YOUR_SERVER_IP` with your Ubuntu server's IP address
- `YOUR_DOMAIN` with your domain name (if you have one)

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### Test the Backend

```bash
# Run in development mode to test
npm run dev
```

You should see:

```
MongoDB Connected: localhost
Database indexes created successfully
Server running on 0.0.0.0:5000 in development mode
```

Press `Ctrl+C` to stop.

### Start Backend with PM2

```bash
# Start the backend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
# Follow the command it outputs (run it with sudo)

# Check status
pm2 status
```

### Verify Backend is Running

```bash
# Test health endpoint
curl http://localhost:5000/health
```

You should get a JSON response:

```json
{ "success": true, "message": "JUnit Test Results API is running", "timestamp": "..." }
```

---

## Step 7: Set Up Frontend

### Create Frontend Directory

```bash
sudo mkdir -p /var/www/junit-dashboard
sudo chown $USER:$USER /var/www/junit-dashboard
```

### Copy Frontend Files

```bash
# Copy frontend files
cd /path/to/downloaded/files
cp index.html details.html reports.html *.js /var/www/junit-dashboard/
cp -r resources /var/www/junit-dashboard/
```

### Update API URL in Frontend

```bash
nano /var/www/junit-dashboard/api-client.js
```

Find the `detectAPIURL()` function and update the production URL:

```javascript
// If frontend and backend are on same server
const protocol = window.location.protocol;
const hostname = window.location.hostname;
return `${protocol}//${hostname}:5000/api/v1`;
```

Or set a fixed URL:

```javascript
// For production, use your server's IP or domain
return 'http://YOUR_SERVER_IP:5000/api/v1';
```

### Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/junit-dashboard
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name your_server_ip;  # Replace with your IP or domain

    # Frontend static files
    location / {
        root /var/www/junit-dashboard;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
    }
}
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### Enable the Site

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/junit-dashboard /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 8: Test the Installation

### Open Dashboard in Browser

1. Open your browser
2. Navigate to: `http://YOUR_SERVER_IP`
3. You should see the JUnit Test Results Dashboard

### Test File Upload

1. Drag and drop the `sample-test-results.xml` file onto the upload area
2. The file should be processed and results displayed

### Test from Command Line

```bash
cd /path/to/downloaded/files
./ci-cd-examples/upload-test-results.sh
```

---

## Step 9: CI/CD Integration

### For Jenkins

1. Copy `ci-cd-examples/Jenkinsfile` to your project repository
2. Update the `JUNIT_API_URL` with your server address
3. Add the pipeline to your Jenkins job

### For GitHub Actions

1. Copy `ci-cd-examples/github-actions.yml` to `.github/workflows/` in your repository
2. Add `JUNIT_API_URL` as a secret in GitHub:
    - Go to repository Settings → Secrets and variables → Actions
    - Add new secret: `JUNIT_API_URL` = `http://YOUR_SERVER_IP:5000`
3. Push your changes

### Manual Upload Script

```bash
# From any directory with JUnit XML files
JUNIT_API_URL=http://YOUR_SERVER_IP:5000 ./upload-test-results.sh ./path/to/results
```

---

## Step 10: Monitoring and Maintenance

### View Backend Logs

```bash
# View PM2 logs
pm2 logs junit-dashboard-api

# View specific log file
tail -f /opt/junit-dashboard/logs/info.log
tail -f /opt/junit-dashboard/logs/error.log
```

### View MongoDB Logs

```bash
sudo tail -f /var/log/mongodb/mongod.log
```

### View Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check Service Status

```bash
# Check all services
sudo systemctl status mongod
sudo systemctl status nginx
pm2 status
```

### Restart Services

```bash
# Restart MongoDB
sudo systemctl restart mongod

# Restart Backend
pm2 restart junit-dashboard-api

# Restart Nginx
sudo systemctl restart nginx
```

### Update Backend Code

```bash
cd /opt/junit-dashboard
git pull  # If using git
npm install  # If dependencies changed
pm2 restart junit-dashboard-api
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check MongoDB is running
sudo systemctl status mongod

# Check MongoDB connection
mongosh mongodb://junit_app:PASSWORD@localhost:27017/junit_test_results

# Check backend logs
pm2 logs junit-dashboard-api
```

### Cannot Connect to API from Frontend

```bash
# Check firewall allows port 5000
sudo ufw status

# Allow port 5000 if needed
sudo ufw allow 5000

# Check backend is listening
sudo netstat -tlnp | grep 5000
```

### File Upload Fails

```bash
# Check upload directory permissions
ls -la /opt/junit-dashboard/uploads

# Create if missing
mkdir -p /opt/junit-dashboard/uploads
chmod 755 /opt/junit-dashboard/uploads

# Check file size limits
# In .env: MAX_FILE_SIZE=52428800
# In nginx config: client_max_body_size 50M;
```

### Database Connection Errors

```bash
# Test MongoDB connection
mongosh mongodb://junit_app:PASSWORD@localhost:27017/junit_test_results

# Check MongoDB logs
sudo tail -100 /var/log/mongodb/mongod.log

# Verify user exists
mongosh
use junit_test_results
db.getUsers()
```

---

## Security Recommendations

### 1. Change Default Passwords

Make sure you changed all default passwords in MongoDB.

### 2. Enable HTTPS

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### 3. Restrict MongoDB Access

MongoDB is already configured to listen only on localhost (127.0.0.1), which is secure.

### 4. Configure Firewall Properly

```bash
# Only allow necessary ports
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 5. Regular Updates

```bash
# Update system regularly
sudo apt update && sudo apt upgrade
```

---

## Backup and Recovery

### Backup MongoDB

```bash
# Create backup directory
mkdir -p ~/backups

# Backup database
mongodump --uri="mongodb://junit_app:PASSWORD@localhost:27017/junit_test_results" --out=~/backups/junit-$(date +%Y%m%d)
```

### Restore MongoDB

```bash
# Restore from backup
mongorestore --uri="mongodb://junit_app:PASSWORD@localhost:27017" ~/backups/junit-20250108
```

### Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-junit-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/junit-dashboard"
mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://junit_app:PASSWORD@localhost:27017/junit_test_results" --out=$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S)
# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-junit-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add this line:
0 2 * * * /usr/local/bin/backup-junit-db.sh
```

---

## Performance Tuning

### MongoDB Optimization

```bash
# Edit mongod.conf
sudo nano /etc/mongod.conf
```

Add:

```yaml
storage:
    wiredTiger:
        engineConfig:
            cacheSizeGB: 2 # Adjust based on available RAM
```

### PM2 Optimization

```bash
# Edit ecosystem.config.js
nano /opt/junit-dashboard/ecosystem.config.js
```

Adjust instances based on CPU cores:

```javascript
instances: 'max',  // Use all CPU cores
```

---

## Next Steps

1. **Set up automated backups** (see Backup section above)
2. **Enable HTTPS** with Let's Encrypt
3. **Configure monitoring** (optional: install Prometheus + Grafana)
4. **Integrate with CI/CD pipelines** (see ci-cd-examples/)
5. **Set up log rotation** for application logs

---

## Getting Help

- Check application logs: `pm2 logs junit-dashboard-api`
- Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Review the comprehensive setup guide: `MONGODB_BACKEND_SETUP.md`

---

## Summary

You now have a fully functional JUnit Test Results Dashboard with:

✅ MongoDB database for persistent storage
✅ Node.js/Express API backend
✅ Web frontend accessible via browser
✅ PM2 process management for reliability
✅ Nginx reverse proxy for production
✅ CI/CD integration ready (Jenkins, GitHub Actions)
✅ Secure configuration with authentication

Access your dashboard at: `http://YOUR_SERVER_IP`
