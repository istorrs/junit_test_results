#!/usr/bin/env groovy

/**
 * Jenkins Pipeline: Import Historical JUnit Test Results
 *
 * This pipeline imports historical JUnit XML files from the GITHUB_CD_GATEWAY_TEST job
 * and uploads them to the JUnit Test Results Dashboard API.
 *
 * Configuration:
 * - SOURCE_JOB: The Jenkins job to import from
 * - DASHBOARD_API_URL: The URL of your dashboard API
 * - START_BUILD: First build number to process (default: 1)
 * - END_BUILD: Last build number to process (default: latest, use high number like 10000)
 * - ARTIFACTS_PATH: Path to artifacts within the build (default: reports/)
 *
 * Note: This script uses the Copy Artifact plugin to retrieve historical build artifacts.
 * Requires: Copy Artifact Plugin (copyArtifacts step)
 */

pipeline {
    agent any

    parameters {
        string(
            name: 'SOURCE_JOB',
            defaultValue: 'GITHUB_CD_GATEWAY_TEST',
            description: 'Jenkins job name to import historical data from'
        )
        string(
            name: 'DASHBOARD_API_URL',
            defaultValue: 'http://klingon/api/v1',
            description: 'JUnit Dashboard API URL (e.g., http://localhost/api/v1 or http://your-server/api/v1)'
        )
        string(
            name: 'START_BUILD',
            defaultValue: '1',
            description: 'First build number to process'
        )
        string(
            name: 'END_BUILD',
            defaultValue: '10000',
            description: 'Last build number to process (use high number like 10000 to process all)'
        )
        string(
            name: 'ARTIFACTS_PATH',
            defaultValue: 'reports/',
            description: 'Path to artifacts directory within each build'
        )
        booleanParam(
            name: 'DRY_RUN',
            defaultValue: false,
            description: 'Dry run mode - show what would be imported without actually uploading'
        )
        booleanParam(
            name: 'SKIP_DUPLICATES',
            defaultValue: true,
            description: 'Skip uploads if the dashboard returns duplicate error'
        )
    }

    environment {
        IMPORT_STATS = "${WORKSPACE}/import-stats.json"
    }

    stages {
        stage('Initialize') {
            steps {
                script {
                    echo "=== JUnit Historical Data Import ==="
                    echo "Source Job: ${params.SOURCE_JOB}"
                    echo "Dashboard API: ${params.DASHBOARD_API_URL}"
                    echo "Build Range: ${params.START_BUILD} to ${params.END_BUILD ?: 'latest'}"
                    echo "Artifacts Path: ${params.ARTIFACTS_PATH}"
                    echo "Dry Run: ${params.DRY_RUN}"
                    echo "Skip Duplicates: ${params.SKIP_DUPLICATES}"
                    echo "======================================="

                    // Initialize statistics
                    env.TOTAL_BUILDS = "0"
                    env.PROCESSED_BUILDS = "0"
                    env.TOTAL_FILES = "0"
                    env.UPLOADED_FILES = "0"
                    env.SKIPPED_FILES = "0"
                    env.FAILED_FILES = "0"
                }
            }
        }

        stage('Validate Configuration') {
            steps {
                script {
                    // Test API connectivity
                    echo "Testing API connectivity..."
                    def healthCheck = sh(
                        script: "curl -s -o /dev/null -w '%{http_code}' ${params.DASHBOARD_API_URL.replace('/api/v1', '')}/health",
                        returnStdout: true
                    ).trim()

                    if (healthCheck != "200") {
                        error("Dashboard API health check failed! HTTP ${healthCheck}")
                    }
                    echo "✓ API is reachable"

                    // Verify job exists and get build range using Jenkins API
                    def buildRangeInfo = getBuildRangeInfo(params.SOURCE_JOB, params.START_BUILD, params.END_BUILD)
                    
                    if (!buildRangeInfo.success) {
                        error(buildRangeInfo.error)
                    }
                    
                    echo "✓ Source job '${params.SOURCE_JOB}' found"
                    echo "Build range: ${buildRangeInfo.startBuild} to ${buildRangeInfo.endBuild}"
                    
                    env.START_BUILD_NUM = buildRangeInfo.startBuild.toString()
                    env.END_BUILD_NUM = buildRangeInfo.endBuild.toString()
                }
            }
        }

        stage('Process Historical Builds') {
            steps {
                script {
                    def startBuild = env.START_BUILD_NUM.toInteger()
                    def endBuild = env.END_BUILD_NUM.toInteger()

                    echo "Processing builds from #${startBuild} to #${endBuild}"

                    def processedCount = 0
                    def uploadedCount = 0
                    def skippedCount = 0
                    def failedCount = 0
                    def totalFilesCount = 0
                    def failedUploads = []  // Track all failed uploads with details

                    // Iterate through builds
                    for (int buildNumber = startBuild; buildNumber <= endBuild; buildNumber++) {
                        // Get build info using Jenkins API
                        def buildInfo = getBuildInfo(params.SOURCE_JOB, buildNumber, params.ARTIFACTS_PATH)

                        if (!buildInfo.exists) {
                            // Build doesn't exist, skip silently (may have reached end of actual builds)
                            continue
                        }

                        if (!buildInfo.hasArtifacts) {
                            echo "⚠ Build #${buildNumber}: No artifacts directory"
                            continue
                        }

                        processedCount++

                        echo "\n--- Processing Build #${buildNumber} ---"
                        echo "Build Date: ${buildInfo.timestamp}"
                        echo "Build Result: ${buildInfo.result}"

                        // Create temp directory for this build's artifacts
                        def tempDir = "${WORKSPACE}/temp_build_${buildNumber}"
                        sh "mkdir -p '${tempDir}'"

                        try {
                            // Copy artifacts from source build using copyArtifacts step
                            copyArtifacts(
                                projectName: params.SOURCE_JOB,
                                selector: specific("${buildNumber}"),
                                filter: "${params.ARTIFACTS_PATH}**/*.xml",
                                target: tempDir,
                                flatten: false,
                                optional: false
                            )

                            // Find all XML files in the copied artifacts
                            def xmlFilesList = sh(
                                script: "find '${tempDir}' -type f -name '*.xml' 2>/dev/null || true",
                                returnStdout: true
                            ).trim()

                            if (!xmlFilesList) {
                                echo "⚠ No XML files found in artifacts"
                                continue
                            }

                            def xmlFiles = xmlFilesList.split('\n')
                            echo "Found ${xmlFiles.size()} XML file(s)"
                            totalFilesCount += xmlFiles.size()

                            // Upload each XML file
                            for (xmlFilePath in xmlFiles) {
                                def fileName = sh(script: "basename '${xmlFilePath}'", returnStdout: true).trim()
                                echo "  Processing: ${fileName}"

                                if (params.DRY_RUN) {
                                    echo "  [DRY RUN] Would upload: ${xmlFilePath}"
                                    uploadedCount++
                                } else {
                                    def uploadResult = uploadJUnitXMLFile(
                                        xmlFilePath,
                                        params.DASHBOARD_API_URL,
                                        buildNumber,
                                        buildInfo.timestamp,
                                        params.SOURCE_JOB,
                                        params.SKIP_DUPLICATES
                                    )

                                    if (uploadResult.success) {
                                        echo "  ✓ Uploaded successfully"
                                        uploadedCount++
                                    } else if (uploadResult.duplicate) {
                                        echo "  ⊘ Skipped (duplicate)"
                                        skippedCount++
                                    } else {
                                        echo "  ✗ Upload failed: ${uploadResult.error}"
                                        failedCount++

                                        // Fetch backend logs for this failure
                                        def backendLogs = fetchBackendLogs(params.DASHBOARD_API_URL, 2)

                                        // Record failure details
                                        failedUploads.add([
                                            buildNumber: buildNumber,
                                            fileName: fileName,
                                            filePath: xmlFilePath,
                                            error: uploadResult.error,
                                            httpCode: uploadResult.httpCode ?: 'unknown',
                                            responseBody: uploadResult.responseBody ?: 'no response',
                                            backendLogs: backendLogs
                                        ])
                                    }
                                }
                            }
                        } catch (Exception e) {
                            echo "⚠ Failed to copy artifacts from build #${buildNumber}: ${e.message}"
                        } finally {
                            // Clean up temp directory
                            sh "rm -rf '${tempDir}'"
                        }
                    }

                    // Update final statistics
                    env.TOTAL_BUILDS = (endBuild - startBuild + 1).toString()
                    env.PROCESSED_BUILDS = processedCount.toString()
                    env.TOTAL_FILES = totalFilesCount.toString()
                    env.UPLOADED_FILES = uploadedCount.toString()
                    env.SKIPPED_FILES = skippedCount.toString()
                    env.FAILED_FILES = failedCount.toString()

                    // Store failed uploads for reporting in Summary stage
                    env.FAILED_UPLOADS_JSON = groovy.json.JsonOutput.toJson(failedUploads)
                }
            }
        }

        stage('Summary') {
            steps {
                script {
                    echo "\n========================================="
                    echo "=== Import Summary ==="
                    echo "========================================="
                    echo "Total Builds Found: ${env.TOTAL_BUILDS}"
                    echo "Builds Processed: ${env.PROCESSED_BUILDS}"
                    echo "Total XML Files: ${env.TOTAL_FILES}"
                    echo "Files Uploaded: ${env.UPLOADED_FILES}"
                    echo "Files Skipped (duplicates): ${env.SKIPPED_FILES}"
                    echo "Files Failed: ${env.FAILED_FILES}"
                    echo "========================================="

                    if (params.DRY_RUN) {
                        echo "\n⚠ This was a DRY RUN - no files were actually uploaded"
                    }

                    // Parse failed uploads from JSON
                    def failedUploads = []
                    if (env.FAILED_UPLOADS_JSON) {
                        try {
                            failedUploads = new groovy.json.JsonSlurper().parseText(env.FAILED_UPLOADS_JSON)
                        } catch (Exception e) {
                            echo "Warning: Could not parse failed uploads JSON: ${e.message}"
                        }
                    }

                    // Display detailed failure information
                    if (failedUploads.size() > 0) {
                        echo "\n========================================="
                        echo "=== FAILED UPLOADS (${failedUploads.size()}) ==="
                        echo "========================================="
                        failedUploads.eachWithIndex { failure, index ->
                            echo "\nFailure #${index + 1}:"
                            echo "  Build: #${failure.buildNumber}"
                            echo "  File: ${failure.fileName}"
                            echo "  Path: ${failure.filePath}"
                            echo "  HTTP Code: ${failure.httpCode}"
                            echo "  Error: ${failure.error}"
                            echo "  Response: ${failure.responseBody?.take(200)}"

                            // Display backend logs if available
                            if (failure.backendLogs && failure.backendLogs.size() > 0) {
                                echo "  Backend Logs (${failure.backendLogs.size()} entries):"
                                failure.backendLogs.each { log ->
                                    echo "    [${log.timestamp}] ${log.level?.toUpperCase()}: ${log.message}"
                                }
                            }
                        }
                        echo "========================================="
                    }

                    // Write statistics to file
                    def stats = [
                        timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                        sourceJob: params.SOURCE_JOB,
                        buildRange: [
                            start: params.START_BUILD.toInteger(),
                            end: params.END_BUILD ?: 'latest'
                        ],
                        totalBuilds: env.TOTAL_BUILDS.toInteger(),
                        processedBuilds: env.PROCESSED_BUILDS.toInteger(),
                        totalFiles: env.TOTAL_FILES.toInteger(),
                        uploadedFiles: env.UPLOADED_FILES.toInteger(),
                        skippedFiles: env.SKIPPED_FILES.toInteger(),
                        failedFiles: env.FAILED_FILES.toInteger(),
                        dryRun: params.DRY_RUN,
                        failures: failedUploads
                    ]

                    writeJSON file: env.IMPORT_STATS, json: stats
                    archiveArtifacts artifacts: 'import-stats.json', fingerprint: true

                    // Fail the pipeline if there were any upload failures (unless dry run)
                    if (env.FAILED_FILES.toInteger() > 0 && !params.DRY_RUN) {
                        error("Pipeline failed: ${env.FAILED_FILES} file(s) failed to upload. See detailed failures above.")
                    }
                }
            }
        }
    }

    post {
        success {
            echo "\n✓ Historical data import completed successfully!"
        }
        failure {
            echo "\n✗ Historical data import failed!"
        }
        always {
            echo "\nImport statistics saved to: ${env.IMPORT_STATS}"
        }
    }
}
// === HELPER FUNCTIONS ===

