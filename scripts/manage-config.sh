#!/bin/bash
# Configuration management script for environment variables and secrets
# Usage: ./scripts/manage-config.sh <command> <environment> [options]
# Commands: set, get, list, delete, sync

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
Usage: $0 <command> <environment> [options]

Commands:
  set <env> <key> <value>     Set a configuration value
  get <env> <key>             Get a configuration value
  list <env>                  List all configuration values
  delete <env> <key>          Delete a configuration value
  sync <env>                  Sync configuration to AWS Secrets Manager
  export <env>                Export configuration to .env file
  import <env> <file>         Import configuration from file

Environments:
  dev, staging, production

Examples:
  $0 set dev JWT_SECRET my-secret-key
  $0 get production API_URL
  $0 list staging
  $0 sync production
  $0 export dev

EOF
    exit 1
}

# Check arguments
if [ $# -lt 2 ]; then
    usage
fi

COMMAND=$1
ENVIRONMENT=$2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$SCRIPT_DIR/config"
CONFIG_FILE="$CONFIG_DIR/$ENVIRONMENT.json"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    usage
fi

# Create config directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Initialize config file if it doesn't exist
if [ ! -f "$CONFIG_FILE" ]; then
    echo "{}" > "$CONFIG_FILE"
fi

# Check AWS credentials for commands that need it
check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        exit 1
    fi
}

# Set configuration value
cmd_set() {
    if [ $# -lt 2 ]; then
        print_error "Usage: $0 set <environment> <key> <value>"
        exit 1
    fi
    
    local KEY=$1
    local VALUE=$2
    
    print_info "Setting $KEY in $ENVIRONMENT environment"
    
    # Update JSON file
    TEMP_FILE=$(mktemp)
    jq ". + {\"$KEY\": \"$VALUE\"}" "$CONFIG_FILE" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$CONFIG_FILE"
    
    print_success "Configuration updated: $KEY"
    print_info "Run '$0 sync $ENVIRONMENT' to sync to AWS Secrets Manager"
}

# Get configuration value
cmd_get() {
    if [ $# -lt 1 ]; then
        print_error "Usage: $0 get <environment> <key>"
        exit 1
    fi
    
    local KEY=$1
    
    VALUE=$(jq -r ".$KEY // empty" "$CONFIG_FILE")
    
    if [ -z "$VALUE" ]; then
        print_error "Configuration key not found: $KEY"
        exit 1
    fi
    
    echo "$VALUE"
}

# List all configuration values
cmd_list() {
    print_info "Configuration for $ENVIRONMENT environment:"
    echo ""
    
    jq -r 'to_entries[] | "\(.key) = \(.value)"' "$CONFIG_FILE" | while read -r line; do
        echo "  $line"
    done
    
    echo ""
    print_info "Total keys: $(jq 'length' "$CONFIG_FILE")"
}

# Delete configuration value
cmd_delete() {
    if [ $# -lt 1 ]; then
        print_error "Usage: $0 delete <environment> <key>"
        exit 1
    fi
    
    local KEY=$1
    
    print_warning "Deleting $KEY from $ENVIRONMENT environment"
    
    # Update JSON file
    TEMP_FILE=$(mktemp)
    jq "del(.$KEY)" "$CONFIG_FILE" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$CONFIG_FILE"
    
    print_success "Configuration deleted: $KEY"
}

# Sync configuration to AWS Secrets Manager
cmd_sync() {
    check_aws_credentials
    
    print_info "Syncing configuration to AWS Secrets Manager..."
    
    SECRET_NAME="misra-platform/config/$ENVIRONMENT"
    CONFIG_JSON=$(cat "$CONFIG_FILE")
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" &> /dev/null; then
        print_info "Updating existing secret: $SECRET_NAME"
        aws secretsmanager update-secret \
            --secret-id "$SECRET_NAME" \
            --secret-string "$CONFIG_JSON"
    else
        print_info "Creating new secret: $SECRET_NAME"
        aws secretsmanager create-secret \
            --name "$SECRET_NAME" \
            --description "MISRA Platform configuration for $ENVIRONMENT" \
            --secret-string "$CONFIG_JSON"
    fi
    
    print_success "Configuration synced to AWS Secrets Manager"
    print_info "Secret ARN: $(aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --query ARN --output text)"
}

# Export configuration to .env file
cmd_export() {
    local OUTPUT_FILE="${3:-.env.$ENVIRONMENT}"
    
    print_info "Exporting configuration to $OUTPUT_FILE"
    
    # Convert JSON to .env format
    jq -r 'to_entries[] | "\(.key)=\(.value)"' "$CONFIG_FILE" > "$OUTPUT_FILE"
    
    print_success "Configuration exported to: $OUTPUT_FILE"
    print_warning "Remember to add $OUTPUT_FILE to .gitignore"
}

# Import configuration from file
cmd_import() {
    if [ $# -lt 1 ]; then
        print_error "Usage: $0 import <environment> <file>"
        exit 1
    fi
    
    local INPUT_FILE=$1
    
    if [ ! -f "$INPUT_FILE" ]; then
        print_error "File not found: $INPUT_FILE"
        exit 1
    fi
    
    print_info "Importing configuration from $INPUT_FILE"
    
    # Detect file format
    if [[ "$INPUT_FILE" == *.json ]]; then
        # JSON file
        cp "$INPUT_FILE" "$CONFIG_FILE"
    else
        # Assume .env format
        TEMP_FILE=$(mktemp)
        echo "{}" > "$TEMP_FILE"
        
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            [[ "$key" =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue
            
            # Remove quotes from value
            value=$(echo "$value" | sed 's/^["'\'']\(.*\)["'\'']$/\1/')
            
            # Add to JSON
            TEMP_FILE2=$(mktemp)
            jq ". + {\"$key\": \"$value\"}" "$TEMP_FILE" > "$TEMP_FILE2"
            mv "$TEMP_FILE2" "$TEMP_FILE"
        done < "$INPUT_FILE"
        
        mv "$TEMP_FILE" "$CONFIG_FILE"
    fi
    
    print_success "Configuration imported successfully"
    print_info "Run '$0 list $ENVIRONMENT' to view imported configuration"
}

# Execute command
case $COMMAND in
    set)
        shift 2
        cmd_set "$@"
        ;;
    get)
        shift 2
        cmd_get "$@"
        ;;
    list)
        cmd_list
        ;;
    delete)
        shift 2
        cmd_delete "$@"
        ;;
    sync)
        cmd_sync
        ;;
    export)
        shift 2
        cmd_export "$@"
        ;;
    import)
        shift 2
        cmd_import "$@"
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        usage
        ;;
esac

exit 0
