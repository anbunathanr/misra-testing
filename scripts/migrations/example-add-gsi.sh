#!/bin/bash
# Example migration: Add a Global Secondary Index to a table
# This is a template - copy and modify for your specific migration needs

migrate() {
    local ENVIRONMENT=$1
    local TABLE_NAME="misra-platform-users-$ENVIRONMENT"
    
    echo "Adding GSI to table: $TABLE_NAME"
    
    # Check if GSI already exists
    EXISTING_GSI=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --query "Table.GlobalSecondaryIndexes[?IndexName=='status-index'].IndexName" \
        --output text)
    
    if [ -n "$EXISTING_GSI" ]; then
        echo "GSI 'status-index' already exists, skipping..."
        return 0
    fi
    
    # Add the GSI
    aws dynamodb update-table \
        --table-name "$TABLE_NAME" \
        --attribute-definitions \
            AttributeName=status,AttributeType=S \
            AttributeName=createdAt,AttributeType=S \
        --global-secondary-index-updates \
            "[{
                \"Create\": {
                    \"IndexName\": \"status-index\",
                    \"KeySchema\": [
                        {\"AttributeName\": \"status\", \"KeyType\": \"HASH\"},
                        {\"AttributeName\": \"createdAt\", \"KeyType\": \"RANGE\"}
                    ],
                    \"Projection\": {
                        \"ProjectionType\": \"ALL\"
                    },
                    \"ProvisionedThroughput\": {
                        \"ReadCapacityUnits\": 5,
                        \"WriteCapacityUnits\": 5
                    }
                }
            }]"
    
    echo "Waiting for GSI to be created..."
    aws dynamodb wait table-exists --table-name "$TABLE_NAME"
    
    echo "GSI created successfully"
    return 0
}

# Rollback function (optional)
rollback() {
    local ENVIRONMENT=$1
    local TABLE_NAME="misra-platform-users-$ENVIRONMENT"
    
    echo "Rolling back: Removing GSI from table: $TABLE_NAME"
    
    aws dynamodb update-table \
        --table-name "$TABLE_NAME" \
        --global-secondary-index-updates \
            "[{
                \"Delete\": {
                    \"IndexName\": \"status-index\"
                }
            }]"
    
    echo "Waiting for GSI to be deleted..."
    aws dynamodb wait table-exists --table-name "$TABLE_NAME"
    
    echo "GSI removed successfully"
    return 0
}
