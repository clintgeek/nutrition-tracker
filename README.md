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

3. Edit the `.env` file with your secure credentials

4. Create your Docker Compose file:
```bash
cp docker-compose.web.example.yml docker-compose.web.yml
```

5. Start the application:
```bash
docker-compose -f docker-compose.web.yml up -d
```

6. Access the application:
- Frontend: http://localhost:4080
- Backend API: http://localhost:4081/api
- Database: localhost:4082

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenFoodFacts for the food database
- USDA FoodData Central for nutritional information