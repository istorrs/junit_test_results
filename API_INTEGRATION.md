# JUnit Dashboard API Integration Guide

## Overview

The JUnit Test Results Dashboard provides a comprehensive API for integrating with CI/CD pipelines like Jenkins, GitHub Actions, GitLab CI, and others. This guide covers how to upload test results automatically from your build processes.

## API Endpoints

### Upload Test Results

**Endpoint:** `POST /api/upload`

Upload JUnit XML test results to the dashboard.

#### Request Format

```javascript
{
  "xmlContent": "<?xml version=\"1.0\"...<testsuites>...</testsuites>",
  "filename": "test-results.xml",
  "metadata": {
    "ci_provider": "jenkins",
    "build_id": "12345",
    "commit_sha": "abc123def456",
    "branch": "main",
    "repository": "my-org/my-repo",
    "build_url": "https://jenkins.example.com/job/test/12345/"
  }
}
```

#### Response Format

```javascript
{
  "success": true,
  "runId": 123,
  "fileUploadId": 456,
  "message": "Test results uploaded successfully",
  "url": "https://dashboard.example.com/details.html?run=123"
}
```

### Query Test Results

**Endpoint:** `GET /api/results`

Query test results with various filters.

#### Parameters

- `runId` - Filter by specific test run
- `status` - Filter by test status (passed, failed, error, skipped)
- `suite` - Filter by test suite name
- `search` - Search in test names and class names
- `limit` - Number of results to return (default: 50)
- `offset` - Pagination offset (default: 0)

### Get Statistics

**Endpoint:** `GET /api/stats`

Get test execution statistics and flaky test information.

#### Parameters

- `runId` - Get stats for specific test run
- `timeRange` - Filter by time range (today, week, month, all)

## Jenkins Integration

### Using Jenkins Pipeline

Add the following to your `Jenkinsfile`:

```groovy
pipeline {
    agent any
    
    stages {
        stage('Test') {
            steps {
                // Run your tests and generate JUnit XML
                sh 'mvn test'
                // or
                sh 'npm test -- --reporter=xunit'
            }
        }
        
        stage('Upload Results') {
            steps {
                script {
                    def xmlContent = readFile 'target/surefire-reports/TEST-*.xml'
                    
                    // Upload to dashboard
                    def result = sh(
                        script: """
                            curl -X POST https://dashboard.example.com/api/upload \
                                -H "Content-Type: application/json" \
                                -d '{
                                    "xmlContent": "${xmlContent.replace('"', '\\"')}",
                                    "filename": "jenkins-test-results.xml",
                                    "metadata": {
                                        "ci_provider": "jenkins",
                                        "build_id": "${env.BUILD_NUMBER}",
                                        "commit_sha": "${env.GIT_COMMIT}",
                                        "branch": "${env.GIT_BRANCH}",
                                        "repository": "${env.GIT_URL}",
                                        "build_url": "${env.BUILD_URL}"
                                    }
                                }'
                        """,
                        returnStdout: true
                    )
                    
                    def response = readJSON text: result
                    if (response.success) {
                        echo "Test results uploaded: ${response.url}"
                        // Archive the URL for easy access
                        archiveArtifacts artifacts: 'test-results-url.txt', 
                            content: "Dashboard URL: ${response.url}\n"
                    }
                }
            }
        }
    }
    
    post {
        always {
            // Alternative: Use JavaScript integration
            script {
                def xmlContent = readFile 'target/surefire-reports/TEST-*.xml'
                def jsScript = """
                    // Upload results using JavaScript API
                    uploadJUnitResults(`${xmlContent}`, 'jenkins-results.xml', {
                        ci_provider: 'jenkins',
                        build_id: '${env.BUILD_NUMBER}',
                        commit_sha: '${env.GIT_COMMIT}',
                        branch: '${env.GIT_BRANCH}',
                        repository: '${env.GIT_URL}',
                        build_url: '${env.BUILD_URL}'
                    });
                """
                
                // Execute the upload script
                sh "node -e \"${jsScript}\""
            }
        }
    }
}
```

### Using Jenkins Post-Build Action

For Freestyle jobs, add a post-build action:

```bash
#!/bin/bash
# Add this as a post-build step

# Read the JUnit XML file
XML_CONTENT=$(cat target/surefire-reports/TEST-*.xml | sed 's/"/\\"/g')

# Upload to dashboard
curl -X POST https://dashboard.example.com/api/upload \
  -H "Content-Type: application/json" \
  -d "{
    \"xmlContent\": \"$XML_CONTENT\",
    \"filename\": \"jenkins-test-results.xml\",
    \"metadata\": {
      \"ci_provider\": \"jenkins\",
      \"build_id\": \"$BUILD_NUMBER\",
      \"commit_sha\": \"$GIT_COMMIT\",
      \"branch\": \"$GIT_BRANCH\",
      \"repository\": \"$GIT_URL\",
      \"build_url\": \"$BUILD_URL\"
    }
  }"
```

## GitHub Actions Integration

Create a workflow file `.github/workflows/test-and-upload.yml`:

