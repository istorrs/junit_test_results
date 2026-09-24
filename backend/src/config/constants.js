/**
 * Global application constants
 *
 * Keep these limits aligned with the frontend constants.
 */

// Maximum number of records to return in API queries
// Set to 10000 to handle large test suites
const MAX_QUERY_LIMIT = 10000;

// Default limit if not specified in request
const DEFAULT_QUERY_LIMIT = 50;

module.exports = {
    MAX_QUERY_LIMIT,
    DEFAULT_QUERY_LIMIT
};
