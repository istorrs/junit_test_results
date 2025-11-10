# Jenkins Historical Data Import Guide

This guide explains how to import historical JUnit test results from your Jenkins job (`GITHUB_CD_GATEWAY_TEST`) into the JUnit Test Results Dashboard.

## Overview

You have two options for importing historical data:

1. **Pipeline Job** - Create a reusable Jenkins pipeline job (recommended for repeated imports)
2. **Script Console** - Run a one-time import script directly from Jenkins

Both methods will:
- Iterate through all builds of `GITHUB_CD_GATEWAY_TEST`
- Find all XML files in the `reports/` artifacts directory
- Upload them to your dashboard API
- Skip duplicates automatically
- Provide detailed import statistics

## Option 1: Jenkins Pipeline Job (Recommended)

### Setup

1. **Create New Pipeline Job**
   - Go to Jenkins → New Item
   - Name: `Import-Historical-Test-Results`
   - Type: Pipeline
   - Click OK

2. **Configure Pipeline**
   - Scroll to "Pipeline" section
   - Definition: Pipeline script from SCM or paste the script directly
   - Copy contents from: `jenkins-import-historical-data.groovy`

3. **Configure Parameters** (when running the job)
   - `SOURCE_JOB`: `GITHUB_CD_GATEWAY_TEST`
   - `DASHBOARD_API_URL`: `http://beelink-ubuntu/api/v1` (or your dashboard URL)
   - `START_BUILD`: `1` (or your starting build number)
   - `END_BUILD`: Leave empty for latest, or specify a number
   - `ARTIFACTS_PATH`: `reports/`
   - `DRY_RUN`: Check for testing without uploading
   - `SKIP_DUPLICATES`: Check to skip duplicate files

### Usage

1. **Test Run First**
   - Check `DRY_RUN` parameter
   - Click "Build with Parameters"
   - Review console output to see what would be imported

2. **Actual Import**
   - Uncheck `DRY_RUN`
   - Click "Build with Parameters"
   - Monitor progress in console output

3. **Review Results**
   - Check console output for summary statistics
   - Download `import-stats.json` artifact for detailed report
   - Verify data in dashboard at `http://beelink-ubuntu/`

### Example Configuration

For your specific case:

```
SOURCE_JOB: GITHUB_CD_GATEWAY_TEST
DASHBOARD_API_URL: http://beelink-ubuntu/api/v1
START_BUILD: 1
END_BUILD: 10000
ARTIFACTS_PATH: reports/
DRY_RUN: false
SKIP_DUPLICATES: true
```

**Note:** `END_BUILD` is set to `10000` to process all builds. The script will skip build numbers that don't exist.

### Import in Batches

For large datasets, import in batches to avoid timeouts:

**Batch 1:**
- START_BUILD: `1`
- END_BUILD: `100`

**Batch 2:**
- START_BUILD: `101`
- END_BUILD: `200`

And so on...

## Option 2: Jenkins Script Console (Quick One-Time Import)

### Setup

1. **Go to Script Console**
   - Navigate to: Jenkins → Manage Jenkins → Script Console

2. **Configure the Script**
   - Open: `jenkins-import-script-console.groovy`
   - Edit these variables at the top:
     ```groovy
     def SOURCE_JOB_NAME = 'GITHUB_CD_GATEWAY_TEST'
     def DASHBOARD_API_URL = 'http://beelink-ubuntu/api/v1'
     def START_BUILD = 1
     def END_BUILD = 0  // 0 = latest
     def DRY_RUN = false
     ```

3. **Run the Script**
   - Copy the entire script
   - Paste into Script Console
   - Click "Run"

### Advantages
- ✅ Quick and easy for one-time imports
- ✅ No need to create a separate job
- ✅ Immediate execution and results

### Disadvantages
- ❌ No built-in retry mechanism
- ❌ Can't schedule or automate
- ❌ Limited logging compared to pipeline

## Understanding the Import Process

### What Gets Imported

For each build in `GITHUB_CD_GATEWAY_TEST`:
- Build number (e.g., `460`)
- Build timestamp
- All XML files in `http://beelink-ubuntu:8080/job/GITHUB_CD_GATEWAY_TEST/{build}/artifact/reports/`

### API Upload

Each XML file is uploaded via:
```bash
POST http://beelink-ubuntu/api/v1/upload
Content-Type: multipart/form-data

files: [XML file]
ci_metadata: {
  "build_number": 460,
  "build_time": "2025-11-09T10:30:00Z",
  "job_name": "GITHUB_CD_GATEWAY_TEST"
}
```

### Duplicate Detection

The dashboard automatically detects duplicates based on:
- Content hash of the XML file
- If duplicate is found: HTTP 409 response
- Script will skip and continue to next file

## Monitoring Progress

### Pipeline Job
- Watch console output in real-time
- Check progress: `Processed Builds: X/Y`
- View statistics at the end

### Script Console
- Output appears directly in console
- Shows progress for each build and file
- Final summary with statistics

## Expected Output

