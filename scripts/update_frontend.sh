#!/bin/bash

# Set the server alias
SERVER="server"

# Set the remote directory
REMOTE_DIR="/mnt/Media/Docker/nutrition-tracker"

# Create temporary directories on the server
echo "Creating temporary directories on the server..."
ssh $SERVER "mkdir -p $REMOTE_DIR/frontend/src/services $REMOTE_DIR/frontend/src/screens/goals"

# Copy the updated frontend files to the server
echo "Copying updated frontend files to server..."
scp frontend/src/services/goalService.ts $SERVER:$REMOTE_DIR/frontend/src/services/
scp frontend/src/screens/goals/GoalsScreen.tsx $SERVER:$REMOTE_DIR/frontend/src/screens/goals/

# Rebuild and restart the frontend container
echo "Rebuilding and restarting the frontend container..."
ssh $SERVER "cd $REMOTE_DIR && docker compose down frontend-web && docker compose up -d --build frontend-web"

# Wait for the container to start and build the app
echo "Waiting for the container to start and build the app..."
sleep 10

# Check the logs to see if the build was successful
echo "Checking logs..."
ssh $SERVER "cd $REMOTE_DIR && docker compose logs --tail=50 frontend-web"

echo "Frontend update completed!"
echo "The application should be available at http://192.168.1.17:4080"
echo "If you encounter any issues, check the logs with:"
echo "ssh $SERVER \"cd $REMOTE_DIR && docker compose logs --tail=100 frontend-web\""