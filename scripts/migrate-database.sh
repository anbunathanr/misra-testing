#!/bin/bash
# Database migration script for DynamoDB schema changes
# Usage: ./scripts/migrate-database.sh <environment> <migration-name>
# Example: ./scripts/migrate-database.sh dev add-user-role-attribute

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

# Check arguments
if [ $# -lt 2 ]; then
    print_error "Usage: $0 <environment> <migration-name>"
    echo "Example: $0 dev add-user-role-attribute"
    exit 1
fi

ENVIRONMENT=$1
MIGRATION_NAME=$2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
MIGRATION_FILE="$MIGRATIONS_DIR/${MIGRATION_NAME}.sh"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# Print banner
echo ""
echo "=========================================="
echo "  DynamoDB Migration"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Migration: $MIGRATION_NAME"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    print_error "Migration file not found: $MIGRATION_FILE"
    print_info "Available migrations:"
    ls -1 "$MIGRATIONS_DIR"/*.sh 2>/dev/null | xargs -n 1 basename || echo "  No migrations found"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured"
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
print_info "AWS Account: $AWS_ACCOUNT"
print_info "AWS Region: $AWS_REGION"
echo ""

# Create backup before migration
print_info "Creating backup before migration..."
BACKUP_DIR="$SCRIPT_DIR/backups/$ENVIRONMENT"
mkdir -p "$BACKUP_DIR"
BACKUP_TIMESTAMP=$(date '+%Y%m%d-%H%M%S')

# Backup all tables
TABLES=(
    "misra-platform-users-$ENVIRONMENT"
    "misra-platform-file-metadata-$ENVIRONMENT"
    "misra-platform-analysis-results-$ENVIRONMENT"
    "misra-platform-sample-files-$ENVIRONMENT"
    "misra-platform-progress-$ENVIRONMENT"
)

for TABLE in "${TABLES[@]}"; do
    print_info "Backing up table: $TABLE"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$TABLE" &> /dev/null; then
        # Export table data
        BACKUP_FILE="$BACKUP_DIR/${TABLE}-${BACKUP_TIMESTAMP}.json"
        aws dynamodb scan --table-name "$TABLE" > "$BACKUP_FILE"
        print_success "Backup saved: $BACKUP_FILE"
    else
        print_warning "Table not found: $TABLE (skipping)"
    fi
done

echo ""

# Confirm migration
if [ "$ENVIRONMENT" = "production" ]; then
    print_warning "You are about to run a migration on PRODUCTION!"
    read -p "Type 'yes' to continue: " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        print_info "Migration cancelled"
        exit 0
    fi
fi

# Run migration
print_info "Running migration: $MIGRATION_NAME"
echo ""

# Source the migration file
source "$MIGRATION_FILE"

# Call the migration function
if declare -f migrate &> /dev/null; then
    migrate "$ENVIRONMENT" || {
        print_error "Migration failed!"
        print_info "Backups are available in: $BACKUP_DIR"
        exit 1
    }
else
    print_error "Migration file must define a 'migrate' function"
    exit 1
fi

echo ""
print_success "Migration completed successfully!"

# Record migration
MIGRATION_LOG="$SCRIPT_DIR/migration-history.json"
if [ ! -f "$MIGRATION_LOG" ]; then
    echo "[]" > "$MIGRATION_LOG"
fi

# Add migration record
TEMP_FILE=$(mktemp)
jq ". += [{
    \"migration\": \"$MIGRATION_NAME\",
    \"environment\": \"$ENVIRONMENT\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"awsAccount\": \"$AWS_ACCOUNT\",
    \"awsRegion\": \"$AWS_REGION\",
    \"executedBy\": \"$(whoami)\",
    \"backupLocation\": \"$BACKUP_DIR\"
}]" "$MIGRATION_LOG" > "$TEMP_FILE"
mv "$TEMP_FILE" "$MIGRATION_LOG"

print_info "Migration recorded in: $MIGRATION_LOG"
print_info "Backups available in: $BACKUP_DIR"

echo ""
echo "=========================================="
echo "  Migration Summary"
echo "=========================================="
echo "Migration: $MIGRATION_NAME"
echo "Environment: $ENVIRONMENT"
echo "Status: SUCCESS"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

exit 0