```yaml
name: Test and Upload Results

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 11
      uses: actions/setup-java@v3
      with:
        java-version: '11'
        distribution: 'temurin'
    
    - name: Run tests
      run: mvn test
      continue-on-error: true
    
    - name: Upload test results
      if: always()
      run: |
        # Read the JUnit XML file
        XML_CONTENT=$(cat target/surefire-reports/TEST-*.xml | sed 's/"/\\"/g')
        
        # Upload to dashboard
        curl -X POST https://dashboard.example.com/api/upload \
          -H "Content-Type: application/json" \
          -d "{
            \"xmlContent\": \"$XML_CONTENT\",
            \"filename\": \"github-actions-results.xml\",
            \"metadata\": {
              \"ci_provider\": \"github_actions\",
              \"build_id\": \"${{ github.run_number }}\",
              \"commit_sha\": \"${{ github.sha }}\",
              \"branch\": \"${{ github.ref_name }}\",
              \"repository\": \"${{ github.repository }}\",
              \"build_url\": \"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"
            }
          }"
    
    - name: Comment PR with dashboard link
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          // Get the dashboard URL from the previous step
          const dashboardUrl = process.env.DASHBOARD_URL;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `🧪 Test results uploaded to [JUnit Dashboard](${dashboardUrl})`
          });
```

## GitLab CI Integration

Add to your `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - upload

test:
  stage: test
  script:
    - mvn test
  artifacts:
    reports:
      junit: target/surefire-reports/TEST-*.xml
    paths:
      - target/surefire-reports/
    when: always

upload_results:
  stage: upload
  script:
    - |
      # Read the JUnit XML file
      XML_CONTENT=$(cat target/surefire-reports/TEST-*.xml | sed 's/"/\\"/g')
      
      # Upload to dashboard
      curl -X POST https://dashboard.example.com/api/upload \
        -H "Content-Type: application/json" \
        -d "{
          \"xmlContent\": \"$XML_CONTENT\",
          \"filename\": \"gitlab-ci-results.xml\",
          \"metadata\": {
            \"ci_provider\": \"gitlab_ci\",
            \"build_id\": \"$CI_PIPELINE_ID\",
            \"commit_sha\": \"$CI_COMMIT_SHA\",
            \"branch\": \"$CI_COMMIT_REF_NAME\",
            \"repository\": \"$CI_PROJECT_PATH\",
            \"build_url\": \"$CI_PIPELINE_URL\"
          }
        }"
  dependencies:
    - test
  when: always
```

## JavaScript Integration

For custom integrations, you can use the JavaScript API:

```javascript
// In your build script or CI pipeline
const fs = require('fs');
const axios = require('axios');

async function uploadTestResults() {
    try {
        // Read JUnit XML file
        const xmlContent = fs.readFileSync('target/surefire-reports/TEST-results.xml', 'utf8');
        
        // Upload to dashboard
        const response = await axios.post('https://dashboard.example.com/api/upload', {
            xmlContent: xmlContent,
            filename: 'my-test-results.xml',
            metadata: {
                ci_provider: 'custom',
                build_id: process.env.BUILD_NUMBER || 'local',
                commit_sha: process.env.GIT_COMMIT || 'unknown',
                branch: process.env.GIT_BRANCH || 'unknown',
                repository: process.env.GIT_URL || 'local'
            }
        });
        
        console.log('Test results uploaded successfully!');
        console.log('Dashboard URL:', response.data.url);
        
        // You can save this URL for later reference
        fs.writeFileSync('dashboard-url.txt', response.data.url);
        
    } catch (error) {
        console.error('Failed to upload test results:', error.message);
        process.exit(1);
    }
}

uploadTestResults();
```

## Environment Variables

The API supports the following metadata fields:

| Field | Description | Example |
|-------|-------------|---------|
| `ci_provider` | CI/CD system name | `jenkins`, `github_actions`, `gitlab_ci` |
| `build_id` | Unique build identifier | `12345` |
| `commit_sha` | Git commit hash | `abc123def456` |
| `branch` | Git branch name | `main`, `feature/new-feature` |
| `repository` | Repository identifier | `my-org/my-repo` |
| `build_url` | Link to CI build | `https://ci.example.com/build/12345` |

## Error Handling

The API provides detailed error messages:

```javascript
{
  "success": false,
  "error": "Duplicate test results",
  "runId": 123  // ID of existing run with same content
}
```

Common error cases:
- Missing required fields (xmlContent, filename)
- Invalid XML format
- Duplicate test results
- Database connection issues

## Best Practices

1. **Always upload results**: Use `continue-on-error: true` or `when: always` to ensure results are uploaded even when tests fail.

2. **Include metadata**: Provide as much context as possible (commit SHA, branch, build URL) for better traceability.

3. **Handle duplicates**: Check for duplicate detection and handle appropriately in your pipeline.

4. **Secure the endpoint**: In production, add authentication to the API endpoint.

5. **Rate limiting**: Implement rate limiting to prevent abuse of the upload endpoint.

6. **Async processing**: For large test suites, consider processing uploads asynchronously.

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure your dashboard is configured to accept requests from your CI domains.

2. **Large file uploads**: For very large XML files, consider compressing or splitting the uploads.

3. **Network timeouts**: Implement retry logic for failed uploads.

4. **Authentication**: Add API keys or tokens for secure access.

### Debug Mode

Enable debug logging in your CI pipeline:

```bash
# Add verbose logging
curl -v -X POST https://dashboard.example.com/api/upload \
  -H "Content-Type: application/json" \
  -d "{...}" \
  2>&1 | tee upload-debug.log
```

## Support

For issues or questions about API integration, please refer to the documentation or contact support.