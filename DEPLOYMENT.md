# Deployment Guide - Competitive Analysis Features

## Quick Start

Deploy all new features with a single command:

```bash
./deploy.sh
```

## Deployment Options

### Standard Deployment (Recommended)
Gracefully restarts nginx to pick up new files:
```bash
./deploy.sh
```

### Full Rebuild
Completely rebuilds and restarts all containers:
```bash
./deploy.sh --full
```

### Backend Only
Restarts only the backend service:
```bash
./deploy.sh --backend
```

### Frontend Only
Restarts only nginx (frontend):
```bash
./deploy.sh --frontend
```

### Status Check
Check status without deploying:
```bash
./deploy.sh --check
```

## What Gets Deployed

### New HTML Pages
- `compare-runs.html` - Side-by-side test run comparison
- `performance-analysis.html` - Performance monitoring dashboard

### New JavaScript Files
- `global-search.js` - Global search functionality (Ctrl+/)

### Updated Files
- `test-details-modal.js` - Enhanced with tabs and mini-history
- `index.html`, `details.html`, etc. - Updated navigation menus
- `backend/src/routes/stats.js` - New performance API endpoints
- `backend/src/routes/runs.js` - Run comparison endpoint

## Verification Steps

After deployment, verify:

1. **Containers are running:**
   ```bash
   docker-compose ps
   ```
   All services should show "Up" status.

2. **Health endpoints respond:**
   ```bash
   curl http://localhost:5000/health  # Backend
   curl http://localhost/health       # Frontend
   ```

3. **New pages are accessible:**
   ```bash
   curl http://localhost/performance-analysis.html
   curl http://localhost/compare-runs.html
   ```

4. **Open in browser:**
   - http://localhost - Main dashboard
   - Click "Performance" in navigation
   - Click "Compare Runs" in navigation
   - Press Ctrl+/ to test global search

## Troubleshooting

### Containers won't start

Check logs:
```bash
docker-compose logs backend
docker-compose logs nginx
docker-compose logs mongodb
```

### New pages show 404

1. Verify files are mounted in docker-compose.yml
2. Restart nginx:
   ```bash
   docker-compose restart nginx
   ```

### Backend API errors

1. Check backend logs:
   ```bash
   docker-compose logs -f backend
   ```

2. Restart backend:
   ```bash
   docker-compose restart backend
   ```

3. Check MongoDB connection:
   ```bash
   docker-compose logs mongodb
   ```

### Performance/Compare pages load but don't work

1. Check browser console for JavaScript errors
2. Verify API endpoints are accessible:
   ```bash
   curl http://localhost:5000/api/v1/stats/slowest-tests
   curl http://localhost:5000/api/v1/stats/performance-regressions
   ```

3. Check backend logs for errors

### Global search (Ctrl+/) doesn't open

1. Verify global-search.js is loaded (check browser dev tools)
2. Try clicking the "Search" button in navigation instead
3. Check browser console for errors

## Manual Deployment Steps

If the script doesn't work, deploy manually:

1. **Update docker-compose.yml:**
   Ensure new files are in the volumes section (already done in this repo).

2. **Restart nginx:**
   ```bash
   docker-compose restart nginx
   ```

3. **Restart backend (if backend code changed):**
   ```bash
   docker-compose restart backend
   ```

4. **Verify:**
   ```bash
   docker-compose ps
   curl http://localhost/performance-analysis.html
   ```

## Environment Variables

No new environment variables are required for these features. All existing configuration works.

## Rollback

If you need to rollback:

1. **Revert docker-compose.yml:**
   ```bash
   cp docker-compose.yml.backup docker-compose.yml
   ```

2. **Checkout previous commit:**
   ```bash
   git checkout HEAD~1
   ```

3. **Restart services:**
   ```bash
   docker-compose restart nginx backend
   ```

## Production Considerations

### Before deploying to production:

1. **Test thoroughly** in staging/development
2. **Backup your database:**
   ```bash
   docker exec junit-mongodb mongodump --out=/tmp/backup
   docker cp junit-mongodb:/tmp/backup ./mongodb-backup
   ```

3. **Review backend changes:**
   - New API endpoints in `backend/src/routes/stats.js`
   - New comparison endpoint in `backend/src/routes/runs.js`

4. **Monitor after deployment:**
   ```bash
   docker-compose logs -f backend nginx
   ```

5. **Check performance:**
   - New endpoints may be CPU/memory intensive for large datasets
   - Monitor with: `docker stats`

### Performance Tuning

If performance regression analysis is slow:

1. **Add database indexes** (already included in backend):
   ```javascript
   testCaseSchema.index({ name: 1, classname: 1, created_at: -1 });
   testCaseSchema.index({ status: 1, time: -1 });
   ```

2. **Limit results** in API calls:
   ```javascript
   /stats/slowest-tests?limit=10  // Instead of 20
   /stats/performance-regressions?threshold=30  // Higher threshold = fewer results
   ```

3. **Cache API responses** (future enhancement)

## Security Notes

- All new endpoints use existing authentication
- No new credentials or secrets required
- CORS settings from existing configuration apply
- No SQL injection risk (using MongoDB with proper queries)

## Support

### Logs Location
- Backend: `./backend/logs/`
- Nginx: `docker-compose logs nginx`
- MongoDB: `docker-compose logs mongodb`

### Common Commands
```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f backend

# Check container resource usage
docker stats

# Restart everything
docker-compose restart

# Stop all services
docker-compose down

# Start all services
docker-compose up -d
```

## Features Overview

After deployment, users can:

1. **Compare Test Runs**
   - Navigate to "Compare Runs" in menu
   - Select two test runs
   - See new failures, new passes, performance regressions
   - Identify tests added/removed

2. **Monitor Performance**
   - Navigate to "Performance" in menu
   - See slowest tests with charts
   - Track performance regressions
   - Analyze suite-level performance

3. **Quick Search**
   - Press Ctrl+/ (or Cmd+/ on Mac)
   - Search any test by name or class
   - Navigate with arrow keys
   - Press Enter to view test history

4. **Enhanced Test Details**
   - Click any test to open modal
   - Use tabs: Overview, Failure Details, History, Metadata
   - See last 10 runs with visual timeline
   - View success rates and trends

All features are production-ready and fully functional!
