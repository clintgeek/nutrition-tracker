# Nutrition Tracker

A mobile-friendly application for tracking food intake, setting calorie goals, and monitoring progress. The app features a comprehensive food database with barcode scanning capabilities, cross-device synchronization, and user accounts.

## Features

- User authentication and account management
- Food database with nutritional information
- Barcode scanning for quick food lookup
- Food logging with meal categorization
- Calorie and macronutrient goal setting
- Progress tracking and visualization
- Cross-device synchronization
- Custom food entry

## Technology Stack

### Backend
- Node.js with Express.js
- PostgreSQL database
- JWT authentication
- RESTful API

### Data Integration
- OpenFoodFacts API (primary, free)
- USDA FoodData Central API (fallback, free)

### Deployment
- Docker with Docker Compose
- Nginx reverse proxy

## Prerequisites

- Docker and Docker Compose
- Node.js (for development)
- Nginx reverse proxy (already set up)
- USDA FoodData Central API key (optional)

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/nutrition-tracker.git
   cd nutrition-tracker
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   # Database Configuration
   DB_USER=nutrition_user
   DB_PASSWORD=your_secure_password
   DB_NAME=nutrition_tracker

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_change_this_in_production

   # API Keys
   USDA_API_KEY=your_usda_api_key

   # Environment
   NODE_ENV=production
   ```

3. Build and start the Docker containers:
   ```
   docker-compose up -d
   ```

4. The API will be available at `http://localhost:3000`.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh token
- `GET /api/auth/me` - Get current user

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Update user password

### Food Database
- `GET /api/foods/search?query=` - Search food items
- `GET /api/foods/barcode/:barcode` - Get food item by barcode
- `POST /api/foods/custom` - Create custom food item
- `PUT /api/foods/custom/:id` - Update custom food item
- `DELETE /api/foods/custom/:id` - Delete custom food item
- `GET /api/foods/custom` - Get custom food items

### Food Logging
- `GET /api/logs?date=` - Get food logs for a specific date
- `POST /api/logs` - Create a new food log
- `PUT /api/logs/:id` - Update a food log
- `DELETE /api/logs/:id` - Delete a food log
- `GET /api/logs/summary?start_date=&end_date=` - Get food logs for a date range
- `GET /api/logs/daily-summary?date=` - Get daily summary

### Goals
- `GET /api/goals/current` - Get current goal
- `GET /api/goals/date?date=` - Get goal for a specific date
- `GET /api/goals` - Get all goals
- `POST /api/goals` - Create a new goal
- `PUT /api/goals/:id` - Update a goal
- `DELETE /api/goals/:id` - Delete a goal

### Synchronization
- `GET /api/sync/status?device_id=` - Get sync status
- `POST /api/sync` - Synchronize data

## Development

To run the application in development mode:

1. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.