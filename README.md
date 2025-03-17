# Nutrition Tracker

A mobile-friendly nutrition tracking application with food logging, calorie goals, and data synchronization.

## Features

- **Food Database**: Search and browse a comprehensive database of food items with nutritional information
- **Barcode Scanning**: Quickly add foods by scanning product barcodes
- **Food Logging**: Track your daily food intake with a simple and intuitive interface
- **Nutrition Goals**: Set and monitor your calorie and macronutrient goals
- **Progress Tracking**: View your nutrition history with charts and summaries
- **Offline Support**: Use the app even without an internet connection
- **Data Synchronization**: Seamlessly sync your data across multiple devices
- **User Authentication**: Secure user accounts with JWT-based authentication

## Technology Stack

- **Frontend**: React Native with Expo (web-optimized)
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Containerization**: Docker and Docker Compose
- **Authentication**: JWT-based authentication

## Documentation

Additional documentation is available in the `docs` directory:

- [Project Summary](docs/project-summary.md): Overview of the project structure and components
- [Nutrition Tracker Context](docs/NUTRITION-TRACKER-CONTEXT.md): Detailed context and background information
- [Todo List](docs/NUTRITION-TRACKER-TODO.md): Current development tasks and future enhancements
- [Weight Goals Implementation](docs/WEIGHT-GOALS-IMPLEMENTATION.md): Details on the weight tracking feature
- [Build Optimization Report](docs/BUILD-OPTIMIZATION-REPORT.md): Performance improvements and optimizations
- [Deployment Guide](docs/DEPLOYMENT-SIMPLE.md): Instructions for deploying the application
- [Food Search Enhancement Plan](docs/food-search-enhancement-plan.md): Plans for improving the food search functionality

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (for development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/clintgeek/nutrition-tracker.git
cd nutrition-tracker
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Edit the `.env` file with your secure credentials:
   - Generate a secure JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Update database credentials
   - Set API keys if needed

4. Start the application:

   For production (full Expo web app):
   ```bash
   docker compose -f docker-compose.web.yml up -d
   ```

   For development (Expo development server):
   ```bash
   docker compose up -d
   ```

5. Access the application:
   - Production Frontend: http://localhost:4080
   - Development Expo Server: http://localhost:19000
   - Backend API: http://localhost:4081/api
   - Database: localhost:4082

## Docker Compose Files

The project includes two Docker Compose configurations:

1. **docker-compose.yml** - Development configuration with the Expo development server
   - Use this for active development with hot reloading
   - Mounts source code as volumes for real-time changes
   - Exposes Expo development server ports

2. **docker-compose.web.yml** - Production configuration with the full Expo web app
   - Use this for production or testing the production build
   - Builds the Expo web app and serves it with Nginx
   - Optimized for performance and security

## Authentication System

The application uses JWT (JSON Web Tokens) for authentication:

### User Registration
- Users can create an account with name, email, and password
- Passwords are securely hashed before storage
- Upon successful registration, a JWT token is issued

### User Login
- Users can log in with their email and password
- Upon successful authentication, a JWT token is issued
- The token is stored in the browser's localStorage

### Protected Routes
- API endpoints that require authentication are protected
- The frontend includes the JWT token in the Authorization header
- Invalid or expired tokens result in authentication errors

### Token Management
- Tokens expire after a set period for security
- The frontend handles token expiration gracefully
- Users are redirected to login when their session expires

## Development

### Frontend Development

```bash
cd frontend
npm install
npm start
```

### Backend Development

```bash
cd backend
npm install
npm run dev
```

## Deployment Process

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

#### What the Script Does:

1. Creates temporary directories on the server
2. Copies updated frontend files to the server using `scp`
3. Stops and removes the existing frontend container
4. Rebuilds the Docker images for both backend and frontend
5. Starts the containers with the updated code
6. Checks the logs to verify successful startup

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

### Alternative Method: Manual Deployment

If you need to deploy specific files or make targeted changes, you can use the following manual process:

#### 1. Copy specific files to the server:

```bash
# For frontend files
scp frontend/src/path/to/file.ts server:/mnt/Media/Docker/nutrition-tracker/frontend/src/path/to/

# For backend files
scp backend/src/path/to/file.js server:/mnt/Media/Docker/nutrition-tracker/backend/src/path/to/
```

#### 2. Rebuild and restart containers on the server:

```bash
# SSH into the server
ssh server

# Navigate to the project directory
cd /mnt/Media/Docker/nutrition-tracker

# For frontend changes:
docker compose stop frontend-web
docker compose rm -f frontend-web
docker compose up -d --build frontend-web

# For backend changes:
docker compose stop backend
docker compose rm -f backend
docker compose up -d --build backend
```

#### 3. Check logs to verify successful deployment:

```bash
# Check frontend logs
docker compose logs --tail=50 frontend-web

# Check backend logs
docker compose logs --tail=50 backend
```

## Troubleshooting

If you encounter issues during deployment:

1. Check the Docker logs for error messages
2. Verify that all required files were copied correctly
3. Ensure all dependencies are installed
4. Check for syntax errors in your code
5. Verify network connectivity to the server

For persistent issues, you may need to:

```bash
# Remove all containers and rebuild from scratch
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose down && docker compose up -d --build"
```

## Security

- Never commit your `.env` file to version control
- Use strong, unique passwords in production
- Regularly update dependencies to patch security vulnerabilities
- Generate a secure random string for your JWT_SECRET
- Set appropriate CORS policies in production

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenFoodFacts for the food database
- USDA FoodData Central for nutritional information