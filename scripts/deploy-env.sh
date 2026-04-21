#!/bin/bash
# Environment-specific deployment script for MISRA Platform
# Usage: ./scripts/deploy-env.sh <environment> [options]
# Example: ./scripts/deploy-env.sh dev --skip-tests

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/packages/backend"
FRONTEND_DIR="$PROJECT_ROOT/packages/frontend"

# Default values
SKIP_TESTS=false
SKIP_BUILD=false
SKIP_FRONTEND=false
DRY_RUN=false

# Function to print colored output
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

# Function to print usage
usage() {
    cat << EOF
Usage: $0 <environment> [options]

Environments:
  dev         Deploy to development environment
  staging     Deploy to staging environment
  production  Deploy to production environment

Options:
  --skip-tests      Skip running tests before deployment
  --skip-build      Skip building Lambda functions
  --skip-frontend   Skip frontend deployment
  --dry-run         Show what would be deployed without actually deploying
  -h, --help        Show this help message

Examples:
  $0 dev
  $0 staging --skip-tests
  $0 production --dry-run

EOF
    exit 1
}

# Parse command line arguments
if [ $# -eq 0 ]; then
    print_error "No environment specified"
    usage
fi

ENVIRONMENT=$1
shift

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    usage
fi

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
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

# Print deployment banner
echo ""
echo "=========================================="
echo "  MISRA Platform Deployment"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install AWS CLI first."
    exit 1
fi
print_success "AWS CLI installed: $(aws --version)"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
print_success "AWS credentials configured (Account: $AWS_ACCOUNT, Region: $AWS_REGION)"

# Check CDK
if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK not found. Install with: npm install -g aws-cdk"
    exit 1
fi
print_success "AWS CDK installed: $(cdk --version)"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js 18+ first."
    exit 1
fi
print_success "Node.js installed: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm first."
    exit 1
fi
print_success "npm installed: $(npm --version)"

echo ""

# Run tests if not skipped
if [ "$SKIP_TESTS" = false ]; then
    print_info "Running tests..."
    cd "$PROJECT_ROOT"
    
    if [ "$DRY_RUN" = false ]; then
        npm run test || {
            print_error "Tests failed. Aborting deployment."
            exit 1
        }
        print_success "All tests passed"
    else
        print_warning "DRY RUN: Would run tests"
    fi
    echo ""
else
    print_warning "Skipping tests"
    echo ""
fi

# Install dependencies
print_info "Installing dependencies..."
cd "$PROJECT_ROOT"

if [ "$DRY_RUN" = false ]; then
    npm ci || {
        print_error "Failed to install dependencies"
        exit 1
    }
    print_success "Dependencies installed"
else
    print_warning "DRY RUN: Would install dependencies"
fi
echo ""

# Build backend
if [ "$SKIP_BUILD" = false ]; then
    print_info "Building backend..."
    cd "$BACKEND_DIR"
    
    if [ "$DRY_RUN" = false ]; then
        npm run build || {
            print_error "Backend build failed"
            exit 1
        }
        print_success "Backend built successfully"
    else
        print_warning "DRY RUN: Would build backend"
    fi
    echo ""
else
    print_warning "Skipping backend build"
    echo ""
fi

# Deploy backend infrastructure
print_info "Deploying backend infrastructure to $ENVIRONMENT..."
cd "$BACKEND_DIR"

if [ "$DRY_RUN" = false ]; then
    # Set environment context
    export CDK_DEPLOY_ENVIRONMENT=$ENVIRONMENT
    
    # Deploy with CDK
    cdk deploy \
        --context environment=$ENVIRONMENT \
        --require-approval never \
        --outputs-file cdk-outputs-$ENVIRONMENT.json || {
        print_error "Backend deployment failed"
        exit 1
    }
    
    print_success "Backend deployed successfully"
    
    # Extract outputs
    if [ -f "cdk-outputs-$ENVIRONMENT.json" ]; then
        API_URL=$(jq -r '.[] | .ApiUrl // empty' cdk-outputs-$ENVIRONMENT.json)
        USER_POOL_ID=$(jq -r '.[] | .UserPoolId // empty' cdk-outputs-$ENVIRONMENT.json)
        USER_POOL_CLIENT_ID=$(jq -r '.[] | .UserPoolClientId // empty' cdk-outputs-$ENVIRONMENT.json)
        
        print_info "Deployment outputs:"
        echo "  API URL: $API_URL"
        echo "  User Pool ID: $USER_POOL_ID"
        echo "  User Pool Client ID: $USER_POOL_CLIENT_ID"
    fi
else
    print_warning "DRY RUN: Would deploy backend with: cdk deploy --context environment=$ENVIRONMENT"
fi
echo ""

# Deploy frontend
if [ "$SKIP_FRONTEND" = false ]; then
    print_info "Building and deploying frontend..."
    cd "$FRONTEND_DIR"
    
    if [ "$DRY_RUN" = false ]; then
        # Create environment file
        if [ -n "$API_URL" ]; then
            cat > .env.production << EOF
VITE_API_URL=$API_URL
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_ENVIRONMENT=$ENVIRONMENT
EOF
            print_success "Frontend environment file created"
        fi
        
        # Build frontend
        npm run build || {
            print_error "Frontend build failed"
            exit 1
        }
        print_success "Frontend built successfully"
        
        # Deploy to S3
        BUCKET_NAME="misra-platform-frontend-$ENVIRONMENT-$AWS_ACCOUNT"
        print_info "Deploying frontend to S3 bucket: $BUCKET_NAME"
        
        aws s3 sync dist/ s3://$BUCKET_NAME --delete || {
            print_error "Frontend deployment to S3 failed"
            exit 1
        }
        print_success "Frontend deployed to S3"
        
        # Invalidate CloudFront cache
        DISTRIBUTION_ID=$(aws cloudfront list-distributions \
            --query "DistributionList.Items[?Origins.Items[?DomainName=='$BUCKET_NAME.s3.amazonaws.com']].Id" \
            --output text)
        
        if [ -n "$DISTRIBUTION_ID" ]; then
            print_info "Invalidating CloudFront cache..."
            aws cloudfront create-invalidation \
                --distribution-id $DISTRIBUTION_ID \
                --paths "/*" > /dev/null
            print_success "CloudFront cache invalidated"
        fi
    else
        print_warning "DRY RUN: Would build and deploy frontend"
    fi
    echo ""
