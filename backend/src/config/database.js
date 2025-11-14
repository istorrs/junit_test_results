const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Create indexes on startup
        await createIndexes();

        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

const createIndexes = async () => {
    try {
        const db = mongoose.connection.db;

        // test_runs indexes
        await db.collection('testruns').createIndex({ timestamp: -1 });
        await db.collection('testruns').createIndex({ content_hash: 1 }, { unique: true, sparse: true });
        await db.collection('testruns').createIndex({ 'ci_metadata.build_id': 1 });
        await db.collection('testruns').createIndex({ 'ci_metadata.commit_sha': 1 });
        await db.collection('testruns').createIndex({ 'ci_metadata.branch': 1 });

        // test_suites indexes
        await db.collection('testsuites').createIndex({ run_id: 1 });
        await db.collection('testsuites').createIndex({ timestamp: -1 });

        // test_cases indexes
        await db.collection('testcases').createIndex({ run_id: 1 });
        await db.collection('testcases').createIndex({ suite_id: 1 });
        await db.collection('testcases').createIndex({ status: 1 });
        await db.collection('testcases').createIndex({ name: 1, class_name: 1 });
        await db.collection('testcases').createIndex({ is_flaky: 1 });
        await db.collection('testcases').createIndex({ name: 'text', class_name: 'text' });

        // test_results indexes
        await db.collection('testresults').createIndex({ case_id: 1 });
        await db.collection('testresults').createIndex({ run_id: 1 });
        await db.collection('testresults').createIndex({ timestamp: -1 });

        // file_uploads indexes
        await db.collection('fileuploads').createIndex({ content_hash: 1 }, { unique: true, sparse: true });
        await db.collection('fileuploads').createIndex({ upload_timestamp: -1 });

        console.log('Database indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error.message);
    }
};

module.exports = { connectDB };