/**
 * Get build range information without storing non-serializable objects
 */
@NonCPS
def getBuildRangeInfo(String jobName, String startBuildParam, String endBuildParam) {
    try {
        def sourceJob = Jenkins.instance.getItemByFullName(jobName)
        if (!sourceJob) {
            return [success: false, error: "Source job '${jobName}' not found!"]
        }
        def lastBuild = sourceJob.getLastBuild()
        if (!lastBuild) {
            return [success: false, error: "No builds found in job '${jobName}'"]
        }
        def startBuild = startBuildParam.toInteger()
        def endBuild = endBuildParam ? endBuildParam.toInteger() : lastBuild.number
        return [success: true, startBuild: startBuild, endBuild: endBuild]
    } catch (Exception e) {
        return [success: false, error: "Error getting build range: ${e.message}"]
    }
}

/**
 * Get build info without storing non-serializable objects
 */
@NonCPS
def getBuildInfo(String jobName, int buildNumber, String artifactsPath) {
    try {
        def sourceJob = Jenkins.instance.getItemByFullName(jobName)
        if (!sourceJob) return [exists: false]
        def build = sourceJob.getBuildByNumber(buildNumber)
        if (!build) return [exists: false]

        def artifactsDir = new File(build.getArtifactsDir(), artifactsPath)
        return [
            exists: true,
            timestamp: build.getTime().format("yyyy-MM-dd'T'HH:mm:ss'Z'"),
            result: build.result?.toString() ?: 'UNKNOWN',
            hasArtifacts: artifactsDir.exists() && artifactsDir.isDirectory()
        ]
    } catch (Exception e) {
        return [exists: false]
    }
}

