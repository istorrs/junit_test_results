# Jenkins Pipeline Scripts

This directory contains Jenkins pipeline scripts for the JUnit Test Results Dashboard.

## import-historical-data.jenkinsfile

Pipeline for importing historical JUnit XML test results from existing Jenkins jobs into the dashboard.

### Features

- Imports historical test results from any Jenkins job with archived JUnit XML files
- Configurable build range (import all builds or specific range)
- Duplicate detection and skipping
- Dry run mode for testing
- Statistics tracking and reporting
- Health check validation before processing

### Prerequisites

1. Jenkins with the following plugins:
    - Pipeline plugin
    - Copy Artifact plugin
    - Groovy plugin

2. Dashboard API must be accessible from Jenkins

3. Source Jenkins job must have archived JUnit XML artifacts

### Parameters

| Parameter         | Default                 | Description                        |
| ----------------- | ----------------------- | ---------------------------------- |
| SOURCE_JOB        | GITHUB_CD_GATEWAY_TEST  | Jenkins job name to import from    |
| DASHBOARD_API_URL | http://localhost/api/v1 | Dashboard API base URL             |
| START_BUILD       | 1                       | First build number to process      |
| END_BUILD         | (empty)                 | Last build number (empty = latest) |
| ARTIFACTS_PATH    | reports/                | Path to artifacts within builds    |
| DRY_RUN           | false                   | Test mode without uploading        |
| SKIP_DUPLICATES   | true                    | Skip duplicate uploads             |

### Usage

#### Option 1: Create a New Jenkins Pipeline Job

1. In Jenkins, create a new Pipeline job
2. In the Pipeline section, select "Pipeline script from SCM"
3. Configure your Git repository
4. Set Script Path to: `jenkins/import-historical-data.jenkinsfile`
5. Save and build with parameters

#### Option 2: Run Directly

1. Create a new Pipeline job
2. Select "Pipeline script" (not from SCM)
3. Copy the contents of `import-historical-data.jenkinsfile`
4. Paste into the Pipeline script field
5. Save and build with parameters

### Example Configuration

To import builds 100-200 from job "MyTestJob":

```
SOURCE_JOB: MyTestJob
DASHBOARD_API_URL: http://your-server:5000/api/v1
START_BUILD: 100
END_BUILD: 200
ARTIFACTS_PATH: target/surefire-reports/
DRY_RUN: false
SKIP_DUPLICATES: true
```

### API Endpoint

The script uploads to: `{DASHBOARD_API_URL}/upload`

**Important:** Uses single file upload endpoint with `file=` field (not `files=`).

### Output

The pipeline produces:

- Console log with detailed progress
- `import-stats.json` artifact with import statistics
- Summary report at completion

Statistics include:

- Total builds found
- Builds processed
- XML files found
- Files uploaded successfully
- Files skipped (duplicates)
- Files failed

### Troubleshooting

**Error: "Unexpected field"**

- The API expects `file=` for single uploads
- Script has been fixed to use correct field name

**Error: "Dashboard API health check failed"**

- Verify DASHBOARD_API_URL is correct
- Check network connectivity from Jenkins to dashboard
- Ensure dashboard service is running

**Error: "Source job not found"**

- Verify SOURCE_JOB name matches exactly (case-sensitive)
- Check Jenkins job permissions

**No artifacts found**

- Verify ARTIFACTS_PATH matches your project structure
- Common paths:
    - Maven: `target/surefire-reports/`
    - Gradle: `build/test-results/test/`
    - Custom: adjust ARTIFACTS_PATH parameter

### CI Metadata

Each uploaded file includes CI metadata:

```json
{
    "build_number": 123,
    "build_time": "2025-11-10T12:00:00Z",
    "job_name": "GITHUB_CD_GATEWAY_TEST"
}
```

This links test results to their original Jenkins builds.

### Best Practices

1. **Start with dry run** - Test with DRY_RUN=true first
2. **Import in batches** - Process 50-100 builds at a time for large datasets
3. **Monitor resources** - Large imports consume disk space for temporary files
4. **Enable duplicate skipping** - Prevents re-uploading same results
5. **Check build artifacts** - Ensure source job has XML files archived

### Maintenance

The script automatically cleans up temporary files after processing each build.

### Related Files

- `/ci-cd-examples/Jenkinsfile` - Standard CI/CD pipeline for ongoing test uploads
- `/backend/src/routes/upload.js` - API endpoint implementation