```
=== JUnit Historical Data Import ===
Source Job: GITHUB_CD_GATEWAY_TEST
Dashboard API: http://beelink-ubuntu/api/v1
Build Range: 1 to 460
=========================================

--- Processing Build #1 ---
Build Date: 2025-01-15 10:30:00
Build Result: SUCCESS
Found 5 XML file(s)
  Processing: test-results-1.xml
  ✓ Uploaded successfully
  Processing: test-results-2.xml
  ✓ Uploaded successfully
  ...

=========================================
=== Import Summary ===
=========================================
Total Builds Found: 460
Builds Processed: 460
Total XML Files: 2,300
Files Uploaded: 2,150
Files Skipped (duplicates): 120
Files Failed: 30
=========================================
```

## Important Notes

### Jenkins Sandbox and Filesystem Access

The pipeline script uses **filesystem access** instead of Jenkins API methods to avoid sandbox security restrictions. This approach:
- Accesses build data directly from `$JENKINS_HOME/jobs/{job_name}/builds/{build_number}/`
- Does not require script approval or `@NonCPS` annotations
- Works with Jenkins sandbox mode enabled
- Requires that the Jenkins agent can access `$JENKINS_HOME`

The script reads:
- Build directories: `$JENKINS_HOME/jobs/GITHUB_CD_GATEWAY_TEST/builds/*/`
- Build metadata: `build.xml` for timestamps
- Artifacts: `archive/reports/*.xml`

### END_BUILD Parameter

Since the script uses filesystem access instead of API methods, it cannot automatically detect the latest build number. Therefore:
- Set `END_BUILD` to a high number (e.g., `10000`) to process all available builds
- The script will skip build numbers that don't exist
- Only builds with actual artifacts will be processed

## Troubleshooting

### Issue: Connection Refused

**Problem:** Cannot connect to dashboard API

**Solution:**
- Verify dashboard is running: `curl http://beelink-ubuntu/health`
- Update `DASHBOARD_API_URL` to correct hostname/IP
- Ensure Jenkins can reach the dashboard server

### Issue: Build Artifacts Not Found

**Problem:** `No artifacts directory found`

**Solution:**
- Verify artifacts exist: Check `http://beelink-ubuntu:8080/job/GITHUB_CD_GATEWAY_TEST/460/artifact/reports/`
- Update `ARTIFACTS_PATH` if reports are in different location
- Some builds may not have artifacts - script will skip them

### Issue: Upload Failed - HTTP 413

**Problem:** Request entity too large

**Solution:**
- Increase nginx `client_max_body_size` in dashboard
- Current limit: 50MB (configured in nginx.conf)

### Issue: Timeout

**Problem:** Import takes too long and times out

**Solution:**
- Import in smaller batches (100 builds at a time)
- Increase Jenkins job timeout
- Run during off-peak hours

### Issue: Duplicate Files

**Problem:** Many files marked as duplicates

**Solution:**
- Expected behavior if you've already imported some data
- Set `SKIP_DUPLICATES: false` if you want to see errors instead
- Clear dashboard database if you want to re-import everything:
  ```bash
  docker exec junit-mongodb mongosh -u admin -p changeme --authenticationDatabase admin junit_test_results --eval "db.dropDatabase()"
  docker compose restart backend
  ```

## Verification

After import completes:

1. **Check Dashboard**
   - Navigate to: `http://beelink-ubuntu/`
   - Verify test runs appear with correct dates
   - Check test run names match expectations

2. **Verify Counts**
   - Total test runs should match number of successful uploads
   - Check statistics are calculated correctly

3. **Spot Check**
   - Open a few test run details
   - Verify test cases are present
   - Check stack traces for failed tests

## Performance Considerations

### Estimated Import Time

- **Per build**: ~2-5 seconds (depending on # of XML files)
- **Per XML file**: ~500ms (with 500ms delay between files)
- **460 builds** with ~5 files each: ~1-2 hours

### Optimization Tips

1. **Run during off-peak hours** to avoid impacting Jenkins performance
2. **Use batches** for very large datasets
3. **Increase API timeout** if needed in nginx.conf
4. **Monitor disk space** on MongoDB server

## Post-Import Tasks

After successful import:

1. **Verify Data Quality**
   - Check for missing test runs
   - Verify test counts match Jenkins records

2. **Update Test Run Names** (optional)
   - Run migration script to update generic names:
   ```bash
   docker exec junit-backend node /app/migrate-names.js
   ```

3. **Recalculate Statistics** (if needed)
   - Run stats migration:
   ```bash
   docker exec junit-backend node /app/migrate-stats.js
   ```

4. **Clean Up**
   - Archive or delete import job if one-time use
   - Save import-stats.json for records

## Example: Complete Import Workflow

```bash
# 1. Test with dry run (first 10 builds)
START_BUILD: 1
END_BUILD: 10
DRY_RUN: true

# 2. Import first batch
START_BUILD: 1
END_BUILD: 100
DRY_RUN: false

# 3. Verify in dashboard
# Check http://beelink-ubuntu/

# 4. Continue with remaining batches
START_BUILD: 101
END_BUILD: 200
DRY_RUN: false

# ... repeat until complete

# 5. Final verification
# Check total count matches expectations
```

## Support

For issues or questions:
- Check console output for specific error messages
- Review dashboard logs: `docker logs junit-backend`
- Check MongoDB logs: `docker logs junit-mongodb`
- Review nginx logs: `docker logs junit-nginx`

---

**Note:** Always run a DRY_RUN first to verify configuration before importing large datasets!
