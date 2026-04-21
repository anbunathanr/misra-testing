#!/bin/bash
# Test script to validate deployment scripts
# Usage: ./scripts/test-scripts.sh

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name=$1
    local test_command=$2
    
    ((TESTS_RUN++))
    print_info "Running test: $test_name"
    
    if eval "$test_command" &> /dev/null; then
        ((TESTS_PASSED++))
        print_success "✓ $test_name"
    else
        ((TESTS_FAILED++))
        print_error "✗ $test_name"
    fi
}

# Print banner
echo ""
echo "=========================================="
echo "  Deployment Scripts Test Suite"
echo "=========================================="
echo ""

# Test 1: Check if scripts exist
print_info "Testing script existence..."
run_test "deploy-env.sh exists" "test -f scripts/deploy-env.sh"
run_test "deploy-env.ps1 exists" "test -f scripts/deploy-env.ps1"
run_test "migrate-database.sh exists" "test -f scripts/migrate-database.sh"
run_test "manage-config.sh exists" "test -f scripts/manage-config.sh"
run_test "rollback.sh exists" "test -f scripts/rollback.sh"
echo ""

# Test 2: Check if scripts are executable
print_info "Testing script permissions..."
run_test "deploy-env.sh is executable" "test -x scripts/deploy-env.sh"
run_test "migrate-database.sh is executable" "test -x scripts/migrate-database.sh"
run_test "manage-config.sh is executable" "test -x scripts/manage-config.sh"
run_test "rollback.sh is executable" "test -x scripts/rollback.sh"
echo ""

# Test 3: Check if migration examples exist
print_info "Testing migration examples..."
run_test "example-add-gsi.sh exists" "test -f scripts/migrations/example-add-gsi.sh"
run_test "example-add-attribute.sh exists" "test -f scripts/migrations/example-add-attribute.sh"
run_test "example-add-gsi.sh is executable" "test -x scripts/migrations/example-add-gsi.sh"
run_test "example-add-attribute.sh is executable" "test -x scripts/migrations/example-add-attribute.sh"
echo ""

# Test 4: Check if directories exist
print_info "Testing directory structure..."
run_test "scripts/migrations directory exists" "test -d scripts/migrations"
run_test "scripts/config directory exists" "test -d scripts/config"
run_test "scripts/backups directory exists" "test -d scripts/backups"
run_test "deployments directory exists" "test -d deployments"
echo ""

# Test 5: Check if documentation exists
print_info "Testing documentation..."
run_test "README.md exists" "test -f scripts/README.md"
run_test "QUICK_REFERENCE.md exists" "test -f scripts/QUICK_REFERENCE.md"
run_test "DEPLOYMENT_SCRIPTS_GUIDE.md exists" "test -f DEPLOYMENT_SCRIPTS_GUIDE.md"
echo ""

# Test 6: Test script help commands
print_info "Testing script help commands..."
run_test "deploy-env.sh --help works" "bash scripts/deploy-env.sh --help"
run_test "manage-config.sh help works" "bash scripts/manage-config.sh"
run_test "rollback.sh --help works" "bash scripts/rollback.sh --help"
echo ""

# Test 7: Test configuration management (dry operations)
print_info "Testing configuration management..."
run_test "config directory is writable" "test -w scripts/config"
run_test "can create test config file" "echo '{}' > scripts/config/test.json"
run_test "can read test config file" "test -f scripts/config/test.json"
run_test "can delete test config file" "rm -f scripts/config/test.json"
echo ""

# Test 8: Check prerequisites
print_info "Testing prerequisites..."
run_test "bash is available" "command -v bash"
run_test "jq is available" "command -v jq"
run_test "aws CLI is available" "command -v aws"
run_test "node is available" "command -v node"
run_test "npm is available" "command -v npm"
echo ""

# Test 9: Test npm scripts
print_info "Testing npm scripts..."
run_test "deploy:dev script exists" "grep -q 'deploy:dev' package.json"
run_test "deploy:staging script exists" "grep -q 'deploy:staging' package.json"
run_test "deploy:production script exists" "grep -q 'deploy:production' package.json"
run_test "rollback scripts exist" "grep -q 'rollback:' package.json"
run_test "config scripts exist" "grep -q 'config:' package.json"
echo ""

# Test 10: Validate script syntax
print_info "Testing script syntax..."
run_test "deploy-env.sh syntax is valid" "bash -n scripts/deploy-env.sh"
run_test "migrate-database.sh syntax is valid" "bash -n scripts/migrate-database.sh"
run_test "manage-config.sh syntax is valid" "bash -n scripts/manage-config.sh"
run_test "rollback.sh syntax is valid" "bash -n scripts/rollback.sh"
echo ""

# Print test summary
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo "Tests Run: $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo "=========================================="
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "All tests passed!"
    exit 0
else
    print_error "$TESTS_FAILED test(s) failed"
    exit 1
fi
