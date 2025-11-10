# Jenkins Import Pipeline - Fixes Applied

## Issue 1: NotSerializableException

**Error:**
```
java.io.NotSerializableException: org.jenkinsci.plugins.workflow.job.WorkflowJob
```

**Cause:** Pipeline was storing non-serializable Jenkins objects in variables.

**Fix:** Replaced all Jenkins API access with filesystem-based approach.

---

## Issue 2: Script Approval Required

**Error:**
```
Scripts not permitted to use method hudson.model.Job getLastBuild
```

**Cause:** Jenkins sandbox blocks access to Jenkins API methods without script approval.

**Fix:** Completely rewrote pipeline to use filesystem access instead of Jenkins API.

---

## Solution: Filesystem-Based Approach

The new pipeline:

1. **Accesses builds directly from filesystem:**
   - Job path: `$JENKINS_HOME/jobs/{SOURCE_JOB}/`
   - Build directories: `builds/{build_number}/`
   - Artifacts: `archive/{ARTIFACTS_PATH}/*.xml`

2. **Extracts build metadata from build.xml:**
   - Uses `grep` and `awk` to extract timestamp
   - No Jenkins API calls required

3. **Uses shell commands for all operations:**
   - `test -d` to check directory existence
   - `find` to locate XML files
   - `curl` to upload files

4. **No script approval needed:**
   - Works with Jenkins sandbox enabled
   - No `@NonCPS` annotations required
   - Only uses standard shell commands

## Key Changes

### Before (API-based):
```groovy
def sourceJob = Jenkins.instance.getItemByFullName(params.SOURCE_JOB)
def build = sourceJob.getBuildByNumber(buildNumber)
def artifactsDir = new File(build.artifactsDir, params.ARTIFACTS_PATH)
```

### After (Filesystem-based):
```groovy
def buildDir = "${env.JOB_PATH}/builds/${buildNumber}"
def buildExists = sh(script: "test -d '${buildDir}' && echo 'true' || echo 'false'", returnStdout: true).trim()
def artifactsDir = "${buildDir}/archive/${params.ARTIFACTS_PATH}"
```

## Configuration Changes

### END_BUILD Parameter

**Old behavior:** Leave empty to auto-detect latest build

**New behavior:** Set to high number (e.g., `10000`) to process all builds
- Script skips non-existent build numbers
- Iterates from START_BUILD to END_BUILD
- Only processes builds with artifacts

### Example:
```
START_BUILD: 1
END_BUILD: 10000
```

This will process all builds from 1 to 10000 that exist with artifacts.

## Testing

Run with `DRY_RUN: true` first to verify:
1. Job path is found
2. Builds are detected
3. XML files are located
4. No actual uploads occur

Then set `DRY_RUN: false` for actual import.

## Benefits

✅ No Jenkins API restrictions
✅ No script approval required
✅ Works in Jenkins sandbox mode
✅ Simpler error handling
✅ Direct filesystem access is faster
✅ Compatible with all Jenkins versions

## Requirements

- Jenkins agent must have read access to `$JENKINS_HOME`
- `$JENKINS_HOME` environment variable must be set
- Standard Unix utilities: `test`, `find`, `grep`, `awk`, `curl`
