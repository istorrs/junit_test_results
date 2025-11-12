/**
 * Jenkins Script Console: Import Historical JUnit Test Results
 *
 * Run this script from Jenkins Script Console (Manage Jenkins -> Script Console)
 * to import historical test data from GITHUB_CD_GATEWAY_TEST job.
 *
 * Usage:
 * 1. Update the configuration variables below
 * 2. Copy and paste this entire script into Jenkins Script Console
 * 3. Click "Run"
 */

// ===== CONFIGURATION =====
def SOURCE_JOB_NAME = 'GITHUB_CD_GATEWAY_TEST'
def DASHBOARD_API_URL = 'http://localhost/api/v1'  // Change to your dashboard URL
def START_BUILD = 1                                  // First build number to import
def END_BUILD = 0                                    // Last build (0 = latest)
def ARTIFACTS_PATH = 'reports/'                      // Path within build artifacts
def DRY_RUN = false                                  // Set to true for testing
def SKIP_DUPLICATES = true                           // Skip duplicate uploads
// ===========================

println "=== JUnit Historical Data Import ==="
println "Source Job: ${SOURCE_JOB_NAME}"
println "Dashboard API: ${DASHBOARD_API_URL}"
println "Dry Run: ${DRY_RUN}"
println "======================================\n"

// Get the source job
def sourceJob = Jenkins.instance.getItemByFullName(SOURCE_JOB_NAME)
if (!sourceJob) {
    println "ERROR: Job '${SOURCE_JOB_NAME}' not found!"
    return
}

// Determine build range
def lastBuildNumber = sourceJob.getLastBuild()?.number ?: 0
def endBuild = (END_BUILD == 0) ? lastBuildNumber : END_BUILD

if (endBuild > lastBuildNumber) {
    endBuild = lastBuildNumber
}

println "Processing builds from #${START_BUILD} to #${endBuild}"
println "======================================\n"

// Statistics
def stats = [
    totalBuilds: 0,
    processedBuilds: 0,
    totalFiles: 0,
    uploadedFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
    errors: []
]

// Process each build
for (int buildNum = START_BUILD; buildNum <= endBuild; buildNum++) {
    def build = sourceJob.getBuildByNumber(buildNum)

    if (!build) {
        println "⚠ Build #${buildNum} not found, skipping..."
        continue
    }

    stats.totalBuilds++
    stats.processedBuilds++

    println "\n--- Build #${buildNum} ---"
    println "Date: ${build.getTime()}"
    println "Result: ${build.result}"

    // Get artifacts directory
    def artifactsDir = new File(build.artifactsDir, ARTIFACTS_PATH)

    if (!artifactsDir.exists()) {
        println "⚠ No artifacts directory found"
        continue
    }

    // Find XML files
    def xmlFiles = []
    artifactsDir.eachFileRecurse(groovy.io.FileType.FILES) { file ->
        if (file.name.toLowerCase().endsWith('.xml')) {
            xmlFiles << file
        }
    }

    if (xmlFiles.isEmpty()) {
        println "⚠ No XML files found"
        continue
    }

    println "Found ${xmlFiles.size()} XML file(s)"
    stats.totalFiles += xmlFiles.size()

    // Upload each XML file
    xmlFiles.each { xmlFile ->
        println "  Processing: ${xmlFile.name} (${xmlFile.size()} bytes)"

        if (DRY_RUN) {
            println "  [DRY RUN] Would upload"
            stats.uploadedFiles++
        } else {
            try {
                // Build curl command
                def curlCmd = [
                    'curl', '-s', '-w', '\n%{http_code}',
                    '-X', 'POST',
                    '-F', "files=@${xmlFile.absolutePath}",
                    '-F', "ci_metadata={\"build_number\":${buildNum},\"build_time\":\"${build.getTime().format("yyyy-MM-dd'T'HH:mm:ss'Z'")}\",\"job_name\":\"${SOURCE_JOB_NAME}\"}",
                    "${DASHBOARD_API_URL}/upload"
                ]

                def process = curlCmd.execute()
                process.waitFor()
                def output = process.text
                def lines = output.split('\n')
                def httpCode = lines[-1]
                def responseBody = lines.size() > 1 ? lines[0..-2].join('\n') : ''

                if (httpCode == '200' || httpCode == '201') {
                    println "  ✓ Uploaded successfully"
                    stats.uploadedFiles++
                } else if ((httpCode == '409' || responseBody.contains('Duplicate')) && SKIP_DUPLICATES) {
                    println "  ⊘ Skipped (duplicate)"
                    stats.skippedFiles++
                } else {
                    println "  ✗ Upload failed: HTTP ${httpCode}"
                    println "  Response: ${responseBody.take(100)}"
                    stats.failedFiles++
                    stats.errors << [build: buildNum, file: xmlFile.name, error: "HTTP ${httpCode}"]
                }

            } catch (Exception e) {
                println "  ✗ Error: ${e.message}"
                stats.failedFiles++
                stats.errors << [build: buildNum, file: xmlFile.name, error: e.message]
            }
        }
    }

    // Small delay to avoid overwhelming the API
    if (!DRY_RUN && xmlFiles.size() > 0) {
        Thread.sleep(500)
    }
}

// Print summary
println "\n========================================="
println "=== Import Summary ==="
println "========================================="
println "Total Builds Found: ${stats.totalBuilds}"
println "Builds Processed: ${stats.processedBuilds}"
println "Total XML Files: ${stats.totalFiles}"
println "Files Uploaded: ${stats.uploadedFiles}"
println "Files Skipped (duplicates): ${stats.skippedFiles}"
println "Files Failed: ${stats.failedFiles}"

if (stats.errors.size() > 0) {
    println "\n=== Errors (${stats.errors.size()}) ==="
    stats.errors.take(10).each { error ->
        println "Build #${error.build} - ${error.file}: ${error.error}"
    }
    if (stats.errors.size() > 10) {
        println "... and ${stats.errors.size() - 10} more errors"
    }
}

println "========================================="

if (DRY_RUN) {
    println "\n⚠ This was a DRY RUN - no files were actually uploaded"
}

println "\n✓ Import script completed!"

return stats
