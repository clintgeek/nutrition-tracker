# Nutrition Tracker - Mobile Web App

This document provides information about the web version of the Nutrition Tracker application, which is optimized for mobile browsers.

## Mobile Web App Features

The web version of Nutrition Tracker offers the same core functionality as the native app, with a responsive design optimized for mobile browsers:

- **Responsive Design**: Adapts to different screen sizes and orientations
- **Touch-Friendly UI**: Large touch targets and mobile-optimized interactions
- **Progressive Web App (PWA)**: Can be installed on home screens
- **Offline Support**: Core functionality works without an internet connection
- **Cross-Platform**: Works on iOS, Android, and desktop browsers

## Development

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI

### Running the Web Version Locally

```bash
# Install dependencies
npm install

# Start the web version
npm run web
```

This will start the development server and open the web version in your default browser.

### Building for Production

```bash
# Build the web version
npm run web:build
```

This will create a production-ready build in the `web-build` directory.

## Deployment

### Using Docker

The easiest way to deploy the web version is using Docker:

```bash
# Build and run the web version
docker build -f Dockerfile.web -t nutrition-tracker-web .
docker run -p 80:80 nutrition-tracker-web
```

For a complete deployment with backend and database, use Docker Compose:

```bash
docker-compose -f docker-compose.web.yml up -d
```

See the main `DEPLOYMENT.md` file for detailed deployment instructions.

## Web-Specific Considerations

### Browser Compatibility

The web app is compatible with:
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 16+

### Mobile Browser Optimizations

1. **Viewport Settings**: The app uses appropriate viewport settings to prevent unwanted zooming and ensure proper rendering on mobile devices.

2. **Touch Events**: All interactions are optimized for touch, with appropriate touch target sizes.

3. **Home Screen Installation**: Users can add the app to their home screen for a more app-like experience.

4. **Offline Support**: The app uses service workers to cache assets and data for offline use.

### Performance Optimizations

1. **Code Splitting**: The app uses code splitting to reduce initial load times.

2. **Asset Optimization**: Images and other assets are optimized for web delivery.

3. **Caching Strategy**: The app uses appropriate caching strategies for different types of assets.

## Differences from Native App

While the web version provides most of the functionality of the native app, there are some differences:

1. **Barcode Scanning**: Uses the device camera through the Web API, which may have limited compatibility on some browsers.

2. **Push Notifications**: Web push notifications have different capabilities and limitations compared to native notifications.

3. **Performance**: The web version may not be as performant as the native app, especially on lower-end devices.

4. **Offline Capabilities**: While the web app supports offline use, it has more limited offline capabilities compared to the native app.

## Troubleshooting

### Common Issues

1. **Camera Access**: If barcode scanning doesn't work, ensure your browser has permission to access the camera.

2. **Storage Issues**: If you encounter storage-related errors, try clearing your browser cache.

3. **Display Issues**: If the app doesn't display correctly, try refreshing the page or clearing your browser cache.

### Reporting Issues

If you encounter any issues with the web version, please report them on our GitHub repository with:
- Browser name and version
- Device type and operating system
- Steps to reproduce the issue
- Screenshots if applicable