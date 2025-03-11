#!/bin/bash

# Copy the SQL file to the server
echo "Copying SQL file to server..."
scp remove_end_date.sql server:/tmp/

# Run the SQL script on the server
echo "Running SQL script on the server..."
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose exec -T db psql -U nutrition_user -d nutrition_tracker -f /tmp/remove_end_date.sql"

# Copy the updated files to the server
echo "Copying updated files to server..."
ssh server "mkdir -p /tmp/nutrition-tracker-sync/backend/src/models /tmp/nutrition-tracker-sync/backend/src/controllers /tmp/nutrition-tracker-sync/backend/src/routes"

# Copy the model, controller, and routes files
scp backend/src/models/Goal.js server:/tmp/nutrition-tracker-sync/backend/src/models/
scp backend/src/controllers/goalController.js server:/tmp/nutrition-tracker-sync/backend/src/controllers/
scp backend/src/routes/goalRoutes.js server:/tmp/nutrition-tracker-sync/backend/src/routes/

# Copy the files to the actual application directory
echo "Updating application files on server..."
ssh server "cp -f /tmp/nutrition-tracker-sync/backend/src/models/Goal.js /mnt/Media/Docker/nutrition-tracker/backend/src/models/ && \
            cp -f /tmp/nutrition-tracker-sync/backend/src/controllers/goalController.js /mnt/Media/Docker/nutrition-tracker/backend/src/controllers/ && \
            cp -f /tmp/nutrition-tracker-sync/backend/src/routes/goalRoutes.js /mnt/Media/Docker/nutrition-tracker/backend/src/routes/"

# Restart the backend container
echo "Restarting backend container..."
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose restart backend"

echo "Schema update completed!"