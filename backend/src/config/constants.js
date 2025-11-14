/**
 * Global application constants
 *
 * IMPORTANT: These limits are set high to accommodate large test suites.
 * DO NOT reduce these values without explicit user approval.
 */

// Maximum number of records to return in API queries
// Set to 10000 to handle large test suites
const MAX_QUERY_LIMIT = 10000;

// Default limit if not specified in request
const DEFAULT_QUERY_LIMIT = 10000;

module.exports = {
    MAX_QUERY_LIMIT,
    DEFAULT_QUERY_LIMIT
};
