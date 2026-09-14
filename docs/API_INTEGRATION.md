# JUnit Dashboard API Integration Guide

## Overview

The JUnit Test Results Dashboard provides a REST API for integrating with CI/CD pipelines like Jenkins, GitHub Actions, GitLab CI, and others. This guide covers how to upload test results automatically from your build processes, and how to query them back.

For tested, working examples, see [`ci-cd-examples/`](../ci-cd-examples/) — `Jenkinsfile`, `github-actions.yml`, and `upload-test-results.sh`. The snippets below explain the same contract those scripts use.

## Uploading Test Results

### Upload a single file

**Endpoint:** `POST /api/v1/upload`

This is a `multipart/form-data` request, not JSON — the XML file is sent as a file field, not embedded as a string.

| Field             | Required | Description                                                                       |
| ----------------- | -------- | --------------------------------------------------------------------------------- |
| `file`            | yes      | The JUnit XML file (must end in `.xml`)                                           |
| `ci_metadata`     | no       | JSON string with CI context — see [CI Metadata Fields](#ci-metadata-fields) below |
| `release_tag`     | no       | Free-form release/tag label for this run                                          |
| `release_version` | no       | Free-form release/version label for this run                                      |

```bash
curl -X POST http://your-server:5000/api/v1/upload \
  -F "file=@target/surefire-reports/TEST-results.xml" \
  -F 'ci_metadata={"provider":"jenkins","job_name":"my-app","build_number":"42","build_url":"https://jenkins.example.com/job/my-app/42/"}'
```

#### Success response (201)

```json
{
    "success": true,
    "data": {
        "run_id": "6710a1b2c3d4e5f6a7b8c9d0",
        "file_upload_id": "6710a1b2c3d4e5f6a7b8c9d1",
        "stats": {
            "total_tests": 42,
            "passed": 40,
            "failed": 1,
            "errors": 0,
            "skipped": 1
        }
    }
}
```

#### Duplicate response (200)

If the exact same XML content was already uploaded, the upload is skipped rather than creating a duplicate run:

```json
{
    "success": true,
    "duplicate": true,
    "run_id": "6710a1b2c3d4e5f6a7b8c9d0",
    "file_upload_id": "6710a1b2c3d4e5f6a7b8c9d1",
    "message": "Duplicate file skipped"
}
```

#### Error responses

```json
{ "success": false, "error": "No file uploaded" }
```

```json
{ "success": false, "error": "Only XML files are allowed" }
```

### Upload multiple files at once

**Endpoint:** `POST /api/v1/upload/batch`

Same field conventions as above, but the file field is `files` (repeated, up to `MAX_FILES`, default 20) and `ci_metadata`/`release_tag`/`release_version` apply to every file in the batch.

```bash
curl -X POST http://your-server:5000/api/v1/upload/batch \
  -F "files=@target/surefire-reports/TEST-suite1.xml" \
  -F "files=@target/surefire-reports/TEST-suite2.xml" \
  -F 'ci_metadata={"provider":"jenkins","job_name":"my-app","build_number":"42"}'
```

```json
{
    "success": true,
    "data": {
        "total_files": 2,
        "successful": 2,
        "failed": 0,
        "results": [
            {
                "filename": "TEST-suite1.xml",
                "success": true,
                "run_id": "...",
                "file_upload_id": "...",
                "stats": { "...": "..." }
            },
            {
                "filename": "TEST-suite2.xml",
                "success": true,
                "run_id": "...",
                "file_upload_id": "...",
                "stats": { "...": "..." }
            }
        ]
    }
}
```

### CI Metadata Fields

`ci_metadata` is a JSON object, sent as a string form field. All fields are optional, but `job_name` + `build_number` matter the most:

| Field          | Description                                                                                                                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `job_name`     | CI job/project name. Along with `build_number`, this is used to find-or-merge an existing test run (so re-uploading suites from the same build accumulates into one run instead of creating duplicates) and to group runs by project in the dashboard. |
| `build_number` | Build/run number for this job.                                                                                                                                                                                                                         |
| `build_time`   | ISO timestamp for when the build ran. Takes priority over any timestamp in the XML itself for ordering runs.                                                                                                                                           |
| `provider`     | CI system name, e.g. `jenkins`, `github_actions`, `gitlab_ci`, `manual`.                                                                                                                                                                               |
| `build_id`     | Provider-specific build/run id (e.g. GitHub Actions run id).                                                                                                                                                                                           |
| `commit_sha`   | Git commit hash.                                                                                                                                                                                                                                       |
| `branch`       | Git branch name.                                                                                                                                                                                                                                       |
| `repository`   | Repository identifier.                                                                                                                                                                                                                                 |
| `build_url`    | Link back to the CI build.                                                                                                                                                                                                                             |

Uploads without `job_name`/`build_number` still work — each becomes its own standalone run, just without CI-based grouping/merging.

`release_tag` and `release_version` are separate top-level form fields (not nested under `ci_metadata`) used by the Releases/Comparison views.

## Querying Test Results

All query endpoints are `GET` and return `{ "success": true, "data": { ... } }`.

| Endpoint                                 | Purpose                                   | Common query params                                                                         |
| ---------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET /api/v1/runs`                       | List test runs, paginated                 | `page`, `limit`, `job_name`, `branch`, `from_date`, `to_date`                               |
| `GET /api/v1/runs/projects`              | List distinct `job_name` values           | —                                                                                           |
| `GET /api/v1/runs/:id`                   | Get one test run                          | —                                                                                           |
| `GET /api/v1/cases`                      | List test cases, paginated and filterable | `page`, `limit`, `run_id`, `suite_id`, `class_name`, `name`, `status`, `is_flaky`, `search` |
| `GET /api/v1/cases/:id`                  | Get one test case                         | —                                                                                           |
| `GET /api/v1/cases/:id/history`          | Execution history for a test case         | —                                                                                           |
| `GET /api/v1/stats/overview`             | Overall pass/fail statistics              | `run_id`, `job_name`, `from_date`, `to_date`                                                |
| `GET /api/v1/analytics/flaky-tests`      | Flaky tests with metrics                  | —                                                                                           |
| `GET /api/v1/analytics/failure-patterns` | Grouped failure pattern analysis          | —                                                                                           |
| `GET /health`                            | Health check                              | —                                                                                           |

See `README.md`'s API Endpoints section for the full list, including the Tier 2 `releases`/`comparison`/`performance` routes.

## Jenkins Integration

See [`ci-cd-examples/Jenkinsfile`](../ci-cd-examples/Jenkinsfile) for a complete, working pipeline. The core of it:

```groovy
stage('Upload Test Results') {
    steps {
        script {
            def ciMetadata = """
            {
                "provider": "jenkins",
                "job_name": "${env.JOB_NAME}",
                "build_number": "${env.BUILD_NUMBER}",
                "build_url": "${env.BUILD_URL}",
                "commit_sha": "${env.GIT_COMMIT}",
                "branch": "${env.GIT_BRANCH}",
                "repository": "${env.GIT_URL}"
            }
            """
            sh '''
                find . -name "*.xml" -path "*/target/surefire-reports/*" | while read xmlfile; do
                    curl -X POST http://your-server:5000/api/v1/upload \
                        -F "file=@$xmlfile" \
                        -F 'ci_metadata=''' + ciMetadata + ''''
                done
            '''
        }
    }
}
```

Or use [`ci-cd-examples/upload-test-results.sh`](../ci-cd-examples/upload-test-results.sh) as a post-build step:

```bash
JUNIT_API_URL=http://your-server:5000/api/v1/upload ./ci-cd-examples/upload-test-results.sh ./target/surefire-reports
```

## GitHub Actions Integration

See [`ci-cd-examples/github-actions.yml`](../ci-cd-examples/github-actions.yml) for a complete workflow. The core of it:

```yaml
- name: Upload test results
  if: always()
  run: |
      CI_METADATA=$(cat <<EOF
      {
        "provider": "github_actions",
        "job_name": "${{ github.workflow }}",
        "build_number": "${{ github.run_number }}",
        "build_id": "${{ github.run_id }}",
        "build_url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
        "commit_sha": "${{ github.sha }}",
        "branch": "${{ github.ref_name }}",
        "repository": "${{ github.repository }}"
      }
      EOF
      )
      find . -name "*.xml" -path "*/target/surefire-reports/*" | while read xmlfile; do
        curl -X POST "${{ secrets.JUNIT_API_URL }}/api/v1/upload" \
          -F "file=@$xmlfile" \
          -F "ci_metadata=${CI_METADATA}"
      done
```

## GitLab CI Integration

```yaml
upload_results:
    stage: upload
    script:
        - |
            CI_METADATA="{\"provider\":\"gitlab_ci\",\"job_name\":\"$CI_PROJECT_PATH\",\"build_number\":\"$CI_PIPELINE_ID\",\"commit_sha\":\"$CI_COMMIT_SHA\",\"branch\":\"$CI_COMMIT_REF_NAME\",\"repository\":\"$CI_PROJECT_PATH\",\"build_url\":\"$CI_PIPELINE_URL\"}"
            for xmlfile in target/surefire-reports/*.xml; do
              curl -X POST "$JUNIT_API_URL/api/v1/upload" \
                -F "file=@$xmlfile" \
                -F "ci_metadata=$CI_METADATA"
            done
    when: always
```

## Best Practices

1. **Always upload results, even on failure** — use `if: always()` (GitHub Actions), `when: always` (GitLab CI), or a `post { always { ... } }` block (Jenkins) so failed builds still show up on the dashboard.
2. **Set `job_name` and `build_number`** — without them, uploads can't be merged/grouped by CI build, and re-running a build's suites will each become separate standalone runs.
3. **Handle the duplicate case** — a `200`/`success: true, duplicate: true` response means the exact same XML content was already uploaded; treat it as a skip, not a failure.
4. **Prefer `find ... -name "*.xml"` over hardcoding a single file** — most frameworks produce one XML file per test suite/module.

## Troubleshooting

- **CORS errors**: the frontend origin must be listed in `ALLOWED_ORIGINS` (backend `.env`).
- **413 / upload too large**: raise `MAX_FILE_SIZE` (backend `.env`, bytes) and `client_max_body_size` in `nginx.conf` if fronted by Nginx.
- **400 "Only XML files are allowed"**: the uploaded filename must end in `.xml`.
- **Uploads seem to vanish**: check for the duplicate-skip response — an identical file (byte-for-byte) uploaded twice returns the original `run_id` instead of creating a new run.
