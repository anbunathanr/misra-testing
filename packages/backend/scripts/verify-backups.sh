#!/bin/bash

# MISRA Platform - Backup Verification Script
# This script verifies that all backup configurations are properly set up

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${1:-production}"
REGION="${2:-us-east-1}"

echo "========================================="
echo "MISRA Platform Backup Verification"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "========================================="
echo ""

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $ACCOUNT_ID"
echo ""

# Function to check status
check_status() {
  if [ "$1" == "ENABLED" ] || [ "$1" == "Enabled" ] || [ "$1" == "COMPLETED" ] || [ "$1" -gt 0 ] 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}"
    return 1
  fi
}

TOTAL_CHECKS=0
PASSED_CHECKS=0

# 1. Check DynamoDB Point-in-Time Recovery
echo "1. Checking DynamoDB Point-in-Time Recovery..."
TABLES=("users" "file-metadata" "analysis-results" "sample-files" "progress")

for table in "${TABLES[@]}"; do
  TABLE_NAME="misra-platform-$table-$ENVIRONMENT"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  
  echo -n "   Checking $TABLE_NAME... "
  
  if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" &>/dev/null; then
    PITR_STATUS=$(aws dynamodb describe-continuous-backups \
      --table-name "$TABLE_NAME" \
      --region "$REGION" \
      --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' \
      --output text 2>/dev/null || echo "DISABLED")
    
    if check_status "$PITR_STATUS"; then
      PASSED_CHECKS=$((PASSED_CHECKS + 1))
      echo "      Status: $PITR_STATUS"
    else
      echo "      Status: $PITR_STATUS (Expected: ENABLED)"
    fi
  else
    echo -e "${YELLOW}⚠ SKIP${NC} (Table not found)"
  fi
done
echo ""

# 2. Check AWS Backup Recovery Points
echo "2. Checking AWS Backup Recovery Points..."
VAULT_NAME="misra-platform-backup-vault-$ENVIRONMENT"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo -n "   Checking backup vault $VAULT_NAME... "

if aws backup describe-backup-vault --backup-vault-name "$VAULT_NAME" --region "$REGION" &>/dev/null; then
  RECOVERY_POINTS=$(aws backup list-recovery-points-by-backup-vault \
    --backup-vault-name "$VAULT_NAME" \
    --region "$REGION" \
    --query 'RecoveryPoints[?Status==`COMPLETED`]' \
    --output json 2>/dev/null | jq length)
  
  if check_status "$RECOVERY_POINTS"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo "      Recovery points: $RECOVERY_POINTS"
    
    # Show most recent backup
    LATEST_BACKUP=$(aws backup list-recovery-points-by-backup-vault \
      --backup-vault-name "$VAULT_NAME" \
      --region "$REGION" \
      --query 'RecoveryPoints[0].[CreationDate,ResourceType]' \
      --output text 2>/dev/null)
    echo "      Latest backup: $LATEST_BACKUP"
  else
    echo "      Recovery points: $RECOVERY_POINTS (Expected: > 0)"
  fi
else
  echo -e "${YELLOW}⚠ SKIP${NC} (Vault not found)"
fi
echo ""

# 3. Check S3 Versioning
echo "3. Checking S3 Bucket Versioning..."
BUCKET_NAME="misra-platform-files-$ENVIRONMENT-$ACCOUNT_ID"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo -n "   Checking bucket $BUCKET_NAME... "

if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" &>/dev/null; then
  VERSIONING=$(aws s3api get-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --query 'Status' \
    --output text 2>/dev/null || echo "DISABLED")
  
  if check_status "$VERSIONING"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo "      Versioning: $VERSIONING"
    
    # Check number of versions
    VERSION_COUNT=$(aws s3api list-object-versions \
      --bucket "$BUCKET_NAME" \
      --region "$REGION" \
      --max-items 100 \
      --query 'length(Versions)' \
      --output text 2>/dev/null || echo "0")
    echo "      Object versions: $VERSION_COUNT"
  else
    echo "      Versioning: $VERSIONING (Expected: Enabled)"
  fi
else
  echo -e "${YELLOW}⚠ SKIP${NC} (Bucket not found)"
fi
echo ""

# 4. Check S3 Cross-Region Replication
if [ "$ENVIRONMENT" == "production" ]; then
  echo "4. Checking S3 Cross-Region Replication..."
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  
  echo -n "   Checking replication for $BUCKET_NAME... "
  
  REPLICATION=$(aws s3api get-bucket-replication \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --query 'ReplicationConfiguration.Rules[0].Status' \
    --output text 2>/dev/null || echo "NOT_CONFIGURED")
  
  if check_status "$REPLICATION"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo "      Replication: $REPLICATION"
    
    # Show replication destination
    DEST_BUCKET=$(aws s3api get-bucket-replication \
      --bucket "$BUCKET_NAME" \
      --region "$REGION" \
      --query 'ReplicationConfiguration.Rules[0].Destination.Bucket' \
      --output text 2>/dev/null || echo "N/A")
    echo "      Destination: $DEST_BUCKET"
  else
    echo "      Replication: $REPLICATION (Expected: Enabled)"
    echo "      Note: Replication may need manual configuration"
  fi
  echo ""
fi

# 5. Check Lambda Function Versioning
echo "5. Checking Lambda Function Versioning..."
FUNCTIONS=("authorizer" "analysis" "file" "auth" "health-check")

for func in "${FUNCTIONS[@]}"; do
  FUNCTION_NAME="misra-platform-$func-$ENVIRONMENT"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  
  echo -n "   Checking $FUNCTION_NAME... "
  
  if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &>/dev/null; then
    VERSION_COUNT=$(aws lambda list-versions-by-function \
      --function-name "$FUNCTION_NAME" \
      --region "$REGION" \
      --query 'length(Versions)' \
      --output text 2>/dev/null || echo "0")
    
    if check_status "$VERSION_COUNT"; then
      PASSED_CHECKS=$((PASSED_CHECKS + 1))
      echo "      Versions: $VERSION_COUNT"
      
      # Check aliases
      ALIASES=$(aws lambda list-aliases \
        --function-name "$FUNCTION_NAME" \
        --region "$REGION" \
        --query 'Aliases[].Name' \
        --output text 2>/dev/null || echo "none")
      echo "      Aliases: $ALIASES"
    else
      echo "      Versions: $VERSION_COUNT (Expected: > 0)"
    fi
  else
    echo -e "${YELLOW}⚠ SKIP${NC} (Function not found)"
  fi
done
echo ""

# 6. Check Backup Plan
echo "6. Checking AWS Backup Plan..."
BACKUP_PLAN_NAME="misra-platform-backup-plan-$ENVIRONMENT"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo -n "   Checking backup plan... "

BACKUP_PLANS=$(aws backup list-backup-plans \
  --region "$REGION" \
  --query "BackupPlansList[?BackupPlanName=='$BACKUP_PLAN_NAME'].BackupPlanId" \
  --output text 2>/dev/null)

if [ -n "$BACKUP_PLANS" ]; then
  if check_status "ENABLED"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo "      Plan ID: $BACKUP_PLANS"
    
    # Get backup plan details
    BACKUP_PLAN_ID=$(echo "$BACKUP_PLANS" | awk '{print $1}')
    RULE_COUNT=$(aws backup get-backup-plan \
      --backup-plan-id "$BACKUP_PLAN_ID" \
      --region "$REGION" \
      --query 'length(BackupPlan.Rules)' \
      --output text 2>/dev/null || echo "0")
    echo "      Backup rules: $RULE_COUNT"
  fi
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "      Backup plan not found"
fi
echo ""

# 7. Check Backup Monitoring
echo "7. Checking Backup Monitoring..."
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo -n "   Checking EventBridge rules... "

FAILURE_RULE="misra-platform-backup-failure-$ENVIRONMENT"
SUCCESS_RULE="misra-platform-backup-success-$ENVIRONMENT"

FAILURE_RULE_EXISTS=$(aws events describe-rule \
  --name "$FAILURE_RULE" \
  --region "$REGION" \
  --query 'State' \
  --output text 2>/dev/null || echo "NOT_FOUND")

SUCCESS_RULE_EXISTS=$(aws events describe-rule \
  --name "$SUCCESS_RULE" \
  --region "$REGION" \
  --query 'State' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$FAILURE_RULE_EXISTS" == "ENABLED" ] && [ "$SUCCESS_RULE_EXISTS" == "ENABLED" ]; then
  if check_status "ENABLED"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo "      Failure rule: $FAILURE_RULE_EXISTS"
    echo "      Success rule: $SUCCESS_RULE_EXISTS"
  fi
else
  echo -e "${YELLOW}⚠ PARTIAL${NC}"
  echo "      Failure rule: $FAILURE_RULE_EXISTS"
  echo "      Success rule: $SUCCESS_RULE_EXISTS"
fi
echo ""

# Summary
echo "========================================="
echo "Verification Summary"
echo "========================================="
echo "Total checks: $TOTAL_CHECKS"
echo "Passed: $PASSED_CHECKS"
echo "Failed: $((TOTAL_CHECKS - PASSED_CHECKS))"
echo ""

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
  echo -e "${GREEN}✓ All backup configurations verified successfully!${NC}"
  exit 0
elif [ $PASSED_CHECKS -gt $((TOTAL_CHECKS / 2)) ]; then
  echo -e "${YELLOW}⚠ Some backup configurations need attention${NC}"
  exit 1
else
  echo -e "${RED}✗ Multiple backup configurations are missing or misconfigured${NC}"
  exit 2
fi
