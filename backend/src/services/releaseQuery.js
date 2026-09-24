const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildReleaseMatch = ({ job_name: jobName, search } = {}) => {
    const match = { release_tag: { $exists: true, $ne: null } };
    if (jobName) match['ci_metadata.job_name'] = { $eq: jobName };
    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i');
        match.$or = [{ release_tag: pattern }, { release_version: pattern }];
    }
    return match;
};

const getReleasePagination = (query, defaultLimit, maxLimit) => {
    const requestedLimit = Number.parseInt(query.limit, 10);
    const limit = Math.min(
        Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : defaultLimit,
        maxLimit
    );
    const requestedPage = Number.parseInt(query.page, 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const legacySkip = Number.parseInt(query.skip, 10);
    const skip = Number.isFinite(legacySkip) && legacySkip >= 0 ? legacySkip : (page - 1) * limit;

    return { page: Math.floor(skip / limit) + 1, limit, skip };
};

const calculateReleaseMetrics = runs => {
    const totalTests = runs.reduce((sum, run) => sum + run.total_tests, 0);
    const totalFailed = runs.reduce((sum, run) => sum + run.failed, 0);
    const totalErrors = runs.reduce((sum, run) => sum + run.errors, 0);
    const totalSkipped = runs.reduce((sum, run) => sum + run.skipped, 0);
    const totalPassed = totalTests - totalFailed - totalErrors - totalSkipped;
    const totalTime = runs.reduce((sum, run) => sum + (run.time || 0), 0);

    return {
        total_runs: runs.length,
        total_tests: totalTests,
        passed: totalPassed,
        failed: totalFailed,
        errors: totalErrors,
        skipped: totalSkipped,
        // Preserve the original API names while exposing consistent short names.
        total_passed: totalPassed,
        total_failed: totalFailed,
        total_errors: totalErrors,
        total_skipped: totalSkipped,
        pass_rate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
        total_time: totalTime,
        avg_time_per_run: runs.length > 0 ? totalTime / runs.length : 0,
        first_run: runs[runs.length - 1]?.timestamp,
        last_run: runs[0]?.timestamp
    };
};

module.exports = { buildReleaseMatch, getReleasePagination, calculateReleaseMetrics };
