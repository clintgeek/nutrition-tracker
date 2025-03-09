# Nutrition Tracker - Development Context

## ⚠️ TOP PRIORITY: Current Task in Progress ⚠️

We are currently fixing the Goal API functionality. Here's what we've done and what still needs to be completed:

### Completed:
1. ✅ Fixed the database schema by removing old columns (`calories`, `protein_grams`, etc.) and keeping only the new columns (`daily_calorie_target`, `protein_target_grams`, etc.)
2. ✅ Updated the Goal.js model with all necessary methods (create, findById, getCurrent, getForDate, getAll, update, delete)
3. ✅ Verified that direct API calls to create goals work correctly

### Still Needs to be Done:
1. ❌ Fix the goalController.js file to properly handle errors and use the correct method names from the Goal model
   - The current error is: `Goal.getCurrent is not a function` when trying to retrieve the current goal
   - We need to update the controller to use try/catch blocks and properly handle errors
   - The controller should be updated to match the methods in the Goal model

2. ❌ Test all API endpoints to ensure they're working correctly:
   - GET /api/goals/current
   - GET /api/goals/date
   - GET /api/goals
   - POST /api/goals
   - PUT /api/goals/:id
   - DELETE /api/goals/:id

3. ❌ Verify that the frontend can successfully interact with the API

### Technical Notes:
- We've been having issues with direct file access to `/Volumes/Media/Docker/nutrition-tracker`
- We've tried using SSH to edit files directly on the server
- We've created scripts to update files and restart the backend container
- The auth token is stored in auth_token.txt locally and has been copied to /tmp/auth_token.txt on the server

### Next Steps:
1. Create a script that will update the goalController.js file on the server
2. Restart the backend container
3. Test all API endpoints
4. Verify frontend functionality

## Server & Environment Setup

### Development Environment
- **Development Machine**: Local development is done on a macOS machine
- **Server**: The application runs on a separate server machine
- **Server Access**: SSH access is available via the alias `server`
  ```bash
  ssh server
  ```

### Server Details
- **Server IP**: 192.168.1.17
- **Application Ports**:
  - Frontend: 4080
  - Backend: 4081
  - Database: 4082
- **Application URL**: http://192.168.1.17:4080

### Network Access
- **Network Path**: The Docker folder on the server can be accessed directly at:
  ```
  /Volumes/Media/Docker/nutrition-tracker
  ```
- This allows direct file editing without needing to use SSH or SCP

### Docker Setup
- The application runs in Docker containers on the server
- Use `docker compose` (without the hyphen) for Docker Compose commands

### Preferred Method for Backend Updates: Complete Rebuild

When updating backend files, it's important to do a complete rebuild of the backend container to ensure all changes are properly applied. This is especially important for changes to database models, controllers, and other core functionality.

#### Steps for Backend Updates:

1. Copy the updated backend files to the server:
   ```bash
   scp backend/src/path/to/file.js server:/mnt/Media/Docker/nutrition-tracker/backend/src/path/to/
   ```

2. Stop, remove, and rebuild the backend container:
   ```bash
   ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose stop backend && docker compose rm -f backend && docker compose up -d --build backend"
   ```

3. Check the logs to verify successful startup:
   ```bash
   ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose logs --tail=50 backend"
   ```

#### Benefits of Complete Rebuild:

- Ensures all changes are properly incorporated into the container
- Prevents issues with cached files or dependencies
- Provides a clean environment for the updated code
- Allows for proper initialization of database connections and other resources
- Reduces the risk of runtime errors due to partial updates

### Preferred Method for Frontend Updates: Using the update_frontend.sh Script

The most reliable and efficient way to deploy frontend changes to the server is using the `update_frontend.sh` script. This script handles all the necessary steps:

1. Creating temporary directories on the server
2. Copying updated frontend files to the server
3. Rebuilding and restarting the frontend container
4. Checking logs to ensure successful deployment

#### Usage:

```bash
./update_frontend.sh
```

