/**
 * Stack Trace Analysis Utility
 * Normalizes, fingerprints, and clusters test failures to identify common patterns
 */

class StackTraceAnalyzer {
    /**
     * Normalize a stack trace by removing dynamic data
     * @param {string} stackTrace - Raw stack trace
     * @returns {string} Normalized stack trace
     */
    static normalizeStackTrace(stackTrace) {
        if (!stackTrace) {
            return '';
        }

        let normalized = stackTrace;

        // Remove timestamps (ISO 8601, epoch, durations)
        normalized = normalized.replace(
            /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)?/g,
            '<TIMESTAMP>'
        );
        normalized = normalized.replace(/\b\d{10,13}\b/g, '<TIMESTAMP>');
        normalized = normalized.replace(
            /\b\d+(\.\d+)?\s*(ms|s|sec|seconds?|minutes?)\b/gi,
            '<DURATION>'
        );

        // Remove UUIDs
        normalized = normalized.replace(
            /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
            '<UUID>'
        );

        // Remove hex addresses
        normalized = normalized.replace(/\b0x[0-9a-f]+\b/gi, '<HEX>');

        // Remove MongoDB ObjectIds
        normalized = normalized.replace(/\b[0-9a-f]{24}\b/g, '<OBJID>');

        // Remove numeric IDs (but preserve line numbers in stack traces)
        normalized = normalized.replace(/\bid[=:]\s*\d+/gi, 'id=<ID>');
        normalized = normalized.replace(/\b(user|account|session|request)_\d+\b/gi, '$1_<ID>');

