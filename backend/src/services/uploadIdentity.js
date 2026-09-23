const { generateHash } = require('./hashGenerator');

const normalize = value => (value === undefined || value === null ? '' : String(value));

const hasCiBuildIdentity = ciMetadata =>
    Boolean(ciMetadata?.job_name) &&
    ciMetadata.build_number !== undefined &&
    ciMetadata.build_number !== null &&
    ciMetadata.build_number !== '';

const buildUploadScope = (filename, ciMetadata, releaseMetadata = {}) => {
    if (hasCiBuildIdentity(ciMetadata)) {
        return {
            type: 'ci',
            provider: normalize(ciMetadata.provider),
            repository: normalize(ciMetadata.repository),
            job_name: normalize(ciMetadata.job_name),
            build_number: normalize(ciMetadata.build_number),
            build_id: normalize(ciMetadata.build_id)
        };
    }

    return {
        type: 'manual',
        filename: normalize(filename),
        release_tag: normalize(releaseMetadata.release_tag),
        release_version: normalize(releaseMetadata.release_version)
    };
};

const buildCiRunQuery = ciMetadata => {
    const query = {
        'ci_metadata.job_name': ciMetadata.job_name,
        'ci_metadata.build_number': ciMetadata.build_number
    };

    for (const field of ['provider', 'repository', 'build_id']) {
        if (ciMetadata[field] !== undefined && ciMetadata[field] !== null && ciMetadata[field] !== '') {
            query[`ci_metadata.${field}`] = ciMetadata[field];
        }
    }

    return query;
};

const generateUploadIdentity = (xmlContent, filename, ciMetadata, releaseMetadata) => {
    const rawContentHash = generateHash(xmlContent);
    const scope = buildUploadScope(filename, ciMetadata, releaseMetadata);
    const contentHash = generateHash(`${JSON.stringify(scope)}\0${rawContentHash}`);

    return { contentHash, rawContentHash, scope };
};

module.exports = {
    buildCiRunQuery,
    buildUploadScope,
    generateUploadIdentity,
    hasCiBuildIdentity
};
