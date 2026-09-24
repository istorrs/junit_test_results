const RUN_SORT_FIELDS = Object.freeze({
    name: 'name',
    timestamp: 'timestamp',
    total_tests: 'total_tests',
    passed: 'passed',
    failed: 'failed',
    errors: 'errors',
    skipped: 'skipped',
    time: 'time',
    pass_rate: 'pass_rate'
});

const getRunSort = (sortBy = 'timestamp', sortOrder = 'desc') => {
    if (!Object.hasOwn(RUN_SORT_FIELDS, sortBy)) {
        const error = new Error(
            `Invalid sort_by. Expected one of: ${Object.keys(RUN_SORT_FIELDS).join(', ')}`
        );
        error.statusCode = 400;
        throw error;
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
        const error = new Error('Invalid sort_order. Expected asc or desc');
        error.statusCode = 400;
        throw error;
    }

    return {
        field: RUN_SORT_FIELDS[sortBy],
        direction: sortOrder === 'asc' ? 1 : -1
    };
};

const buildPassRateSortPipeline = (query, direction, skip, limit) => [
    { $match: query },
    {
        $addFields: {
            _sort_pass_rate: {
                $cond: [
                    { $gt: ['$total_tests', 0] },
                    { $divide: ['$passed', '$total_tests'] },
                    -1
                ]
            }
        }
    },
    { $sort: { _sort_pass_rate: direction, _id: direction } },
    { $skip: skip },
    { $limit: limit },
    { $project: { _sort_pass_rate: 0 } }
];

module.exports = { RUN_SORT_FIELDS, getRunSort, buildPassRateSortPipeline };
