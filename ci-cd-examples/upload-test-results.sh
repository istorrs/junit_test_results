#!/bin/bash

##############################################################################
# JUnit Test Results Upload Script
#
# This script uploads JUnit XML test results to the dashboard API
#
# Usage:
#   ./upload-test-results.sh [directory]
#   JUNIT_API_URL=http://server:5000 ./upload-test-results.sh
##############################################################################

# Configuration
API_URL="${JUNIT_API_URL:-http://localhost:5000/api/v1/upload}"
RESULTS_DIR="${1:-./target/surefire-reports}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Print header
echo "========================================"
echo "  JUnit Test Results Upload"
echo "========================================"
print_info "API URL: $API_URL"
print_info "Results Directory: $RESULTS_DIR"
echo ""

# Check if directory exists
if [ ! -d "$RESULTS_DIR" ]; then
    print_error "Directory $RESULTS_DIR not found"
    echo ""
    echo "Usage: $0 [directory]"
    echo "  directory: Path to JUnit XML results (default: ./target/surefire-reports)"
    echo ""
    echo "Example:"
    echo "  $0 ./build/test-results"
    echo "  JUNIT_API_URL=http://server:5000 $0"
    exit 1
fi

# Check if curl is available
if ! command -v curl &> /dev/null; then
    print_error "curl is not installed. Please install curl first."
    exit 1
fi

# Initialize counters
count=0
success=0
failed=0
skipped=0

# Prepare CI metadata (optional - can be customized)
CI_METADATA="{
  \"provider\": \"manual\",
  \"source\": \"bash_script\",
  \"user\": \"${USER:-unknown}\",
  \"hostname\": \"$(hostname)\"
}"

# Find and upload all XML files
shopt -s nullglob  # Handle case where no files are found
for xmlfile in "$RESULTS_DIR"/*.xml; do
    if [ -f "$xmlfile" ]; then
        count=$((count + 1))
        filename=$(basename "$xmlfile")

        print_info "Uploading: $filename..."

        # Perform upload
        response=$(curl -X POST "$API_URL" \
            -F "file=@$xmlfile" \
            -F "ci_metadata=$CI_METADATA" \
            --silent --write-out "\n%{http_code}" \
            2>&1)

        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')

        if [ "$http_code" -eq 201 ] || [ "$http_code" -eq 200 ]; then
            print_success "Success"
            success=$((success + 1))
        elif [ "$http_code" -eq 409 ]; then
            print_warning "Skipped (duplicate)"
            skipped=$((skipped + 1))
        else
            print_error "Failed (HTTP $http_code)"
            if [ -n "$body" ]; then
                echo "  Response: $body"
            fi
            failed=$((failed + 1))
        fi
        echo ""
    fi
done

# Print summary
echo "========================================"
echo "  Upload Summary"
echo "========================================"
echo "  Total files: $count"
print_success "Successful: $success"
if [ $skipped -gt 0 ]; then
    print_warning "Skipped: $skipped"
fi
if [ $failed -gt 0 ]; then
    print_error "Failed: $failed"
fi
echo "========================================"

# Exit with appropriate code
if [ $count -eq 0 ]; then
    print_warning "No XML files found in $RESULTS_DIR"
    exit 2
elif [ $failed -gt 0 ]; then
    exit 1
else
    print_success "All uploads completed successfully!"
    exit 0
fi
