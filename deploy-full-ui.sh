#!/bin/bash

# Deployment script for the full UI version of the Nutrition Tracker app

# Set the server alias (update this to match your SSH config)
SERVER="server"

# Set the remote directory
REMOTE_DIR="/mnt/Media/Docker/nutrition-tracker"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Deploying full UI version of Nutrition Tracker...${NC}"

# Step 1: Copy the updated files to the server
echo -e "${GREEN}Copying updated files to the server...${NC}"

# Create directories if they don't exist
ssh $SERVER "mkdir -p $REMOTE_DIR/frontend/src/services"

# Copy Dockerfile.web
echo "Copying Dockerfile.web..."
scp frontend/Dockerfile.web $SERVER:$REMOTE_DIR/frontend/

# Copy nginx.conf
echo "Copying nginx.conf..."
scp frontend/nginx.conf $SERVER:$REMOTE_DIR/frontend/

# Copy apiService.ts
echo "Copying apiService.ts..."
scp frontend/src/services/apiService.ts $SERVER:$REMOTE_DIR/frontend/src/services/

# Copy package.json
echo "Copying package.json..."
scp frontend/package.json $SERVER:$REMOTE_DIR/frontend/

# Copy docker-compose.web.yml
echo "Copying docker-compose.web.yml..."
scp docker-compose.web.yml $SERVER:$REMOTE_DIR/

# Step 2: Rebuild and restart the containers
echo -e "${GREEN}Rebuilding and restarting containers...${NC}"
ssh $SERVER "cd $REMOTE_DIR && docker compose -f docker-compose.web.yml up -d --build"

# Step 3: Check the logs
echo -e "${GREEN}Checking logs...${NC}"
ssh $SERVER "cd $REMOTE_DIR && docker compose -f docker-compose.web.yml logs --tail=50 frontend-web"

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${YELLOW}The application should be available at http://your-server-ip:4080${NC}"
echo -e "${YELLOW}If you encounter any issues, check the logs with:${NC}"
echo -e "ssh $SERVER \"cd $REMOTE_DIR && docker compose -f docker-compose.web.yml logs --tail=100\""