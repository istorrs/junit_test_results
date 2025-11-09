// MongoDB initialization script for Docker
// This creates the application database user
// Note: This script runs in the MongoDB container context
// Environment variables are passed from docker-compose.yml

db = db.getSiblingDB('junit_test_results');

// Get credentials from environment (set in docker-compose.yml)
const appUser = 'junit_app';  // Will read from MONGO_INITDB_DATABASE env var via Docker
const appPassword = _getEnv('MONGO_APP_PASSWORD') || 'changeme';

// Create application user
try {
  db.createUser({
    user: appUser,
    pwd: appPassword,
    roles: [
      {
        role: 'readWrite',
        db: 'junit_test_results'
      }
    ]
  });
  print('MongoDB initialization complete - junit_test_results database and user created');
  print('User: ' + appUser);
} catch (e) {
  print('User creation failed or user already exists: ' + e);
}
