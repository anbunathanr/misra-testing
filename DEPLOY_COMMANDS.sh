#!/bin/bash

# MISRA Platform Production Deployment Script
# Run this script to deploy the production-ready system

set -e  # Exit on error

echo "🚀 MISRA Platform Production Deployment"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build Backend
echo -e "${YELLOW}Step 1: Building Backend...${NC}"
cd packages/backend
npm install
npm run build
echo -e "${GREEN}✓ Backend built successfully${NC}"
echo ""

# Step 2: Deploy Infrastructure
echo -e "${YELLOW}Step 2: Deploying Infrastructure...${NC}"
npm run deploy
echo -e "${GREEN}✓ Infrastructure deployed successfully${NC}"
echo ""

# Step 3: Build Frontend
echo -e "${YELLOW}Step 3: Building Frontend...${NC}"
cd ../frontend
npm install
npm run build
echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# Step 4: Deploy Frontend
echo -e "${YELLOW}Step 4: Deploying Frontend...${NC}"
npm run deploy
echo -e "${GREEN}✓ Frontend deployed successfully${NC}"
echo ""

# Success
echo -e "${GREEN}========================================"
echo "✅ Deployment Complete!"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Verify AWS SES is configured (internship head)"
echo "2. Run verification tests (see PRODUCTION_READY_SUMMARY.md)"
echo "3. Monitor CloudWatch logs"
echo "4. Test OTP email delivery"
echo "5. Test analysis workflow"
echo ""
echo "Documentation:"
echo "- PRODUCTION_READY_SUMMARY.md - Quick overview"
echo "- PRODUCTION_DEPLOYMENT_GUIDE.md - Detailed guide"
echo "- CRITICAL_FIXES_SUMMARY.md - Technical details"
echo ""
