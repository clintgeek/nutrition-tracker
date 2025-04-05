# Garmin Integration Guide

This guide explains how to set up and use the Garmin Connect integration within the Nutrition Tracker application.

## Overview

The Garmin integration allows users to:
- Connect their Garmin Connect account to the application
- Sync daily fitness summaries (steps, calories, activity minutes, etc.)
- View their fitness data alongside nutrition information
- Refresh data manually or automatically

## Architecture

The integration uses a multi-layered approach:

1. **Python Client**: A Python-based client that interacts with the Garmin Connect API
2. **Node.js Wrapper**: A JavaScript wrapper that communicates with the Python client
3. **Backend Services**: Express.js services that manage connections and data
4. **Frontend Components**: React Native components that display the fitness data

### Data Flow

1. User authenticates with Garmin Connect credentials
2. Backend stores the credentials securely
3. Python client fetches data from Garmin Connect API
4. Data is stored in the PostgreSQL database
5. Frontend requests and displays the data

## Setup Requirements

### Server Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- `garminconnect` Python package

### Installation Steps

1. Install Python requirements:
```bash
cd backend
pip install -r src/python/requirements.txt
```

2. Create required database tables (these should be created automatically during application startup):
```sql
CREATE TABLE IF NOT EXISTS garmin_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  encrypted_password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS garmin_daily_summaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_steps INTEGER,
  total_distance_meters FLOAT,
  total_calories INTEGER,
  active_calories INTEGER,
  bmr_calories INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  resting_heart_rate INTEGER,
  avg_stress_level INTEGER,
  floor_climbed INTEGER,
  minutes_sedentary INTEGER,
  minutes_lightly_active INTEGER,
  minutes_moderately_active INTEGER,
  minutes_highly_active INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);
```

3. Set required environment variables in your `.env` file:
```
# Garmin API settings
ENABLE_GARMIN_API=true
ENABLE_GARMIN_API_IN_DEV=false
PYTHON_PATH=/path/to/python/executable
```

## User Guide

### Connecting a Garmin Account

1. Navigate to the Fitness screen in the application
2. Click the "Connect to Garmin" button
3. Enter your Garmin Connect credentials
4. Click "Connect" to authorize the application

### Viewing Fitness Data

Once connected, the application will automatically fetch and display your fitness data:

1. **Daily Summary**: Steps, distance, calories, and activity minutes for the current day
2. **Connection Status**: Information about your Garmin connection and last sync time

### Refreshing Data

The application has several methods for refreshing fitness data:

1. **Automatic Refresh**: Data automatically refreshes when you open the app
2. **Pull to Refresh**: Pull down on the screen to refresh data
3. **Manual Force Refresh**: Use the "Force Refresh" button to bypass caching and fetch fresh data

### Development Mode

In development environments, you can toggle Garmin API access:

1. Navigate to Fitness Settings
2. Find the "Development Mode Settings" section
3. Toggle "Garmin API Calls" on or off
   - When disabled, the app will show data from the database but not make live API calls
   - This helps prevent hitting rate limits during development

## Data Model

### `garmin_connections`

Stores user connection information:

| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users table |
| username | VARCHAR | Garmin Connect username |
| encrypted_password | TEXT | Encrypted Garmin Connect password |
| is_active | BOOLEAN | Whether the connection is active |
| last_sync_time | TIMESTAMP | Last time data was synced |
| created_at | TIMESTAMP | Connection creation time |
| updated_at | TIMESTAMP | Connection update time |

### `garmin_daily_summaries`

Stores daily fitness summaries:

| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users table |
| date | DATE | Date of the summary |
| total_steps | INTEGER | Total steps for the day |
| total_distance_meters | FLOAT | Total distance in meters |
| total_calories | INTEGER | Total calories burned |
| active_calories | INTEGER | Calories from activity |
| bmr_calories | INTEGER | Basal metabolic rate calories |
| avg_heart_rate | INTEGER | Average heart rate |
| max_heart_rate | INTEGER | Maximum heart rate |
| resting_heart_rate | INTEGER | Resting heart rate |
| avg_stress_level | INTEGER | Average stress level |
| floor_climbed | INTEGER | Floors climbed |
| minutes_sedentary | INTEGER | Minutes of sedentary activity |
| minutes_lightly_active | INTEGER | Minutes of light activity |
| minutes_moderately_active | INTEGER | Minutes of moderate activity |
| minutes_highly_active | INTEGER | Minutes of vigorous activity |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Record update time |

## Technical Details

### Python Client

The Python client uses the `garminconnect` package to authenticate and fetch data from Garmin Connect.

Key functions:
- `authenticate`: Log in to Garmin Connect
- `get_stats`: Get daily statistics
- `get_profile`: Get user profile information

### API Rate Limits

Garmin Connect enforces rate limits to prevent abuse:
- Approximately 15 requests per hour
- Failed authentication after too many attempts

Our implementation includes:
- Caching to minimize API calls
- Smart refresh logic to only fetch data when needed
- Force refresh option that bypasses caching

### Caching System

To minimize API calls, the application implements a multi-level caching system:

1. **Backend In-Memory Cache**: Caches API responses for up to 15 minutes
2. **Database Cache**: Stores data persistently in the database
3. **Frontend Cache**: Uses AsyncStorage to track last fetch time

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Ensure your Garmin Connect credentials are correct
   - Check if you've hit rate limits (try again in an hour)
   - Verify your account doesn't have two-factor authentication enabled

2. **No Data Appears**
   - Check your Garmin Connect account for data
   - Verify the database connection is working
   - Make sure the Python environment is set up correctly

3. **Python Environment Issues**
   - Verify Python 3.8+ is installed
   - Ensure `garminconnect` package is installed
   - Check if the PYTHON_PATH environment variable is set correctly

4. **Rate Limit Errors**
   - Wait at least an hour before trying again
   - In development, toggle to use database data only
   - Use the "Debug" button to check connection status

## Security Considerations

The Garmin integration handles sensitive user credentials:

1. **Credential Storage**
   - Passwords are encrypted before storage
   - Access is limited to authenticated users
   - Credentials are only used for API access

2. **Data Privacy**
   - Fitness data is stored only for the authenticated user
   - Data is not shared with third parties
   - Users can disconnect their account at any time

## Future Enhancements

Planned enhancements for the Garmin integration:

1. **Activity-Based Calorie Adjustment**
   - Automatically adjust daily calorie targets based on activity level
   - Calculate additional calories from exercise

2. **Detailed Activity Tracking**
   - Show detailed breakdown of activities
   - Track workout-specific data

3. **Sleep Data Integration**
   - Display sleep duration and quality
   - Show correlation between sleep and nutrition

4. **Additional Fitness Metrics**
   - Body composition data
   - Heart rate variability
   - VO2 max and other performance metrics

## API Reference

### Backend Endpoints

- `GET /api/fitness/garmin/status`: Check Garmin connection status
- `POST /api/fitness/garmin/connect`: Connect to Garmin
- `POST /api/fitness/garmin/disconnect`: Disconnect from Garmin
- `GET /api/fitness/garmin/daily/:date`: Get daily summary for a specific date
- `GET /api/fitness/garmin/daily`: Get daily summaries for a date range
- `GET /api/fitness/garmin/dev-mode-status`: Check development mode status
- `POST /api/fitness/garmin/toggle-dev-mode`: Toggle development mode

### Frontend Services

- `checkGarminConnectionStatus()`: Check if user is connected to Garmin
- `connectToGarmin(username, password)`: Connect to Garmin
- `disconnectFromGarmin()`: Disconnect from Garmin
- `getGarminDailySummary(date)`: Get daily summary for a specific date
- `getGarminDailySummaries(startDate, endDate)`: Get daily summaries for a date range
- `forceRefreshGarminSummary(date)`: Force refresh summary for a specific date