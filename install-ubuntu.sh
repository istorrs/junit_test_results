#!/bin/bash

##############################################################################
# JUnit Dashboard - Automated Ubuntu Installation Script
#
# This script automatically installs and configures:
# - MongoDB 7.0
# - Node.js 20 LTS
# - PM2 Process Manager
# - Nginx Web Server
# - Backend API
# - Frontend Dashboard
#
# Tested on: Ubuntu 24.04 LTS, Ubuntu 22.04 LTS
# Requirements: sudo access, internet connection
##############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/opt/junit-dashboard"
FRONTEND_DIR="/var/www/junit-dashboard"
MONGO_APP_USER="junit_app"
MONGO_APP_PASSWORD=""
MONGO_ROOT_PASSWORD=""

# Print functions
print_header() {
    echo ""
    echo "========================================"
    echo "  $1"
    echo "========================================"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root or with sudo"
    exit 1
fi

# Get actual user (not root)
ACTUAL_USER=${SUDO_USER:-$USER}

print_header "JUnit Dashboard - Automated Installation"
print_info "This script will install all required components"
print_info "Installation directory: $BACKEND_DIR"
echo ""

# Generate secure passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

MONGO_ROOT_PASSWORD=$(generate_password)
MONGO_APP_PASSWORD=$(generate_password)

print_info "Generated secure MongoDB passwords"
echo ""

# Confirmation
read -p "Continue with installation? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Installation cancelled"
    exit 0
fi

# Update system
print_header "Step 1: Updating System"
apt update
apt upgrade -y
print_success "System updated"

# Install essential tools
print_header "Step 2: Installing Essential Tools"
apt install -y build-essential curl wget git gnupg2 ca-certificates lsb-release
print_success "Essential tools installed"

# Install MongoDB
print_header "Step 3: Installing MongoDB 7.0"

if command -v mongod &> /dev/null; then
    print_info "MongoDB already installed, skipping..."
else
    # Import MongoDB GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
       gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

    # Add MongoDB repository
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
       tee /etc/apt/sources.list.d/mongodb-org-7.0.list

    apt update
    apt install -y mongodb-org

    print_success "MongoDB installed"
fi

# Start MongoDB
systemctl start mongod
systemctl enable mongod
print_success "MongoDB started and enabled"

# Wait for MongoDB to be ready
sleep 5

# Configure MongoDB
print_info "Configuring MongoDB security..."

# Create admin user
mongosh --eval "
use admin
db.createUser({
  user: 'admin',
  pwd: '$MONGO_ROOT_PASSWORD',
  roles: [ { role: 'root' } ]
})
" || print_warning "Admin user might already exist"

# Create application user
mongosh --eval "
use junit_test_results
db.createUser({
  user: '$MONGO_APP_USER',
  pwd: '$MONGO_APP_PASSWORD',
  roles: [ { role: 'readWrite', db: 'junit_test_results' } ]
})
" || print_warning "App user might already exist"

# Enable authentication
if ! grep -q "^security:" /etc/mongod.conf; then
    cat >> /etc/mongod.conf << EOF

security:
  authorization: enabled
EOF
    systemctl restart mongod
    print_success "MongoDB authentication enabled"
else
    print_info "MongoDB authentication already configured"
fi

# Install Node.js
print_header "Step 4: Installing Node.js 20 LTS"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_info "Node.js already installed: $NODE_VERSION"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    print_success "Node.js installed"
fi

# Install PM2
print_header "Step 5: Installing PM2"

if command -v pm2 &> /dev/null; then
    print_info "PM2 already installed"
else
    npm install -g pm2
    print_success "PM2 installed"
fi

# Install Nginx
print_header "Step 6: Installing Nginx"

if command -v nginx &> /dev/null; then
    print_info "Nginx already installed"
else
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx installed"
fi

# Configure firewall
print_header "Step 7: Configuring Firewall"

if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
    ufw allow OpenSSH
    print_success "Firewall configured"
else
    print_warning "UFW not installed, skipping firewall configuration"
fi

# Set up backend
print_header "Step 8: Setting Up Backend"

# Create directories
mkdir -p $BACKEND_DIR
mkdir -p $BACKEND_DIR/uploads
mkdir -p $BACKEND_DIR/logs
chown -R $ACTUAL_USER:$ACTUAL_USER $BACKEND_DIR

# Copy backend files
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -d "$SCRIPT_DIR/backend" ]; then
    cp -r $SCRIPT_DIR/backend/* $BACKEND_DIR/
    print_success "Backend files copied"
else
    print_error "Backend directory not found!"
    exit 1
fi

# Create .env file
cat > $BACKEND_DIR/.env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

MONGODB_URI=mongodb://${MONGO_APP_USER}:${MONGO_APP_PASSWORD}@localhost:27017/junit_test_results?authSource=junit_test_results

CORS_ORIGIN=http://localhost
ALLOWED_ORIGINS=http://localhost,http://127.0.0.1,http://$(hostname -I | awk '{print $1}')

MAX_FILE_SIZE=52428800
MAX_FILES=20
UPLOAD_DIR=./uploads

LOG_LEVEL=info
LOG_DIR=./logs
EOF

chown $ACTUAL_USER:$ACTUAL_USER $BACKEND_DIR/.env
print_success "Backend configuration created"

# Install dependencies
cd $BACKEND_DIR
sudo -u $ACTUAL_USER npm install --production
print_success "Backend dependencies installed"

# Start backend with PM2
sudo -u $ACTUAL_USER pm2 start ecosystem.config.js
sudo -u $ACTUAL_USER pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u $ACTUAL_USER --hp /home/$ACTUAL_USER | tail -n 1 | bash
print_success "Backend started with PM2"

# Set up frontend
print_header "Step 9: Setting Up Frontend"

mkdir -p $FRONTEND_DIR

# Copy frontend files
cp $SCRIPT_DIR/index.html $FRONTEND_DIR/
cp $SCRIPT_DIR/details.html $FRONTEND_DIR/
cp $SCRIPT_DIR/reports.html $FRONTEND_DIR/
cp $SCRIPT_DIR/api-client.js $FRONTEND_DIR/
cp $SCRIPT_DIR/main.js $FRONTEND_DIR/
cp $SCRIPT_DIR/api.js $FRONTEND_DIR/
cp $SCRIPT_DIR/test-details-modal.js $FRONTEND_DIR/
cp $SCRIPT_DIR/debug.js $FRONTEND_DIR/
cp -r $SCRIPT_DIR/resources $FRONTEND_DIR/ 2>/dev/null || true

print_success "Frontend files copied"

# Configure Nginx
cat > /etc/nginx/sites-available/junit-dashboard << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    # Frontend
    location / {
        root /var/www/junit-dashboard;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
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

        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
    }
}
EOF

ln -sf /etc/nginx/sites-available/junit-dashboard /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
print_success "Nginx configured"

# Wait for services to be ready
print_header "Step 10: Verifying Installation"
sleep 3

# Health check
if curl -s http://localhost:5000/health > /dev/null; then
    print_success "Backend API is responding"
else
    print_error "Backend API is not responding"
fi

if curl -s http://localhost > /dev/null; then
    print_success "Frontend is accessible"
else
    print_error "Frontend is not accessible"
fi

# Print completion message
print_header "Installation Complete!"
echo ""
print_success "JUnit Dashboard has been installed successfully!"
echo ""
print_info "Access the dashboard at: http://$(hostname -I | awk '{print $1}')"
print_info "Or: http://localhost (if accessing locally)"
echo ""
print_header "Important Information"
echo ""
echo "MongoDB Credentials:"
echo "  Root User: admin"
echo "  Root Password: $MONGO_ROOT_PASSWORD"
echo ""
echo "  App User: $MONGO_APP_USER"
echo "  App Password: $MONGO_APP_PASSWORD"
echo ""
print_warning "SAVE THESE CREDENTIALS! They are also in:"
print_warning "  $BACKEND_DIR/.env"
echo ""

# Save credentials to file
cat > $BACKEND_DIR/CREDENTIALS.txt << EOF
MongoDB Credentials
===================

Root User: admin
Root Password: $MONGO_ROOT_PASSWORD

Application User: $MONGO_APP_USER
Application Password: $MONGO_APP_PASSWORD

Backend Location: $BACKEND_DIR
Frontend Location: $FRONTEND_DIR

Generated on: $(date)
EOF

chmod 600 $BACKEND_DIR/CREDENTIALS.txt
chown $ACTUAL_USER:$ACTUAL_USER $BACKEND_DIR/CREDENTIALS.txt

print_success "Credentials saved to: $BACKEND_DIR/CREDENTIALS.txt"
echo ""

print_header "Next Steps"
echo ""
echo "1. Test the dashboard by uploading sample-test-results.xml"
echo "2. Configure CI/CD integration (see ci-cd-examples/)"
echo "3. Set up automated backups"
echo "4. Enable HTTPS with Let's Encrypt:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d your-domain.com"
echo ""

print_header "Useful Commands"
echo ""
echo "View backend logs:   pm2 logs junit-dashboard-api"
echo "Restart backend:     pm2 restart junit-dashboard-api"
echo "Check services:      sudo systemctl status mongod nginx"
echo "Verify installation: ./check-installation.sh"
echo ""

print_success "Setup complete! 🎉"