else
    print_warning "Skipping frontend deployment"
    echo ""
fi

# Run smoke tests
print_info "Running smoke tests..."
if [ "$DRY_RUN" = false ] && [ -n "$API_URL" ]; then
    # Health check
    if curl -f -s "$API_URL/health" > /dev/null; then
        print_success "Health check passed"
    else
        print_warning "Health check failed - API may still be initializing"
    fi
else
    print_warning "DRY RUN: Would run smoke tests"
fi
echo ""

# Print deployment summary
echo "=========================================="
echo "  Deployment Summary"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Status: SUCCESS"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
if [ "$DRY_RUN" = false ]; then
    echo "API URL: $API_URL"
    echo "Frontend: s3://misra-platform-frontend-$ENVIRONMENT-$AWS_ACCOUNT"
fi
echo "=========================================="
echo ""

print_success "Deployment completed successfully!"

# Save deployment metadata
if [ "$DRY_RUN" = false ]; then
    DEPLOYMENT_LOG="$PROJECT_ROOT/deployments/$ENVIRONMENT-$(date '+%Y%m%d-%H%M%S').json"
    mkdir -p "$PROJECT_ROOT/deployments"
    
    cat > "$DEPLOYMENT_LOG" << EOF
{
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "awsAccount": "$AWS_ACCOUNT",
  "awsRegion": "$AWS_REGION",
  "apiUrl": "$API_URL",
  "userPoolId": "$USER_POOL_ID",
  "userPoolClientId": "$USER_POOL_CLIENT_ID",
  "deployedBy": "$(whoami)",
  "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF
    print_info "Deployment metadata saved to: $DEPLOYMENT_LOG"
fi

exit 0
