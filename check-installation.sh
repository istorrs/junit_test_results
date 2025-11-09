#!/bin/bash

##############################################################################
# JUnit Dashboard Installation Checker
#
# This script checks if all required components are installed and configured
##############################################################################

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo "========================================"
    echo "  $1"
    echo "========================================"
}

print_check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Initialize counters
total_checks=0
passed_checks=0

check() {
    total_checks=$((total_checks + 1))
    if [ $1 -eq 0 ]; then
        passed_checks=$((passed_checks + 1))
        return 0
    else
        return 1
    fi
}

print_header "JUnit Dashboard Installation Check"

# Check MongoDB
print_header "MongoDB"
if command -v mongod &> /dev/null; then
    print_check 0 "MongoDB is installed"
    check 0

    if systemctl is-active --quiet mongod; then
        print_check 0 "MongoDB is running"
        check 0
    else
        print_check 1 "MongoDB is NOT running"
        check 1
        print_warning "Run: sudo systemctl start mongod"
    fi
else
    print_check 1 "MongoDB is NOT installed"
    check 1
    print_warning "See INSTALLATION.md Step 2"
fi

# Check Node.js
print_header "Node.js"
if command -v node &> /dev/null; then
    version=$(node --version)
    print_check 0 "Node.js is installed ($version)"
    check 0

    # Check if version is 20 or higher
    major_version=$(echo $version | cut -d'.' -f1 | sed 's/v//')
    if [ "$major_version" -ge 20 ]; then
        print_check 0 "Node.js version is 20 or higher"
        check 0
    else
        print_check 1 "Node.js version should be 20 or higher"
        check 1
        print_warning "Current: $version, Required: v20.x or higher"
    fi
else
    print_check 1 "Node.js is NOT installed"
    check 1
    print_warning "See INSTALLATION.md Step 3"
fi

# Check npm
if command -v npm &> /dev/null; then
    version=$(npm --version)
    print_check 0 "npm is installed ($version)"
    check 0
else
    print_check 1 "npm is NOT installed"
    check 1
fi

# Check PM2
print_header "PM2"
if command -v pm2 &> /dev/null; then
    version=$(pm2 --version)
    print_check 0 "PM2 is installed ($version)"
    check 0
else
    print_check 1 "PM2 is NOT installed"
    check 1
    print_warning "Run: sudo npm install -g pm2"
fi

# Check Nginx
print_header "Nginx"
if command -v nginx &> /dev/null; then
    print_check 0 "Nginx is installed"
    check 0

    if systemctl is-active --quiet nginx; then
        print_check 0 "Nginx is running"
        check 0
    else
        print_check 1 "Nginx is NOT running"
        check 1
        print_warning "Run: sudo systemctl start nginx"
    fi
else
    print_check 1 "Nginx is NOT installed"
    check 1
    print_warning "See INSTALLATION.md Step 5"
fi

# Check Backend
print_header "Backend Application"
if [ -d "/opt/junit-dashboard" ]; then
    print_check 0 "Backend directory exists (/opt/junit-dashboard)"
    check 0

    if [ -f "/opt/junit-dashboard/package.json" ]; then
        print_check 0 "Backend package.json exists"
        check 0
    else
        print_check 1 "Backend package.json NOT found"
        check 1
    fi

    if [ -f "/opt/junit-dashboard/.env" ]; then
        print_check 0 "Backend .env file exists"
        check 0
    else
        print_check 1 "Backend .env file NOT found"
        check 1
        print_warning "Copy .env.example to .env and configure"
    fi

    if [ -d "/opt/junit-dashboard/node_modules" ]; then
        print_check 0 "Backend dependencies installed"
        check 0
    else
        print_check 1 "Backend dependencies NOT installed"
        check 1
        print_warning "Run: cd /opt/junit-dashboard && npm install"
    fi
else
    print_check 1 "Backend directory NOT found"
    check 1
    print_warning "See INSTALLATION.md Step 6"
fi

# Check if backend is running
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "junit-dashboard-api"; then
        if pm2 list | grep "junit-dashboard-api" | grep -q "online"; then
            print_check 0 "Backend is running (PM2)"
            check 0
        else
            print_check 1 "Backend is NOT running (PM2)"
            check 1
            print_warning "Run: pm2 restart junit-dashboard-api"
        fi
    else
        print_check 1 "Backend is NOT registered with PM2"
        check 1
        print_warning "Run: cd /opt/junit-dashboard && pm2 start ecosystem.config.js"
    fi
fi

# Check Frontend
print_header "Frontend"
if [ -d "/var/www/junit-dashboard" ]; then
    print_check 0 "Frontend directory exists (/var/www/junit-dashboard)"
    check 0

    if [ -f "/var/www/junit-dashboard/index.html" ]; then
        print_check 0 "Frontend index.html exists"
        check 0
    else
        print_check 1 "Frontend index.html NOT found"
        check 1
    fi

    if [ -f "/var/www/junit-dashboard/api-client.js" ]; then
        print_check 0 "Frontend api-client.js exists"
        check 0
    else
        print_check 1 "Frontend api-client.js NOT found"
        check 1
    fi
else
    print_check 1 "Frontend directory NOT found"
    check 1
    print_warning "See INSTALLATION.md Step 7"
fi

# Check Nginx configuration
if [ -f "/etc/nginx/sites-available/junit-dashboard" ]; then
    print_check 0 "Nginx configuration exists"
    check 0

    if [ -L "/etc/nginx/sites-enabled/junit-dashboard" ]; then
        print_check 0 "Nginx configuration is enabled"
        check 0
    else
        print_check 1 "Nginx configuration is NOT enabled"
        check 1
        print_warning "Run: sudo ln -s /etc/nginx/sites-available/junit-dashboard /etc/nginx/sites-enabled/"
    fi
else
    print_check 1 "Nginx configuration NOT found"
    check 1
    print_warning "See INSTALLATION.md Step 7"
fi

# Check connectivity
print_header "Connectivity"
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    print_check 0 "Backend API is responding"
    check 0
else
    print_check 1 "Backend API is NOT responding"
    check 1
    print_warning "Check backend logs: pm2 logs junit-dashboard-api"
fi

if curl -s http://localhost > /dev/null 2>&1; then
    print_check 0 "Frontend is accessible via Nginx"
    check 0
else
    print_check 1 "Frontend is NOT accessible"
    check 1
    print_warning "Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
fi

# Print summary
print_header "Summary"
percentage=$((passed_checks * 100 / total_checks))

if [ $passed_checks -eq $total_checks ]; then
    echo -e "${GREEN}✓${NC} All checks passed! ($passed_checks/$total_checks)"
    echo ""
    echo -e "${GREEN}🎉 Installation is complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open http://$(hostname -I | awk '{print $1}') in your browser"
    echo "2. Upload a JUnit XML file to test"
    echo "3. Set up CI/CD integration (see ci-cd-examples/)"
elif [ $percentage -ge 80 ]; then
    echo -e "${YELLOW}⚠${NC} Most checks passed ($passed_checks/$total_checks)"
    echo ""
    echo "Review the warnings above and fix the remaining issues."
elif [ $percentage -ge 50 ]; then
    echo -e "${YELLOW}⚠${NC} Some checks failed ($passed_checks/$total_checks)"
    echo ""
    echo "Please follow INSTALLATION.md to complete the setup."
else
    echo -e "${RED}✗${NC} Many checks failed ($passed_checks/$total_checks)"
    echo ""
    echo "Please start from the beginning with INSTALLATION.md"
fi

echo ""
exit $((total_checks - passed_checks))
