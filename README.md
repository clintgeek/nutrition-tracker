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

## Deployment

See [DEPLOYMENT-SIMPLE.md](DEPLOYMENT-SIMPLE.md) for detailed deployment instructions.

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