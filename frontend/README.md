# Nutrition Tracker App - Frontend

This is the frontend for the Nutrition Tracker application, built with React Native and Expo.

## Features

- **Food Database**: Search and browse a comprehensive database of food items with nutritional information.
- **Barcode Scanning**: Quickly add foods by scanning product barcodes.
- **Food Logging**: Track your daily food intake with a simple and intuitive interface.
- **Nutrition Goals**: Set and monitor your calorie and macronutrient goals.
- **Progress Tracking**: View your nutrition history with charts and summaries.
- **Offline Support**: Use the app even without an internet connection.
- **Data Synchronization**: Seamlessly sync your data across multiple devices.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/nutrition-tracker.git
cd nutrition-tracker/frontend
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Start the development server
```bash
npm start
# or
yarn start
```

4. Open the app on your device or emulator
   - Use the Expo Go app on your physical device
   - Or use an iOS/Android emulator

## Project Structure

```
frontend/
├── src/
│   ├── assets/          # Images, fonts, and other static files
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # App screens
│   ├── services/        # API and other services
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── App.tsx              # Main app component
└── app.json             # Expo configuration
```

## Key Technologies

- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform for React Native
- **TypeScript**: Type-safe JavaScript
- **React Navigation**: Navigation library
- **React Native Paper**: Material Design components
- **Axios**: HTTP client
- **AsyncStorage**: Local storage solution
- **React Native Chart Kit**: Charting library

## Development

### Running Tests

```bash
npm test
# or
yarn test
```

### Building for Production

```bash
expo build:android
# or
expo build:ios
```

## Backend Integration

This frontend is designed to work with the Nutrition Tracker backend API. Make sure to set up the backend server before using all features of the app.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenFoodFacts for the food database
- USDA FoodData Central for nutritional information