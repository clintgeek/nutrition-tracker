#!/usr/bin/env python3
# Garmin service Python script
# This is a placeholder implementation for development purposes

import argparse
import json
import sys
import os
from datetime import datetime, timedelta
import traceback

# Import the garminconnect library
try:
    import garminconnect
except ImportError:
    sys.stderr.write("Error: garminconnect package not found. Install it with 'pip install garminconnect'\n")
    sys.exit(1)

# Define a clear error for rate limiting
RATE_LIMIT_ERROR = "Garmin API rate limit reached. Please try again later."

def get_client(username, password):
    """Get authenticated Garmin client."""
    try:
        # Initialize the client
        client = garminconnect.Garmin(username, password)

        # Try to authenticate
        client.login()
        return client
    except garminconnect.GarminConnectTooManyRequestsError as err:
        return {"error": RATE_LIMIT_ERROR, "status_code": 429}
    except (
        garminconnect.GarminConnectConnectionError,
        garminconnect.GarminConnectAuthenticationError
    ) as err:
        return {"error": str(err)}
    except Exception as e:
        return {"error": f"Unknown error: {str(e)}"}

def handle_garmin_request(func, *args, **kwargs):
    """Helper to handle Garmin API requests with common error handling"""
    try:
        print(f"Calling Garmin API function: {func.__name__} with args: {args}, kwargs: {kwargs}", file=sys.stderr)
        result = func(*args, **kwargs)
        print(f"Raw result from {func.__name__}: {type(result)}", file=sys.stderr)
        try:
            # Just for debugging, try to print the keys if it's a dict or the length if it's a list
            if isinstance(result, dict):
                print(f"  Result keys: {list(result.keys())}", file=sys.stderr)
                for key in result.keys():
                    print(f"  '{key}': {type(result[key])} = {result[key]}", file=sys.stderr)
            elif isinstance(result, list) and len(result) > 0:
                print(f"  List result with {len(result)} items", file=sys.stderr)
                if len(result) > 0:
                    first_item = result[0]
                    if isinstance(first_item, dict):
                        print(f"  First item keys: {list(first_item.keys())}", file=sys.stderr)
                        for key in first_item.keys():
                            print(f"    '{key}': {type(first_item[key])} = {first_item[key]}", file=sys.stderr)
        except Exception as debug_error:
            print(f"  Error in debug printing: {str(debug_error)}", file=sys.stderr)
        return result
    except garminconnect.GarminConnectTooManyRequestsError:
        print(f"Rate limit exceeded when calling {func.__name__}", file=sys.stderr)
        return {"error": RATE_LIMIT_ERROR, "status_code": 429}
    except Exception as e:
        print(f"Error in {func.__name__}: {str(e)}", file=sys.stderr)
        return None