        // Remove port numbers (but not in stack trace line numbers)
        normalized = normalized.replace(/:([\d]{2,5})(?!\))/g, ':<PORT>');

        // Normalize file paths (keep just the filename)
        normalized = normalized.replace(/([a-zA-Z]:)?[/\\].*[/\\]([^/\\:]+\.[a-zA-Z]+)/g, '$2');

        // Remove thread IDs
        normalized = normalized.replace(/\bthread-\d+\b/gi, 'thread-<ID>');

        // Normalize numeric values in error messages (but keep counts that might be meaningful)
        normalized = normalized.replace(
            /\bexpected (\d+|"[^"]*") but (?:got|was) (\d+|"[^"]*")/gi,
            'expected <VALUE> but got <VALUE>'
        );

        return normalized;
    }

    /**
     * Normalize an error message by removing dynamic data
     * @param {string} message - Error message
     * @returns {string} Normalized message
     */
    static normalizeErrorMessage(message) {
        if (!message) {
            return '';
        }

        let normalized = message;

        // Remove specific numeric values but keep structure
        normalized = normalized.replace(/\b\d+(\.\d+)?\b/g, '<NUM>');

        // Remove quoted strings but keep structure
        normalized = normalized.replace(/"[^"]*"/g, '"<STR>"');
        normalized = normalized.replace(/'[^']*'/g, "'<STR>'");

        // Remove timestamps
        normalized = normalized.replace(
            /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?/g,
            '<TIMESTAMP>'
        );

        return normalized;
    }

    /**
     * Extract exception type from stack trace or error message
     * Prioritizes finding the ROOT CAUSE (first exception in Python traces)
     * @param {string} stackTrace - Stack trace
     * @param {string} errorMessage - Error message
     * @returns {string} Exception type
     */
    static extractExceptionType(stackTrace, errorMessage) {
        // Python exceptions (most common in pytest)
        const pythonExceptions = [
            'AssertionError',
            'AttributeError',
            'ImportError',
            'IndexError',
            'KeyError',
            'NameError',
            'TypeError',
            'ValueError',
            'RuntimeError',
            'TimeoutError',
            'ConnectionError',
            'OSError',
            'Exception',
            'StopIteration',
            'ZeroDivisionError',
            'FileNotFoundError',
            'PermissionError',
            'NotImplementedError'
        ];

        // Check stack trace first - look for FIRST exception (root cause)
        if (stackTrace) {
            const lines = stackTrace.split('\n');

            // For Python/pytest: find first "E       ExceptionType" line
            for (const line of lines) {
                if (line.match(/^E\s{3,}/)) {
                    const exceptionLine = line.replace(/^E\s+/, '').trim();
                    // Extract exception type from this line
                    const exMatch = exceptionLine.match(
                        /([a-zA-Z_][\w.]*\.)?([A-Z][\w]*(?:Exception|Error))/
                    );
                    if (exMatch) {
                        return exMatch[2]; // Return just the exception name, not the module path
                    }
                }

                // Also check for "file.py:123: ExceptionType" format (comes before E line)
                const fileMatch = line.match(/^\s*.+?:\d+:\s*([A-Z][\w]*(?:Error|Exception))/);
                if (fileMatch) {
                    return fileMatch[1];
                }
            }

            // Check for standard Python exceptions
            for (const exception of pythonExceptions) {
                if (stackTrace.includes(exception)) {
                    return exception;
                }
            }

            // Try to extract custom exception types
            // Python: libraries.module.CustomException or just CustomException
            const match = stackTrace.match(/([a-zA-Z_][\w.]*\.)?([A-Z][\w]*(?:Exception|Error))/);
            if (match) {
                return match[2]; // Return just the exception name
            }

            // Check for "raise ExceptionType" statements
            const raiseMatch = stackTrace.match(/raise\s+([A-Z][\w]*(?:Exception|Error))/);
            if (raiseMatch) {
                return raiseMatch[1];
            }
        }

        // Check error message
        if (errorMessage) {
            // Extract from error message
            const match = errorMessage.match(/([a-zA-Z_][\w.]*\.)?([A-Z][\w]*(?:Exception|Error))/);
            if (match) {
                return match[2];
            }

            // Check for standard exceptions in message
            for (const exception of pythonExceptions) {
                if (errorMessage.includes(exception)) {
                    return exception;
                }
            }
        }

        return 'UnknownError';
    }

    /**
     * Extract root cause location from stack trace
     * For Python: finds the FIRST file:line where exception was raised
     * For Java: finds the first at X.method() call
     * @param {string} stackTrace - Stack trace
     * @returns {object} {className, methodName, location}
     */
    static extractRootCause(stackTrace) {
        if (!stackTrace) {
            return { className: 'Unknown', methodName: 'unknown', location: 'Unknown.unknown' };
        }

        const lines = stackTrace.split('\n');

        // Python/pytest format: look for first file.py:line_number
        // This appears BEFORE the "E   " lines and indicates where the error originated
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Match: libraries/mqtt_explore.py:859: or just mqtt_explore.py:859:
            const pythonMatch = line.match(/^\s*(.+?\/)?([a-zA-Z0-9_]+\.py):(\d+):/);
            if (pythonMatch) {
                const fileName = pythonMatch[2].replace('.py', '');
                const lineNum = pythonMatch[3];

                // Try to find the function name in nearby lines
                // Look backward for "def function_name"
                let functionName = 'unknown';
                for (let j = Math.max(0, i - 10); j < i; j++) {
                    const funcMatch = lines[j].match(/^\s*def\s+([a-zA-Z0-9_]+)\(/);
                    if (funcMatch) {
                        functionName = funcMatch[1];
                    }
                }

                return {
                    className: fileName,
                    methodName: functionName,
                    location: `${fileName}.${functionName}:${lineNum}`
                };
            }

            // Alternative: look for "in function_name" lines in Python tracebacks
            const inMatch = line.match(/^\s*in\s+([a-zA-Z0-9_]+)$/);
            if (inMatch) {
                const functionName = inMatch[1];
                // Try to find file info nearby
                if (i > 0) {
                    const prevLine = lines[i - 1];
                    const fileMatch = prevLine.match(/File\s+"(.+?)\/([^/]+\.py)",\s+line\s+(\d+)/);
                    if (fileMatch) {
                        const fileName = fileMatch[2].replace('.py', '');
                        const lineNum = fileMatch[3];
                        return {
                            className: fileName,
                            methodName: functionName,
                            location: `${fileName}.${functionName}:${lineNum}`
                        };
                    }
                }
            }
        }

        // Java format: at package.Class.method(File.java:line)
        const javaMatch = stackTrace.match(/at\s+([a-zA-Z0-9_.]+)\.([a-zA-Z0-9_<>]+)\([^)]+\)/);
        if (javaMatch) {
            const fullClass = javaMatch[1];
            const method = javaMatch[2];
            const parts = fullClass.split('.');
            const className = parts[parts.length - 1];

            return {
                className,
                methodName: method,
                location: `${className}.${method}`
            };
        }

        return { className: 'Unknown', methodName: 'unknown', location: 'Unknown.unknown' };
    }

    /**
     * Create a fingerprint for a failure
     * @param {object} testCase - Test case with failure info
     * @returns {string} Fingerprint hash
     */
    static createFingerprint(testCase) {
        const exceptionType = this.extractExceptionType(
            testCase.stack_trace,
            testCase.error_message
        );
        const rootCause = this.extractRootCause(testCase.stack_trace);
        const normalizedMessage = this.normalizeErrorMessage(testCase.error_message || '');
        const normalizedTrace = this.normalizeStackTrace(testCase.stack_trace || '');

        // Take first 5 lines of normalized stack trace for signature
        const traceLines = normalizedTrace.split('\n').slice(0, 5).join('\n');

        const signature = `${exceptionType}::${rootCause.location}::${normalizedMessage}::${traceLines}`;

        // Create simple hash
        return this.simpleHash(signature);
    }

    /**
     * Simple string hash function
     */
    static simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Calculate similarity between two strings using Levenshtein distance
     * @param {string} str1
     * @param {string} str2
     * @returns {number} Similarity score 0-1
     */
    static calculateSimilarity(str1, str2) {
        if (str1 === str2) {
            return 1.0;
        }

        const len1 = str1.length;
        const len2 = str2.length;

        if (len1 === 0) {
            return len2 === 0 ? 1.0 : 0.0;
        }
        if (len2 === 0) {
            return 0.0;
        }

        // Use a simpler metric for performance: character overlap
        const set1 = new Set(str1.toLowerCase().split(''));
        const set2 = new Set(str2.toLowerCase().split(''));

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return intersection.size / union.size;
    }

    /**
     * Categorize failure type
     * @param {string} exceptionType
     * @param {string} errorMessage
     * @param {string} stackTrace
     * @returns {string} Category
     */
    static categorizeFailure(exceptionType, errorMessage, stackTrace) {
        const msgLower = (errorMessage || '').toLowerCase();
        const traceLower = (stackTrace || '').toLowerCase();

        // Assertion failures
        if (
            exceptionType === 'AssertionError' ||
            msgLower.includes('expected') ||
            msgLower.includes('assert')
        ) {
            return 'Assertion Failure';
        }

        // Null pointer errors
        if (exceptionType === 'NullPointerException' || msgLower.includes('null')) {
            return 'Null Pointer Error';
        }

        // Timeout errors
        if (
            exceptionType === 'TimeoutException' ||
            exceptionType === 'TimeoutError' ||
            exceptionType.toLowerCase().includes('timeout') ||
            msgLower.includes('timeout') ||
            msgLower.includes('timed out') ||
            traceLower.includes('timeout')
        ) {
            return 'Timeout Error';
        }

        // Connection/IO errors
        if (
            exceptionType === 'IOException' ||
            msgLower.includes('connection') ||
            msgLower.includes('refused') ||
            msgLower.includes('network')
        ) {
            return 'Connection Error';
        }

        // Setup/Teardown errors
        if (
            traceLower.includes('@before') ||
            traceLower.includes('@after') ||
            traceLower.includes('setup') ||
            traceLower.includes('teardown')
        ) {
            return 'Setup/Teardown Error';
        }

        // Illegal state/argument
        if (
            exceptionType === 'IllegalStateException' ||
            exceptionType === 'IllegalArgumentException'
        ) {
            return 'Invalid State/Argument';
        }

        return 'Other Error';
    }

    /**
     * Cluster test failures by similarity
     * @param {Array} failedTests - Array of failed test cases
     * @returns {Array} Array of pattern clusters
     */
    static clusterFailures(failedTests) {
        if (!failedTests || failedTests.length === 0) {
            return [];
        }

        const clusters = [];

        for (const test of failedTests) {
            const fingerprint = this.createFingerprint(test);
            const exceptionType = this.extractExceptionType(
                test.stack_trace,
                test.error_message
            );
            const rootCause = this.extractRootCause(test.stack_trace);
            const category = this.categorizeFailure(
                exceptionType,
                test.error_message,
                test.stack_trace
            );
            const normalizedMessage = this.normalizeErrorMessage(test.error_message || '');

            // Find existing cluster with same fingerprint or high similarity
            let matchedCluster = clusters.find(cluster => cluster.fingerprint === fingerprint);

            if (!matchedCluster) {
                // Try to find similar cluster (80% similarity threshold)
                matchedCluster = clusters.find(cluster => {
                    const similarity = this.calculateSimilarity(
                        cluster.normalizedMessage,
                        normalizedMessage
                    );
                    return (
                        similarity >= 0.8 &&
                        cluster.exceptionType === exceptionType &&
                        cluster.category === category
                    );
                });
            }

            if (matchedCluster) {
                // Add to existing cluster
                matchedCluster.tests.push(test);
                matchedCluster.count++;
            } else {
                // Create new cluster
                clusters.push({
                    fingerprint,
                    exceptionType,
                    rootCause: rootCause.location,
                    category,
                    normalizedMessage,
                    exampleMessage: test.error_message || 'No error message',
                    exampleStackTrace: test.stack_trace || '',
                    count: 1,
                    tests: [test]
                });
            }
        }

        // Sort clusters by count (most common failures first)
        clusters.sort((a, b) => b.count - a.count);

        return clusters;
    }

    /**
     * Analyze failures for a test run
     * @param {Array} testCases - All test cases
     * @returns {object} Analysis results
     */
    static analyzeFailures(testCases) {
        const failedTests = testCases.filter(
            test => test.status === 'failed' || test.status === 'error'
        );

        if (failedTests.length === 0) {
            return {
                totalFailures: 0,
                patterns: [],
                categoryCounts: {}
            };
        }

        const patterns = this.clusterFailures(failedTests);

        // Count by category
        const categoryCounts = {};
        for (const pattern of patterns) {
            categoryCounts[pattern.category] =
                (categoryCounts[pattern.category] || 0) + pattern.count;
        }

        return {
            totalFailures: failedTests.length,
            patterns: patterns.map(pattern => ({
                id: pattern.fingerprint,
                category: pattern.category,
                exceptionType: pattern.exceptionType,
                rootCause: pattern.rootCause,
                message: pattern.normalizedMessage,
                exampleMessage: pattern.exampleMessage,
                exampleStackTrace: pattern.exampleStackTrace,
                count: pattern.count,
                affectedTests: pattern.tests.map(t => ({
                    id: t._id,
                    name: t.name,
                    class_name: t.class_name,
                    time: t.time
                }))
            })),
            categoryCounts
        };
    }
}

module.exports = StackTraceAnalyzer;