/**
 * Upload a JUnit XML file to the dashboard API using file path
 */
def uploadJUnitXMLFile(String xmlFilePath, String apiUrl, int buildNumber, String buildTime, String jobName, boolean skipDuplicates) {
    try {
        // Prepare multipart form data
        // Create properly escaped JSON for ci_metadata
        def ciMetadataJson = groovy.json.JsonOutput.toJson([
            build_number: buildNumber,
            build_time: buildTime,
            job_name: jobName
        ])

        // Use single quotes to avoid shell interpretation of the JSON
        def response = sh(
            script: """\
                curl -s -w '\\n%{http_code}' -X POST \\
                    -F 'file=@${xmlFilePath}' \\
                    -F 'ci_metadata=${ciMetadataJson}' \\
                    ${apiUrl}/upload
            """,
            returnStdout: true
        ).trim()

        def lines = response.split('\n')
        def httpCode = lines[-1]
        def body = lines.size() > 1 ? lines[0..-2].join('\n') : ''

        if (httpCode == '200' || httpCode == '201') {
            return [success: true, duplicate: false, httpCode: httpCode]
        } else if (httpCode == '409' || body.contains('Duplicate')) {
            if (skipDuplicates) {
                return [success: false, duplicate: true, httpCode: httpCode, responseBody: body]
            } else {
                return [success: false, duplicate: true, error: 'Duplicate content', httpCode: httpCode, responseBody: body]
            }
        } else {
            return [
                success: false,
                duplicate: false,
                error: "HTTP ${httpCode}: ${body.take(200)}",
                httpCode: httpCode,
                responseBody: body
            ]
        }
    } catch (Exception e) {
        return [
            success: false,
            duplicate: false,
            error: e.message,
            httpCode: 'exception',
            responseBody: e.toString()
        ]
    }
}

/**
 * Fetch recent backend error logs to help diagnose upload failures
 */
def fetchBackendLogs(String apiUrl, int minutes = 2) {
    try {
        def logsResponse = sh(
            script: """
                curl -s -X GET "${apiUrl}/logs/errors?minutes=${minutes}&limit=10"
            """,
            returnStdout: true
        ).trim()

        def logsJson = new groovy.json.JsonSlurper().parseText(logsResponse)

        if (logsJson.success && logsJson.data?.errors) {
            // Convert LazyMap to serializable ArrayList of Maps
            def serializedErrors = []
            logsJson.data.errors.each { error ->
                serializedErrors.add([
                    timestamp: error.timestamp?.toString(),
                    level: error.level?.toString(),
                    message: error.message?.toString(),
                    url: error.url?.toString(),
                    method: error.method?.toString()
                ])
            }
            return serializedErrors
        } else {
            return []
        }
    } catch (Exception e) {
        // If we can't fetch logs, return empty array (don't fail the pipeline for this)
        return []
    }
}
