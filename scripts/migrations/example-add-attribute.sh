#!/bin/bash
# Example migration: Add a new attribute to existing items
# This is a template - copy and modify for your specific migration needs

migrate() {
    local ENVIRONMENT=$1
    local TABLE_NAME="misra-platform-users-$ENVIRONMENT"
    
    echo "Adding 'role' attribute to all users in: $TABLE_NAME"
    
    # Scan all items
    ITEMS=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --projection-expression "userId" \
        --output json)
    
    # Count items
    ITEM_COUNT=$(echo "$ITEMS" | jq '.Items | length')
    echo "Found $ITEM_COUNT items to update"
    
    if [ "$ITEM_COUNT" -eq 0 ]; then
        echo "No items to update"
        return 0
    fi
    
    # Update each item
    UPDATED=0
    FAILED=0
    
    echo "$ITEMS" | jq -c '.Items[]' | while read -r item; do
        USER_ID=$(echo "$item" | jq -r '.userId.S')
        
        # Check if role already exists
        EXISTING_ROLE=$(aws dynamodb get-item \
            --table-name "$TABLE_NAME" \
            --key "{\"userId\": {\"S\": \"$USER_ID\"}}" \
            --projection-expression "role" \
            --output json 2>/dev/null | jq -r '.Item.role.S // empty')
        
        if [ -n "$EXISTING_ROLE" ]; then
            echo "  User $USER_ID already has role: $EXISTING_ROLE (skipping)"
            continue
        fi
        
        # Add default role
        aws dynamodb update-item \
            --table-name "$TABLE_NAME" \
            --key "{\"userId\": {\"S\": \"$USER_ID\"}}" \
            --update-expression "SET #role = :role" \
            --expression-attribute-names '{"#role": "role"}' \
            --expression-attribute-values '{":role": {"S": "user"}}' \
            --return-values UPDATED_NEW > /dev/null
        
        if [ $? -eq 0 ]; then
            echo "  ✓ Updated user: $USER_ID"
            ((UPDATED++))
        else
            echo "  ✗ Failed to update user: $USER_ID"
            ((FAILED++))
        fi
    done
    
    echo ""
    echo "Migration complete:"
    echo "  Updated: $UPDATED"
    echo "  Failed: $FAILED"
    
    if [ "$FAILED" -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# Rollback function (optional)
rollback() {
    local ENVIRONMENT=$1
    local TABLE_NAME="misra-platform-users-$ENVIRONMENT"
    
    echo "Rolling back: Removing 'role' attribute from all users in: $TABLE_NAME"
    
    # Scan all items
    ITEMS=$(aws dynamodb scan \
        --table-name "$TABLE_NAME" \
        --projection-expression "userId" \
        --output json)
    
    # Remove role attribute from each item
    echo "$ITEMS" | jq -c '.Items[]' | while read -r item; do
        USER_ID=$(echo "$item" | jq -r '.userId.S')
        
        aws dynamodb update-item \
            --table-name "$TABLE_NAME" \
            --key "{\"userId\": {\"S\": \"$USER_ID\"}}" \
            --update-expression "REMOVE #role" \
            --expression-attribute-names '{"#role": "role"}' > /dev/null
        
        echo "  ✓ Removed role from user: $USER_ID"
    done
    
    echo "Rollback complete"
    return 0
}
