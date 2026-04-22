#!/bin/bash

# Reset user password in Cognito for autonomous workflow testing
# This script resets the password for sanjanar0011@gmail.com to TestPass123!@#

USER_POOL_ID="us-east-1_8H5k62Dxh"
EMAIL="sanjanar0011@gmail.com"
NEW_PASSWORD="TestPass123!@#"

echo "Resetting password for user: $EMAIL"
echo "User Pool ID: $USER_POOL_ID"

# Set permanent password (this will mark the user as CONFIRMED)
aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --password "$NEW_PASSWORD" \
  --permanent \
  --region us-east-1

if [ $? -eq 0 ]; then
  echo "✅ Password reset successfully!"
  echo "User: $EMAIL"
  echo "New Password: $NEW_PASSWORD"
  echo ""
  echo "You can now use this user for autonomous workflow testing."
else
  echo "❌ Failed to reset password"
  exit 1
fi
