# JUnit Test Results Dashboard

A comprehensive web-based dashboard for viewing, analyzing, and managing JUnit test results with MongoDB backend and CI/CD integration.

## Features

### Core Features

- 📊 **Interactive Dashboard** - View test results with beautiful charts and visualizations
- 🔄 **CI/CD Integration** - Direct API access from Jenkins, GitHub Actions, and other CI/CD tools
- 📈 **Real Trend Analysis** - Track test success rates and execution times with actual historical data
- 🔍 **Advanced Filtering** - Search and filter tests by status, name, date, and more
- 📁 **Batch Upload** - Upload multiple JUnit XML files at once
- 🗄️ **MongoDB Backend** - Scalable database for storing test history
- 🚀 **Production Ready** - PM2 process management and Nginx reverse proxy

### Advanced Analytics (NEW! ⭐)

- 📜 **Test Case History** - View complete execution history for any test with timeline charts
- 🎯 **Flaky Test Management** - Dedicated page to track and manage flaky tests with failure rates
- 🔔 **Actionable Insights** - Automatic detection of new failures, regressions, and issues
- ⚡ **Performance Tracking** - Monitor test execution times and detect performance regressions
- 📉 **Failure Analysis** - Automatic grouping and analysis of common failure patterns
- 🎨 **Visual Indicators** - Flaky badges, trend indicators, and severity-based alerts

## Architecture

```
┌─────────────────────────┐
│   CI/CD Pipelines       │
│  (Jenkins/GitHub/etc)   │
└───────────┬─────────────┘
            │ POST /api/v1/upload
            ▼
┌─────────────────────────┐
│  Backend API Server     │
│  (Node.js + Express)    │
│  Port: 5000             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  MongoDB Database       │
│  (Test Results Storage) │
└─────────────────────────┘
            ▲
            │ API Calls
┌───────────┴─────────────┐
│  Frontend Dashboard     │
│  (HTML/CSS/JavaScript)  │
│  Port: 80 (Nginx)       │
└─────────────────────────┘
```

## Quick Start

### Prerequisites

- Ubuntu 24.04 (or similar Linux distribution)
- Root or sudo access
- Internet connection

### Installation

Follow the comprehensive guide: **[INSTALLATION.md](INSTALLATION.md)**

Quick summary:

```bash
# 1. Install MongoDB 7.0
# 2. Install Node.js 20 LTS
# 3. Install PM2 and Nginx
# 4. Set up backend application
# 5. Configure frontend
# 6. Start services

# See INSTALLATION.md for detailed step-by-step instructions
```

## Usage

### Web Dashboard

1. Open browser and navigate to: `http://YOUR_SERVER_IP`
2. Upload JUnit XML files via drag-and-drop
3. View test results, trends, and statistics

### CI/CD Integration

#### Jenkins

```groovy
stage('Upload Test Results') {
    steps {
        sh '''
            find . -name "*.xml" -path "*/target/surefire-reports/*" | while read xmlfile; do
                curl -X POST http://your-server:5000/api/v1/upload \
                    -F "file=@$xmlfile" \
                    -F 'ci_metadata={"provider":"jenkins","build_id":"'$BUILD_ID'"}'
            done
        '''
    }
}
```

See [ci-cd-examples/Jenkinsfile](ci-cd-examples/Jenkinsfile) for complete example.

#### GitHub Actions

```yaml
- name: Upload test results
  run: |
      curl -X POST ${{ secrets.JUNIT_API_URL }}/api/v1/upload \
        -F "file=@test-results.xml" \
        -F 'ci_metadata={"provider":"github_actions","build_id":"${{ github.run_id }}"}'
```

See [ci-cd-examples/github-actions.yml](ci-cd-examples/github-actions.yml) for complete workflow.

#### Manual Upload Script

```bash
# Upload all XML files from a directory
JUNIT_API_URL=http://your-server:5000 ./ci-cd-examples/upload-test-results.sh ./test-results
```

### API Endpoints

```
POST   /api/v1/upload              - Upload JUnit XML file
POST   /api/v1/upload/batch        - Upload multiple files
GET    /api/v1/runs                - Get test runs (paginated)
GET    /api/v1/runs/:id            - Get specific test run
DELETE /api/v1/runs/:id            - Delete test run
GET    /api/v1/cases               - Get test cases (filtered)
GET    /api/v1/cases/:id           - Get test case details
GET    /api/v1/cases/:id/history   - Get test execution history
GET    /api/v1/stats/overview      - Get overall statistics
GET    /api/v1/stats/trends        - Get test trends
GET    /api/v1/stats/flaky-tests   - Get flaky tests
GET    /health                     - Health check
```

## Project Structure

