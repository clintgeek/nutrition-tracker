# Nutrition Tracker - Development Context

## Current Development Focus

### Goal System Simplification
1. Remove GoalsScreen in favor of consolidated GoalScreen
2. Remove end_date from goals (making them open-ended)
3. Align all goal-related code with database column names:
   - daily_calorie_target
   - protein_target_grams
   - carbs_target_grams
   - fat_target_grams

### Camera Access Requirements
For barcode scanning functionality on web browsers:

1. **Web Permissions**:
   ```javascript
   // In BarcodeScanner.tsx
   const requestCameraPermission = async () => {
     try {
       // For web browsers
       if (Platform.OS === 'web') {
         const { state } = await navigator.permissions.query({ name: 'camera' });
         if (state === 'denied') {
           Alert.alert(
             'Camera Permission Required',
             'Please enable camera access in your browser settings to use the barcode scanner.'
           );
           return false;
         }
         const stream = await navigator.mediaDevices.getUserMedia({
           video: { facingMode: 'environment' }
         });
         return true;
       }

       // For native platforms
       const { status } = await BarCodeScanner.requestPermissionsAsync();
       return status === 'granted';
     } catch (error) {
       console.error('Error requesting camera permission:', error);
       return false;
     }
   };
   ```

2. **Required Meta Tags** (in `web/index.html`):
   ```html
   <meta name="theme-color" content="#000000">
   <meta name="apple-mobile-web-app-capable" content="yes">
   <meta name="apple-mobile-web-app-status-bar-style" content="black">
   <!-- Add this line for camera permissions -->
   <meta name="permissions-policy" content="camera=*">
   ```

3. **Expo Configuration** (in `app.json`):
   ```json
   {
     "expo": {
       "web": {
         "config": {
           "permissions": ["camera"]
         }
       },
       "plugins": [
         [
           "expo-barcode-scanner",
           {
             "cameraPermission": "Allow $(PRODUCT_NAME) to access camera."
           }
         ]
       ]
     }
   }
   ```

### PWA Implementation Requirements
To make the application installable as a Chrome browser app:

1. **Required Files**:
   - `manifest.json` in the public directory:
     ```json
     {
       "short_name": "Nutrition",
       "name": "Nutrition Tracker",
       "icons": [
         {
           "src": "favicon.ico",
           "sizes": "64x64",
           "type": "image/x-icon"
         },
         {
           "src": "logo192.png",
           "type": "image/png",
           "sizes": "192x192"
         },
         {
           "src": "logo512.png",
           "type": "image/png",
           "sizes": "512x512"
         }
       ],
       "start_url": ".",
       "display": "standalone",
       "theme_color": "#000000",
       "background_color": "#ffffff",
       "permissions": ["camera"]
     }
     ```
   - Service Worker for offline functionality
   - Various sized icons (at minimum 192x192 and 512x512)

2. **Technical Requirements**:
   - HTTPS enabled
   - Responsive design (already implemented)
   - Service worker registered
   - Valid web app manifest
   - Proper caching strategies for offline use
   - Camera permissions properly requested
   - Proper permissions-policy headers set

3. **Implementation Steps**:
   - Add manifest.json to the public directory
   - Create and register a service worker
   - Generate and add required icons
   - Update the frontend build process to include PWA assets
   - Test offline functionality
   - Implement proper caching strategies
   - Add camera permission handling
   - Configure proper CORS and CSP headers

4. **Build Configuration Updates**:
   ```bash
   # Add workbox-cli for service worker generation
   npm install --save-dev workbox-cli

   # Add PWA support to the expo project
   expo install expo-web-browser
   expo install expo-camera
   ```

5. **Nginx Configuration Update**:
   ```nginx
   # Add to the server block in nginx.conf
   add_header Permissions-Policy "camera=*";
   add_header Cross-Origin-Embedder-Policy "require-corp";
   add_header Cross-Origin-Opener-Policy "same-origin";
   ```

### Database Schema
```sql
CREATE TABLE nutrition_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  daily_calorie_target INTEGER NOT NULL DEFAULT 0,
  protein_target_grams INTEGER NOT NULL DEFAULT 0,
  carbs_target_grams INTEGER NOT NULL DEFAULT 0,
  fat_target_grams INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id VARCHAR(36) NOT NULL,
  is_deleted BOOLEAN DEFAULT false
);
```

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

### Docker Setup
- The application runs in Docker containers on the server
- Use `docker compose` (without the hyphen) for Docker Compose commands

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

## Deployment Procedures

### Backend Updates: Complete Rebuild

When updating backend files:

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

### Frontend Updates

When updating frontend files:

1. Copy files to the server:
   ```bash
   scp frontend/src/path/to/file.tsx server:/mnt/Media/Docker/nutrition-tracker/frontend/src/path/to/
   ```

2. Rebuild the frontend container:
   ```bash
   ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose stop frontend-web && docker compose rm -f frontend-web && docker compose up -d --build frontend-web"
   ```

3. Check logs for errors:
   ```bash
   ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose logs --tail=50 frontend-web"
   ```

## Common Commands

### Server Management
```bash
# View running containers
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose ps"

# View container logs
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose logs backend"

# Restart a container
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose restart backend"
```

### Database Operations
```bash
# Access the database
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose exec db psql -U nutrition_user -d nutrition_tracker"

# Run a SQL query
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose exec db psql -U nutrition_user -d nutrition_tracker -c 'SELECT * FROM nutrition_goals;'"
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
- Use curl to test API endpoints directly
- Inspect the database schema directly to confirm column names
- Use verbose mode (`curl -v`) to see the full request and response details