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
     * @param {string} stackTrace - Stack trace
     * @param {string} errorMessage - Error message
     * @returns {string} Exception type
     */
    static extractExceptionType(stackTrace, errorMessage) {
        // Common exception patterns (Java, Python, JavaScript)
        const commonExceptions = [
            // Java
            'NullPointerException',
            'AssertionError',
            'IllegalArgumentException',
            'IllegalStateException',
            'IOException',
            'SQLException',
            'RuntimeException',
            'TimeoutException',
            'InterruptedException',
            'ConcurrentModificationException',
            // Python
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
            'Exception'
        ];

        // Check stack trace first
        if (stackTrace) {
            for (const exception of commonExceptions) {
                if (stackTrace.includes(exception)) {
                    return exception;
                }
            }
            // Try to extract any exception type (handles custom exceptions)
            // Python: libraries.module.CustomException
            // Java: com.package.CustomException
            const match = stackTrace.match(
                /(?:^|\s)(?:[a-zA-Z_][\w.]*\.)?([A-Z][\w]*(?:Exception|Error))/
            );
            if (match) {
                return match[1];
            }
            // Also try matching at start of lines for "Failed: ExceptionType"
            const failedMatch = stackTrace.match(
                /(?:^|\n)Failed:\s*([A-Z][\w]*(?:Exception|Error))/
            );
            if (failedMatch) {
                return failedMatch[1];
            }
        }

        // Check error message
        if (errorMessage) {
            for (const exception of commonExceptions) {
                if (errorMessage.includes(exception)) {
                    return exception;
                }
            }
            // Try to extract from error message
            const match = errorMessage.match(
                /(?:^|\s)(?:[a-zA-Z_][\w.]*\.)?([A-Z][\w]*(?:Exception|Error))/
            );
            if (match) {
                return match[1];
            }
        }

        return 'UnknownError';
    }

    /**
     * Extract root cause location (class and method) from stack trace
     * @param {string} stackTrace - Stack trace
     * @returns {object} {className, methodName, location}
     */
    static extractRootCause(stackTrace) {
        if (!stackTrace) {
            return { className: 'Unknown', methodName: 'unknown', location: 'Unknown.unknown' };
        }

        // Try to find the first stack frame (usually the root cause)
        // Format: at package.Class.method(File.java:line)
        const match = stackTrace.match(/at\s+([a-zA-Z0-9_.]+)\.([a-zA-Z0-9_<>]+)\([^)]+\)/);

        if (match) {
            const fullClass = match[1];
            const method = match[2];
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
            testCase.failure_type,
            testCase.failure_message
        );
        const rootCause = this.extractRootCause(testCase.failure_type);
        const normalizedMessage = this.normalizeErrorMessage(testCase.failure_message || '');
        const normalizedTrace = this.normalizeStackTrace(testCase.failure_type || '');

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
                test.failure_type,
                test.failure_message
            );
            const rootCause = this.extractRootCause(test.failure_type);
            const category = this.categorizeFailure(
                exceptionType,
                test.failure_message,
                test.failure_type
            );
            const normalizedMessage = this.normalizeErrorMessage(test.failure_message || '');

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
                    exampleMessage: test.failure_message || 'No error message',
                    exampleStackTrace: test.failure_type || '',
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
                    classname: t.classname,
                    time: t.time
                }))
            })),
            categoryCounts
        };
    }
}

module.exports = StackTraceAnalyzer;
