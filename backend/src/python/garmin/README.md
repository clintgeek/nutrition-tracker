# Garmin Integration

This directory contains the Python scripts needed for the Garmin Connect integration.

## Overview

The integration follows a per-user credential approach rather than using global credentials. This means:

1. Each user provides their own Garmin Connect username and password
2. Credentials are stored securely in the database linked to the user's account
3. When syncing data, the system uses the specific user's credentials

## Implementation Details

The integration uses the [python-garminconnect](https://github.com/cyberjunky/python-garminconnect) library to interact with the Garmin Connect API. This library provides a comprehensive set of functions to access various types of fitness data from Garmin Connect.

### Features
- Authentication with Garmin Connect using user credentials
- Fetching activities, daily summaries, and user profiles
- Rate limiting and caching to prevent API limits
- Optimized data fetching by retrieving only newer data

## Database Schema

The `garmin_connections` table stores the connection information with the following key fields:

- `user_id`: Links to the nutrition tracker user
- `username`: User's Garmin Connect username
- `password`: User's Garmin Connect password
- `is_active`: Whether the connection is currently active
- `last_sync_time`: When data was last synced

## Authentication Flow

1. User enters their Garmin Connect credentials in the app
2. System verifies the credentials by attempting to authenticate with Garmin
3. If successful, credentials are saved to the database
4. For subsequent syncs, credentials are retrieved from the database

## Setup Instructions

1. Create a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   ```

2. Install the required packages:
   ```bash
   pip install garminconnect
   ```

## API Rate Limiting

The integration includes built-in rate limiting and caching to prevent exceeding Garmin's API limits:

- Authentication calls are limited to 5 per hour per user
- Activity fetches are limited to 15 per hour per user
- Results are cached with appropriate TTLs
- Only new data is fetched, optimized by date ranges

## Troubleshooting

If you encounter issues with the Garmin integration:

1. Check if the user has provided valid credentials
2. Verify the Python environment is correctly set up
3. Look for rate limiting errors in the logs
4. Ensure the database schema matches the expected structure