### Database Access
- **Database Name**: nutrition_tracker
- **Database User**: nutrition_user
- **Database Password**: Tz7Jd$5pQ8vR2xH3bL9#mN6*kF4gS
- **Database Container**: nutrition-tracker-db-1

### Environment Variables
```
# Database Configuration
POSTGRES_USER=nutrition_user
POSTGRES_PASSWORD=Tz7Jd$5pQ8vR2xH3bL9#mN6*kF4gS
POSTGRES_DB=nutrition_tracker

# JWT Configuration
JWT_SECRET=qP3mK8sL5dF9gH2jN7bV4xZ6cR1tY0wU

# Port Configuration
FRONTEND_PORT=4080
BACKEND_PORT=4081
DATABASE_PORT=4082

# API Keys
USDA_API_KEY=jrHM0qobnLkHbRdSATHkU7sBaEqqXcB85R7rTPM7

# Environment
NODE_ENV=production
```

## Current Task: Fixing Goal Creation API

### Issue Description
When attempting to create a goal via the API, we encountered the following error:
```json
{"error":{"message":"column \"daily_calorie_target\" of relation \"nutrition_goals\" does not exist"}}
```

### Root Cause
There was a mismatch between the column names used in the backend code and the actual database schema:
- The backend code was using column names like `daily_calorie_target`, `protein_target_grams`, etc.
- The database table `nutrition_goals` had columns named `calories`, `protein_grams`, etc.

### Solution Implemented
We took a comprehensive approach to fix this issue:

1. **Database Schema Update**:
   - Added new columns to the `nutrition_goals` table to match the expected field names
   - Created a SQL script to add the missing columns and copy data from existing columns
   - Removed the old columns since the app isn't live yet and has no real users
   - Added NOT NULL constraints to the new columns

2. **Backend Code Update**:
   - Updated the Goal model to use the new column names consistently
   - Added all necessary methods (getCurrent, getForDate, getAll, update, delete)
   - Ensured proper error handling and data validation

### Current Status
- **API Testing**: The API now successfully creates and retrieves goals
- **Database Schema**: The `nutrition_goals` table now has only the new columns with proper constraints
- **Goal Model**: The Goal.js file has been updated with all necessary methods

### Verification
We've verified the solution through:
1. **Direct API Testing**: Using curl commands to create and retrieve goals
2. **Database Inspection**: Querying the database to confirm data is stored correctly
3. **Test Script**: Running a test script that creates goals and verifies they're saved

### API Response Format
The goal retrieval API now returns data in the following format:
```json
{
  "goals": [
    {
      "id": 25,
      "user_id": 2,
      "daily_calorie_target": 2600,
      "protein_target_grams": 160,
      "carbs_target_grams": 320,
      "fat_target_grams": 75,
      "start_date": "2025-02-01T00:00:00.000Z",
      "end_date": "2025-12-31T00:00:00.000Z",
      "sync_id": "b976e784-60da-4427-8249-1b926065d6e8",
      "is_deleted": false,
      "created_at": "2025-03-09T06:19:56.320Z",
      "updated_at": "2025-03-09T06:19:56.320Z"
    }
  ]
}
```

## Testing & Debugging Tools

### API Testing Scripts
We've created several scripts to test and debug the API:

1. **test_auth_and_goal.sh**: Tests authentication and goal creation
   ```bash
   ./test_auth_and_goal.sh
   ```

2. **test_goal_creation.sh**: Tests goal creation with verbose output
   ```bash
   ./test_goal_creation.sh
   ```

3. **test_goal_retrieval.sh**: Tests goal retrieval APIs
   ```bash
   ./test_goal_retrieval.sh
   ```

4. **check_goals_in_db.sh**: Checks the current state of goals in the database
   ```bash
   ./check_goals_in_db.sh
   ```

### Database Schema Scripts
We've created scripts to modify the database schema:

1. **run_sql_directly.sh**: Runs SQL commands directly on the database
   ```bash
   ./run_sql_directly.sh
   ```

2. **optimize_goals.sh**: Optimizes the nutrition_goals table by adding default values and triggers
   ```bash
   ./optimize_goals.sh
   ```

