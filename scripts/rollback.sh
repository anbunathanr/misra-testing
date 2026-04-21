#!/bin/bash
# Rollback script for MISRA Platform deployments
# Usage: ./scripts/rollback.sh <environment> [options]
# Example: ./scripts/rollback.sh production --to-version v1.2.3

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

# Usage function
usage() {
    cat << EOF
Usage: $0 <environment> [options]

Environments:
  dev, staging, production

Options:
  --to-version <version>    Rollback to specific version (e.g., v1.2.3)
  --to-previous             Rollback to previous deployment
  --list-versions           List available versions to rollback to
  --backend-only            Rollback backend only
  --frontend-only           Rollback frontend only
  --dry-run                 Show what would be rolled back without actually doing it
  -h, --help                Show this help message

Examples:
  $0 production --to-previous
  $0 staging --to-version v1.2.3
  $0 dev --list-versions
  $0 production --backend-only --to-previous

EOF
    exit 1
}

# Check arguments
if [ $# -eq 0 ]; then
    usage
fi

ENVIRONMENT=$1
shift

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    usage
fi

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOYMENTS_DIR="$PROJECT_ROOT/deployments"
BACKEND_DIR="$PROJECT_ROOT/packages/backend"
FRONTEND_DIR="$PROJECT_ROOT/packages/frontend"

# Default options
TO_VERSION=""
TO_PREVIOUS=false
LIST_VERSIONS=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
DRY_RUN=false

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --to-version)
            TO_VERSION=$2
            shift 2
            ;;
        --to-previous)
            TO_PREVIOUS=true
            shift
            ;;
        --list-versions)
            LIST_VERSIONS=true
            shift
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Print banner
echo ""
echo "=========================================="
echo "  MISRA Platform Rollback"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

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

# List available versions
list_versions() {
    print_info "Available deployments for $ENVIRONMENT:"
    echo ""
    
    if [ ! -d "$DEPLOYMENTS_DIR" ]; then
        print_warning "No deployment history found"
        return
    fi
    
    # Find deployment files for this environment
    DEPLOYMENT_FILES=$(find "$DEPLOYMENTS_DIR" -name "$ENVIRONMENT-*.json" | sort -r)
    
    if [ -z "$DEPLOYMENT_FILES" ]; then
        print_warning "No deployments found for $ENVIRONMENT"
        return
    fi
    
    echo "Recent deployments:"
    echo ""
    
    COUNT=0
    while IFS= read -r file; do
        TIMESTAMP=$(jq -r '.timestamp' "$file")
        GIT_COMMIT=$(jq -r '.gitCommit' "$file")
        DEPLOYED_BY=$(jq -r '.deployedBy' "$file")
        
        echo "  $((++COUNT)). $(basename "$file" .json)"
        echo "     Timestamp: $TIMESTAMP"
        echo "     Git Commit: ${GIT_COMMIT:0:8}"
        echo "     Deployed By: $DEPLOYED_BY"
        echo ""
    done <<< "$DEPLOYMENT_FILES"
}

# Handle list versions command
if [ "$LIST_VERSIONS" = true ]; then
    list_versions
    exit 0
fi

# Determine target version
if [ "$TO_PREVIOUS" = true ]; then
    print_info "Finding previous deployment..."
    
    # Get the two most recent deployments
    DEPLOYMENT_FILES=$(find "$DEPLOYMENTS_DIR" -name "$ENVIRONMENT-*.json" | sort -r | head -2)
    DEPLOYMENT_COUNT=$(echo "$DEPLOYMENT_FILES" | wc -l)
    
    if [ "$DEPLOYMENT_COUNT" -lt 2 ]; then
        print_error "No previous deployment found to rollback to"
        exit 1
    fi
    
    # Get the second most recent (previous) deployment
    TARGET_DEPLOYMENT=$(echo "$DEPLOYMENT_FILES" | sed -n '2p')
    TARGET_VERSION=$(basename "$TARGET_DEPLOYMENT" .json)
    
    print_info "Target deployment: $TARGET_VERSION"
elif [ -n "$TO_VERSION" ]; then
    TARGET_VERSION="$ENVIRONMENT-$TO_VERSION"
    TARGET_DEPLOYMENT="$DEPLOYMENTS_DIR/$TARGET_VERSION.json"
    
    if [ ! -f "$TARGET_DEPLOYMENT" ]; then
        print_error "Deployment not found: $TARGET_VERSION"
        print_info "Run '$0 $ENVIRONMENT --list-versions' to see available versions"
        exit 1
    fi
else
    print_error "Must specify either --to-version or --to-previous"
    usage
fi

# Load target deployment metadata
print_info "Loading deployment metadata..."
GIT_COMMIT=$(jq -r '.gitCommit' "$TARGET_DEPLOYMENT")
GIT_BRANCH=$(jq -r '.gitBranch' "$TARGET_DEPLOYMENT")
DEPLOYED_TIMESTAMP=$(jq -r '.timestamp' "$TARGET_DEPLOYMENT")

