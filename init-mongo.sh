#!/bin/bash
# MongoDB initialization script for Docker

mongosh <<EOF
use junit_test_results

db.createUser({
  user: "${MONGO_APP_USER}",
  pwd: "${MONGO_APP_PASSWORD}",
  roles: [
    {
      role: "readWrite",
      db: "junit_test_results"
    }
  ]
})

print("MongoDB initialization complete - junit_test_results database and user created");
EOF