3. **remove_old_columns.sh**: Removes the old columns from the nutrition_goals table
   ```bash
   ./remove_old_columns.sh
   ```

4. **fix_current_goal.sh**: Fixes the getCurrent method in the Goal.js file
   ```bash
   ./fix_current_goal.sh
   ```

### Common Commands

#### Server Access & Management
```bash
# SSH into the server
ssh server

# View running containers
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose ps"

# View container logs
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose logs backend"

# Restart a container
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose restart backend"
```

#### Database Operations
```bash
# Access the database
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose exec db psql -U nutrition_user -d nutrition_tracker"

# Run a SQL query
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose exec db psql -U nutrition_user -d nutrition_tracker -c 'SELECT * FROM nutrition_goals;'"

# Execute a SQL file
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose exec db psql -U nutrition_user -d nutrition_tracker -f /path/to/file.sql"
```

#### File Transfer
```bash
# Copy a file to the server
scp local_file.txt server:/tmp/

# Copy a file from the server
scp server:/tmp/remote_file.txt ./

# Direct file access (preferred method)
cp local_file.txt /Volumes/Media/Docker/nutrition-tracker/path/to/destination/
```

## Project Structure

### Key Files
- **Backend Models**: `backend/src/models/`
- **Backend Controllers**: `backend/src/controllers/`
- **Frontend Services**: `frontend/src/services/`
- **Database Schema**: `backend/init-scripts/01-schema.sql`

### Database Schema
The `nutrition_goals` table now has the following structure:
```sql
CREATE TABLE nutrition_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  daily_calorie_target INTEGER NOT NULL DEFAULT 0,
  protein_target_grams INTEGER NOT NULL DEFAULT 0,
  carbs_target_grams INTEGER NOT NULL DEFAULT 0,
  fat_target_grams INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id VARCHAR(36) NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  date DATE
);
```

## Troubleshooting

### Common Issues
1. **Authentication Errors**: Check that you're using the correct token format (`Bearer <token>`)
2. **Database Connection Issues**: Verify the database credentials in the `.env` file
3. **Docker Command Not Found**: Use `docker compose` instead of `docker-compose`
4. **Permission Denied**: Ensure scripts are executable with `chmod +x script.sh`
5. **Invalid Token Errors**: The auth token might be expired, generate a new one

### Debugging Tips
- Check the backend logs for detailed error messages
- Use the test script to verify API functionality
- Inspect the database schema directly to confirm column names
- Test API endpoints directly with curl to isolate issues
- Use verbose mode (`curl -v`) to see the full request and response details

## Frontend Deployment Process

### Server-Side Deployment
- The frontend application is deployed as a static site on the server
- The built files are served by Nginx from `/usr/share/nginx/html/` in the `frontend-web` container
- To update the frontend, we need to:
  1. Make changes to the source code locally
  2. Build the application on the server
  3. Deploy the built files to the Nginx directory

### Server-Side Build Process
```bash
# SSH into the server
ssh server

# Navigate to the project directory
cd /mnt/Media/Docker/nutrition-tracker

# Update the source code (e.g., pull from git)
git pull

# Build the frontend
cd frontend
npm install
npm run build

# Deploy the built files to the Nginx directory
cd ..
docker compose cp frontend/web-build/ frontend-web:/usr/share/nginx/html/

# Restart the frontend container
docker compose restart frontend-web
```

### Direct File Editing
For quick fixes, you can edit files directly using the network path:
```bash
# Edit a file directly
nano /Volumes/Media/Docker/nutrition-tracker/frontend/src/screens/goals/GoalsScreen.tsx

# Rebuild and redeploy
cd /Volumes/Media/Docker/nutrition-tracker/frontend
npm run build
cd ..
docker compose cp frontend/web-build/ frontend-web:/usr/share/nginx/html/
docker compose restart frontend-web
```

First Thing:
We need to consolidate down to the goalScreen and its related support files and remove the goalsScreen. We need to look at the database schema. Let's remove end date from the goals, these are open ended goals. We need to modify the rest of all the goal files in the front end and backend to use the column names from the database to avoid confusion.