echo ""
echo "Rollback Target:"
echo "  Version: $TARGET_VERSION"
echo "  Git Commit: $GIT_COMMIT"
echo "  Git Branch: $GIT_BRANCH"
echo "  Original Deployment: $DEPLOYED_TIMESTAMP"
echo ""

# Confirm rollback for production
if [ "$ENVIRONMENT" = "production" ] && [ "$DRY_RUN" = false ]; then
    print_warning "You are about to rollback PRODUCTION!"
    print_warning "This will revert to commit: $GIT_COMMIT"
    read -p "Type 'yes' to continue: " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        print_info "Rollback cancelled"
        exit 0
    fi
fi

# Checkout target commit
print_info "Checking out target commit: $GIT_COMMIT"
if [ "$DRY_RUN" = false ]; then
    cd "$PROJECT_ROOT"
    git fetch --all
    git checkout "$GIT_COMMIT" || {
        print_error "Failed to checkout commit: $GIT_COMMIT"
        exit 1
    }
    print_success "Checked out commit: $GIT_COMMIT"
else
    print_warning "DRY RUN: Would checkout commit: $GIT_COMMIT"
fi
echo ""

# Rollback backend
if [ "$FRONTEND_ONLY" = false ]; then
    print_info "Rolling back backend..."
    cd "$BACKEND_DIR"
    
    if [ "$DRY_RUN" = false ]; then
        # Install dependencies
        npm ci || {
            print_error "Failed to install backend dependencies"
            exit 1
        }
        
        # Build backend
        npm run build || {
            print_error "Failed to build backend"
            exit 1
        }
        
        # Deploy with CDK
        cdk deploy \
            --context environment=$ENVIRONMENT \
            --require-approval never || {
            print_error "Backend rollback failed"
            exit 1
        }
        
        print_success "Backend rolled back successfully"
    else
        print_warning "DRY RUN: Would rollback backend"
    fi
    echo ""
fi

# Rollback frontend
if [ "$BACKEND_ONLY" = false ]; then
    print_info "Rolling back frontend..."
    cd "$FRONTEND_DIR"
    
    if [ "$DRY_RUN" = false ]; then
        # Install dependencies
        npm ci || {
            print_error "Failed to install frontend dependencies"
            exit 1
        }
        
        # Build frontend
        npm run build || {
            print_error "Failed to build frontend"
            exit 1
        }
        
        # Deploy to S3
        BUCKET_NAME="misra-platform-frontend-$ENVIRONMENT-$AWS_ACCOUNT"
        print_info "Deploying frontend to S3: $BUCKET_NAME"
        
        aws s3 sync dist/ "s3://$BUCKET_NAME" --delete || {
            print_error "Frontend rollback failed"
            exit 1
        }
        
        # Invalidate CloudFront cache
        DISTRIBUTION_ID=$(aws cloudfront list-distributions \
            --query "DistributionList.Items[?Origins.Items[?DomainName=='$BUCKET_NAME.s3.amazonaws.com']].Id" \
            --output text)
        
        if [ -n "$DISTRIBUTION_ID" ]; then
            print_info "Invalidating CloudFront cache..."
            aws cloudfront create-invalidation \
                --distribution-id "$DISTRIBUTION_ID" \
                --paths "/*" > /dev/null
        fi
        
        print_success "Frontend rolled back successfully"
    else
        print_warning "DRY RUN: Would rollback frontend"
    fi
    echo ""
fi

# Return to original branch
if [ "$DRY_RUN" = false ]; then
    cd "$PROJECT_ROOT"
    print_info "Returning to original branch..."
    git checkout - || print_warning "Could not return to original branch"
fi

# Print rollback summary
echo "=========================================="
echo "  Rollback Summary"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Rolled back to: $TARGET_VERSION"
echo "Git Commit: $GIT_COMMIT"
echo "Status: SUCCESS"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

print_success "Rollback completed successfully!"

# Record rollback
if [ "$DRY_RUN" = false ]; then
    ROLLBACK_LOG="$SCRIPT_DIR/rollback-history.json"
    if [ ! -f "$ROLLBACK_LOG" ]; then
        echo "[]" > "$ROLLBACK_LOG"
    fi
    
    TEMP_FILE=$(mktemp)
    jq ". += [{
        \"environment\": \"$ENVIRONMENT\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"rolledBackTo\": \"$TARGET_VERSION\",
        \"gitCommit\": \"$GIT_COMMIT\",
        \"executedBy\": \"$(whoami)\",
        \"backendOnly\": $BACKEND_ONLY,
        \"frontendOnly\": $FRONTEND_ONLY
    }]" "$ROLLBACK_LOG" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$ROLLBACK_LOG"
    
    print_info "Rollback recorded in: $ROLLBACK_LOG"
fi

exit 0