def authenticate(username, password):
    """Authenticate with Garmin Connect"""
    try:
        client = get_client(username, password)
        if isinstance(client, dict) and "error" in client:
            return {"success": False, "error": client["error"]}
        return {"success": True, "message": "Authentication successful"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_profile(username, password):
    """Get user profile from Garmin Connect"""
    try:
        client = get_client(username, password)
        if isinstance(client, dict) and "error" in client:
            return {"error": client["error"]}

        # Get user profile
        return client.get_user_profile()
    except Exception as e:
        return {"error": str(e)}

def get_daily_summary(username, password, date):
    """Get daily summary from Garmin Connect"""
    try:
        client = get_client(username, password)
        if isinstance(client, dict) and "error" in client:
            return client

        print(f"Fetching Garmin stats for: {date}", file=sys.stderr)
        # Revert to using the standard get_stats method
        stats_data = client.get_stats(date)
        print(f"Raw stats_data type: {type(stats_data)}", file=sys.stderr)
        if isinstance(stats_data, dict):
            print(f"Raw stats_data keys: {list(stats_data.keys())}", file=sys.stderr)
        else:
            print(f"Raw stats_data value: {stats_data}", file=sys.stderr)

        # Initialize variables with defaults
        total_steps = 0
        total_distance_meters = 0
        total_calories = 0
        active_calories = 0
        bmr_calories = 0
        avg_stress_level = -1  # Use -1 to indicate no data, Garmin API seems to use this
        floor_climbed = 0
        minutes_sedentary = 0
        minutes_lightly_active = 0
        minutes_moderately_active = 0
        minutes_highly_active = 0
        min_heart_rate = 0
        max_heart_rate = 0
        resting_heart_rate = 0

        # Process data if it's a dictionary
        if isinstance(stats_data, dict):
            # Extract steps, distance, calories, default to 0 if key missing or None
            total_steps = stats_data.get("totalSteps", 0) or 0
            print(f"Found steps in stats data: {total_steps}", file=sys.stderr)

            total_distance_meters = stats_data.get("totalDistanceMeters", 0) or 0
            total_calories = stats_data.get("totalKilocalories", 0) or 0
            active_calories = stats_data.get("activeKilocalories", 0) or 0
            bmr_calories = stats_data.get("bmrKilocalories", 0) or 0
            avg_stress_level = stats_data.get("averageStressLevel", -1) # Default to -1 if missing
            floor_climbed = stats_data.get("floorsAscended", 0) or 0

            # Try to get minute values directly first, fall back to seconds conversion if not available
            sedentary_seconds = stats_data.get("sedentarySeconds", None)
            minutes_sedentary = stats_data.get("minutes_sedentary", stats_data.get("minutesSedentary"))
            if minutes_sedentary is None and sedentary_seconds is not None:
                minutes_sedentary = sedentary_seconds // 60
                print(f"Converted sedentary seconds to minutes: {minutes_sedentary}", file=sys.stderr)
            minutes_sedentary = minutes_sedentary or 0 # Default to 0 if still None

            # Try to get active minutes directly
            lightly_active_seconds = stats_data.get("activeSeconds", None)
            highly_active_seconds = stats_data.get("highlyActiveSeconds", None)

            minutes_lightly_active = stats_data.get("minutes_lightly_active", stats_data.get("minutesLightlyActive"))
            minutes_moderately_active = stats_data.get("minutes_moderately_active", stats_data.get("minutesModeratelyActive"))
            minutes_highly_active = stats_data.get("minutes_highly_active", stats_data.get("minutesHighlyActive"))

            # If no direct minutes, try to calculate from seconds
            if (minutes_lightly_active is None or minutes_moderately_active is None or minutes_highly_active is None) and lightly_active_seconds is not None:
                minutes_active_total = lightly_active_seconds // 60
                minutes_highly_calculated = (highly_active_seconds // 60) if highly_active_seconds is not None else 0

                if minutes_active_total > 0:
                    print(f"Converted active seconds to minutes: {minutes_active_total}", file=sys.stderr)
                    # If minutes are missing, estimate distribution
                    if minutes_highly_active is None:
                        minutes_highly_active = minutes_highly_calculated
                    if minutes_moderately_active is None:
                        # Estimate moderately active as a portion of remaining non-highly active time
                        remaining_active = minutes_active_total - (minutes_highly_active or 0)
                        minutes_moderately_active = int(remaining_active * 0.4)
                    if minutes_lightly_active is None:
                        minutes_lightly_active = minutes_active_total - (minutes_highly_active or 0) - (minutes_moderately_active or 0)

            # Default any remaining None values to 0
            minutes_lightly_active = minutes_lightly_active or 0
            minutes_moderately_active = minutes_moderately_active or 0
            minutes_highly_active = minutes_highly_active or 0

            # Get heart rate data if available, default to 0
            min_heart_rate = stats_data.get("minHeartRate", 0) or 0
            max_heart_rate = stats_data.get("maxHeartRate", 0) or 0
            resting_heart_rate = stats_data.get("restingHeartRate", 0) or 0

        elif isinstance(stats_data, list) and len(stats_data) > 0:
           # Handle cases where API might return a list (less common for stats)
            print(f"Received list data, processing first item", file=sys.stderr)
            first_item = stats_data[0]
            if isinstance(first_item, dict):
                total_steps = first_item.get("totalSteps", 0) or 0
                # ... (add similar extraction logic as above for list items if needed) ...
                pass # Placeholder
        else:
            print(f"No valid stats data found for {date}", file=sys.stderr)

        # Combine all data into our expected format
        summary = {
            "date": date,
            "total_steps": total_steps,
            "total_distance_meters": total_distance_meters,
            "total_calories": total_calories,
            "active_calories": active_calories,
            "bmr_calories": bmr_calories,
            "avg_heart_rate": min_heart_rate, # Note: API seems inconsistent, using min for avg
            "max_heart_rate": max_heart_rate,
            "resting_heart_rate": resting_heart_rate,
            "avg_stress_level": avg_stress_level,
            "floor_climbed": floor_climbed,
            "minutes_sedentary": minutes_sedentary,
            "minutes_lightly_active": minutes_lightly_active,
            "minutes_moderately_active": minutes_moderately_active,
            "minutes_highly_active": minutes_highly_active
        }

        # Log final summary before returning
        print(f"Final summary for {date}: {json.dumps(summary, indent=2)}", file=sys.stderr)
        return summary

    except Exception as e:
        print(f"Exception in get_daily_summary: {str(e)}", file=sys.stderr)
        print(f"Exception traceback: {traceback.format_exc()}", file=sys.stderr)
        return {"error": str(e)}

def get_daily_summaries(username, password, start_date, end_date=None):
    # REMOVED THIS FUNCTION - now handled day by day in getDailySummary service
    return {"error": "get_daily_summaries Python function is deprecated"}

# REMOVED get_activities and get_activity_details functions

def test_connection(username, password):
    """Test the connection to Garmin Connect"""
    try:
        client = get_client(username, password)
        if isinstance(client, dict) and "error" in client:
            return {"success": False, "error": client["error"]}

        # Get user profile as a test
        profile = client.get_user_profile()

        return {
            "success": True,
            "message": "Successfully authenticated with Garmin",
            "profile": {
                "id": profile.get("id", ""),
                "displayName": profile.get("displayName", ""),
                "fullName": profile.get("fullName", "")
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Garmin Connect API wrapper")
    parser.add_argument('command', help='API command to execute')
    parser.add_argument('--username', required=True, help='Garmin Connect username')
    parser.add_argument('--password', required=True, help='Garmin Connect password')
    # REMOVED activity related args
    parser.add_argument('--date', help='Date (YYYY-MM-DD)')

    args = parser.parse_args()

    try:
        if args.command == 'authenticate':
            result = authenticate(args.username, args.password)
        elif args.command == 'profile':
            result = get_profile(args.username, args.password)
        elif args.command == 'daily_summary':
            result = get_daily_summary(args.username, args.password, args.date)
        # REMOVED activity commands
        elif args.command == 'test_connection':
             result = test_connection(args.username, args.password)
        else:
            result = {"error": f"Unknown command: {args.command}"}

        # Print the result as JSON string to stdout
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()