```
.
├── backend/                         # Backend API server
│   ├── src/
│   │   ├── config/                 # Database configuration
│   │   ├── models/                 # Mongoose schemas
│   │   ├── routes/                 # API endpoints
│   │   ├── services/               # Business logic
│   │   ├── middleware/             # Express middleware
│   │   ├── utils/                  # Utilities
│   │   └── server.js               # Main server file
│   ├── .env.example                # Environment template
│   ├── ecosystem.config.js         # PM2 configuration
│   └── package.json
├── ci-cd-examples/                 # CI/CD integration examples
│   ├── Jenkinsfile                 # Jenkins pipeline
│   ├── github-actions.yml          # GitHub Actions workflow
│   └── upload-test-results.sh     # Bash upload script
├── index.html                      # Main dashboard page
├── details.html                    # Test details page
├── reports.html                    # Reports page
├── api-client.js                   # Frontend API client
├── main.js                         # Dashboard logic
├── test-details-modal.js           # Modal component
├── api.js                          # Additional API functions
├── debug.js                        # Debug utilities
├── sample-test-results.xml         # Sample test data
├── INSTALLATION.md                 # Installation guide
├── MONGODB_BACKEND_SETUP.md        # Detailed backend setup
└── README.md                       # This file
```

## Documentation

- **[INSTALLATION.md](INSTALLATION.md)** - Complete installation guide for Ubuntu 24.04
- **[MONGODB_BACKEND_SETUP.md](MONGODB_BACKEND_SETUP.md)** - Comprehensive backend setup and configuration
- **[backend/README.md](backend/README.md)** - Backend API documentation
- **[CLAUDE.MD](CLAUDE.MD)** - Original project documentation

## Configuration

### Backend (.env)

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://user:pass@localhost:27017/junit_test_results
ALLOWED_ORIGINS=http://localhost,http://your-domain.com
MAX_FILE_SIZE=52428800  # 50MB
```

### Frontend (api-client.js)

Update the API URL in `api-client.js`:

```javascript
return 'http://YOUR_SERVER_IP:5000/api/v1';
```

## Monitoring

### View Logs

```bash
# Backend logs
pm2 logs junit-dashboard-api

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
```

### Check Status

```bash
# Check all services
sudo systemctl status mongod nginx
pm2 status
```

## Backup and Recovery

### Backup MongoDB

```bash
mongodump --uri="mongodb://user:pass@localhost:27017/junit_test_results" --out=./backup
```

### Restore MongoDB

```bash
mongorestore --uri="mongodb://user:pass@localhost:27017" ./backup
```

See [INSTALLATION.md](INSTALLATION.md#backup-and-recovery) for automated backup setup.

## Troubleshooting

### Backend won't start

```bash
# Check MongoDB is running
sudo systemctl status mongod

# Check backend logs
pm2 logs junit-dashboard-api
```

### Cannot upload files

```bash
# Check file size limits
# Backend: MAX_FILE_SIZE in .env
# Nginx: client_max_body_size in nginx config

# Check upload directory permissions
ls -la /opt/junit-dashboard/uploads
```

### CORS errors

```bash
# Add your frontend URL to ALLOWED_ORIGINS in .env
# Restart backend
pm2 restart junit-dashboard-api
```

See [INSTALLATION.md](INSTALLATION.md#troubleshooting) for more solutions.

## Cloud Migration

The application is designed for easy migration to cloud services:

- **MongoDB**: Migrate to MongoDB Atlas
- **Backend**: Deploy to AWS, GCP, Azure, or Heroku
- **Frontend**: Host on GitHub Pages, Netlify, or Vercel

See [MONGODB_BACKEND_SETUP.md](MONGODB_BACKEND_SETUP.md#cloud-migration-strategy) for migration guides.

## Security

- MongoDB authentication enabled
- CORS protection
- Input validation
- File upload size limits
- Secure password hashing
- Production-ready configuration

See [INSTALLATION.md](INSTALLATION.md#security-recommendations) for security best practices.

## Performance

- PM2 cluster mode (multi-core support)
- MongoDB indexes for fast queries
- Nginx compression and caching
- Connection pooling
- Async operations

## Technology Stack

### Backend

- Node.js 20 LTS
- Express.js 4.x
- MongoDB 7.0
- Mongoose 8.x
- PM2 (process manager)

### Frontend

- HTML5, CSS3, JavaScript (ES6+)
- Tailwind CSS
- ECharts.js (charts)
- Anime.js (animations)

### Infrastructure

- Nginx (reverse proxy)
- Ubuntu 24.04 LTS

## Contributing

This is a self-hosted solution. Feel free to customize for your needs.

## License

[Specify your license]

## Support

For issues or questions:

1. Check [INSTALLATION.md](INSTALLATION.md#troubleshooting)
2. Review backend logs: `pm2 logs junit-dashboard-api`
3. Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`

## Changelog

### Version 2.0 (Phase 1 Implementation)

- ✅ MongoDB backend implementation
- ✅ RESTful API with Express.js
- ✅ CI/CD integration (Jenkins, GitHub Actions)
- ✅ Production-ready deployment
- ✅ PM2 process management
- ✅ Nginx reverse proxy
- ✅ Flaky test detection
- ✅ Comprehensive documentation

### Version 1.0 (Original)

- Client-side IndexedDB implementation
- Static file dashboard
- Manual file upload only

---

**Ready to get started?** Follow the [INSTALLATION.md](INSTALLATION.md) guide!
