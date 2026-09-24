# Test Results Dashboard API Integration Guide

## Overview

The Test Results Dashboard accepts JUnit XML and Allure results through a curl-friendly REST API. This guide covers automated uploads from Jenkins, GitHub Actions, GitLab CI, and other build systems, plus querying the stored results.

For tested, working examples, see [`ci-cd-examples/`](../ci-cd-examples/) — `Jenkinsfile`, `github-actions.yml`, and `upload-test-results.sh`. The snippets below explain the same contract those scripts use.

## Uploading Test Results

### Upload a single file

**Endpoint:** `POST /api/v1/upload`

This is a `multipart/form-data` request, not JSON. Send either one JUnit XML file or one ZIP containing the raw `allure-results` files.

| Field             | Required | Description                                                                       |
| ----------------- | -------- | --------------------------------------------------------------------------------- |
| `file`            | yes      | A JUnit `.xml` file or Allure `.zip` archive                                      |
| `format`          | no       | `junit` or `allure`; inferred from `.xml` or `.zip` when omitted                  |
| `ci_metadata`     | no       | JSON string with CI context — see [CI Metadata Fields](#ci-metadata-fields) below |
| `release_tag`     | no       | Free-form release/tag label for this run                                          |
| `release_version` | no       | Free-form release/version label for this run                                      |

#### JUnit XML

```bash
curl -X POST http://your-server:5000/api/v1/upload \
  -F "file=@target/surefire-reports/TEST-results.xml" \
  -F 'ci_metadata={"provider":"jenkins","job_name":"my-app","build_number":"42","build_url":"https://jenkins.example.com/job/my-app/42/"}'
```

#### Allure results

Upload the raw `allure-results` directory, not the generated HTML `allure-report` directory. The ZIP may contain the files at its root or beneath an `allure-results/` directory.

```text
allure-results/
├── <uuid>-result.json       # test status, labels, parameters, links, and nested steps
├── <uuid>-container.json    # setup/teardown fixtures and child test UUIDs
├── <uuid>-attachment.txt    # log/stderr or other attachment payload
├── executor.json            # optional run metadata
├── environment.properties   # optional environment metadata
└── categories.json          # optional failure categories
```

```bash
(cd path/to/allure-results && zip -r ../allure-results.zip .)

curl --fail-with-body http://your-server:5000/api/v1/upload \
  -F "file=@path/to/allure-results.zip" \
  -F "format=allure" \
  -F 'ci_metadata={"provider":"github_actions","job_name":"my-app","build_number":"42","build_time":"2026-09-24T03:17:00Z"}'
```

The importer preserves nested steps, step/test attachments, setup and teardown fixtures, descriptions, parameters, links, Allure labels, executor data, environment properties, and categories. Allure `broken` maps to dashboard status `error`; `unknown` and missing fixture outcomes remain `unknown` and are not presented as errors. Referenced attachment files must be included in the ZIP to be downloadable. Archives must contain at least one `*-result.json` file.

Default limits are 50 MiB compressed (`MAX_FILE_SIZE`), 10,000 archive entries, 250 MiB expanded, and 15 MiB per entry. A repeated byte-identical archive is treated as a duplicate.

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

#### Idempotent retry response (201)

If the exact same XML or ZIP content is uploaded again in the same CI/release scope, it is skipped rather than creating a duplicate run. The endpoint keeps the normal success envelope and returns the existing IDs and statistics:

```json
{
    "success": true,
    "data": {
        "run_id": "6710a1b2c3d4e5f6a7b8c9d0",
        "file_upload_id": "6710a1b2c3d4e5f6a7b8c9d1",
        "stats": { "total_tests": 42, "passed": 40, "failed": 1, "errors": 0, "skipped": 1 }
    }
}
```

#### Error responses

```json
{ "success": false, "error": "No file uploaded" }
```

```json
{ "success": false, "error": "Only JUnit XML and Allure ZIP files are allowed" }
```

### Upload multiple files at once

**Endpoint:** `POST /api/v1/upload/batch`

The file field is `files` (repeated, up to `MAX_FILES`, default 20). A batch may contain JUnit `.xml` files, Allure `.zip` archives, or both; the format is inferred per file from its extension. `ci_metadata`/`release_tag`/`release_version` apply to every file in the batch.

```bash
curl -X POST http://your-server:5000/api/v1/upload/batch \
  -F "files=@target/surefire-reports/TEST-suite1.xml" \
  -F "files=@allure-results.zip" \
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

| Endpoint                                 | Purpose                                   | Common query params                                                                          |
| ---------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `GET /api/v1/runs`                       | List test runs, paginated                 | `page`, `limit`, `job_name`, `branch`, `from_date`, `to_date`                                |
| `GET /api/v1/runs/projects`              | List distinct `job_name` values           | —                                                                                            |
| `GET /api/v1/runs/:id`                   | Get one test run                          | —                                                                                            |
| `GET /api/v1/cases`                      | List test cases, paginated and filterable | `page`, `limit`, `run_id`, `status`, `search`, Allure label filters, `sort_by`, `sort_order` |
| `GET /api/v1/cases/:id`                  | Get one test case                         | —                                                                                            |
| `GET /api/v1/cases/:id/history`          | Execution history for a test case         | —                                                                                            |
| `GET /api/v1/attachments/:id`            | Stream an Allure attachment               | —                                                                                            |
| `GET /api/v1/stats/overview`             | Overall pass/fail statistics              | `run_id`, `job_name`, `from_date`, `to_date`                                                 |
| `GET /api/v1/analytics/flaky-tests`      | Flaky tests with metrics                  | —                                                                                            |
| `GET /api/v1/analytics/failure-patterns` | Grouped failure pattern analysis          | —                                                                                            |
| `GET /health`                            | Health check                              | —                                                                                            |

See `README.md`'s API Endpoints section for the full list, including the Tier 2 `releases`/`comparison`/`performance` routes.

The case list intentionally omits large Allure detail trees. Request `GET /api/v1/cases/:id` to receive `steps`, `fixtures`, `attachments`, `labels`, `parameters`, `links`, and run-level Allure metadata. Each stored attachment has an `attachment_id`; fetch its original bytes with `GET /api/v1/attachments/:attachment_id`.

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

For Allure, generate and zip the raw results before uploading:

```yaml
- name: Upload Allure results
  if: always()
  env:
      RESULTS_API_URL: ${{ secrets.JUNIT_API_URL }}
  run: |
      (cd allure-results && zip -r ../allure-results.zip .)
      curl --fail-with-body "$RESULTS_API_URL/api/v1/upload" \
        -F "file=@allure-results.zip" \
        -F "format=allure" \
        -F 'ci_metadata={"provider":"github_actions","job_name":"${{ github.workflow }}","build_number":"${{ github.run_number }}","build_id":"${{ github.run_id }}","commit_sha":"${{ github.sha }}","branch":"${{ github.ref_name }}","repository":"${{ github.repository }}"}'
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
3. **Retry uploads safely** — a repeated byte-identical XML or ZIP returns the existing run rather than duplicating its cases.
4. **Prefer `find ... -name "*.xml"` over hardcoding a single file** — most frameworks produce one XML file per test suite/module.
5. **Archive raw Allure results** — upload `allure-results`, including its attachment payloads; do not upload the generated HTML report.

## Troubleshooting

- **CORS errors**: the frontend origin must be listed in `ALLOWED_ORIGINS` (backend `.env`).
- **413 / upload too large**: raise `MAX_FILE_SIZE` (backend `.env`, bytes) and `client_max_body_size` in `nginx.conf` if fronted by Nginx.
- **400 file-type error**: JUnit filenames must end in `.xml`; Allure archives must end in `.zip`.
- **Allure archive contains no result JSON files**: zip the contents of `allure-results`, not `allure-report`.
- **Attachment link is unavailable**: ensure the referenced `*-attachment.*` payload was present when the ZIP was created.
- **A retry returns the same run**: this is expected—an identical file uploaded in the same CI/release scope returns the original `run_id`.
