const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildReleaseMatch = ({ job_name: jobName, search } = {}) => {
    const match = { release_tag: { $exists: true, $ne: null } };
    if (jobName) match['ci_metadata.job_name'] = jobName;
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

module.exports = { buildReleaseMatch, getReleasePagination };
