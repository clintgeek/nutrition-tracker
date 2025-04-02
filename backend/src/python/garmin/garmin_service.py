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

def get_activities(username, password, start_date, end_date=None):
    """Get activities from Garmin Connect"""
    try:
        client = get_client(username, password)
        if isinstance(client, dict) and "error" in client:
            return {"error": client["error"]}

        # Format dates as required
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else start

        # Get activities for date range
        activities = client.get_activities_by_date(start.isoformat(), end.isoformat())

        # Transform data to match our expected format
        transformed_activities = []
        for activity in activities:
            transformed = {
                "activityId": str(activity.get("activityId", "")),
                "activityName": activity.get("activityName", ""),
                "activityType": activity.get("activityType", {}).get("typeKey", "").lower(),
                "startTime": activity.get("startTimeLocal", ""),
                "durationSeconds": activity.get("duration", 0),
                "distanceMeters": activity.get("distance", 0),
                "calories": activity.get("calories", 0),
                "avgHeartRate": activity.get("averageHR", 0),
                "maxHeartRate": activity.get("maxHR", 0),
                "steps": activity.get("steps", 0),
                "elevationGain": activity.get("elevationGain", 0)
            }
            transformed_activities.append(transformed)

        return transformed_activities
    except Exception as e:
        return {"error": str(e)}

def get_activity_details(username, password, activity_id):
    """Get activity details from Garmin Connect"""
    try:
        client = get_client(username, password)
        if isinstance(client, dict) and "error" in client:
            return {"error": client["error"]}

        # Get activity details
        activity = client.get_activity_details(activity_id)

        # Transform to match expected format
        transformed = {
            "activityId": activity_id,
            "details": activity
        }

        return transformed
    except Exception as e:
        return {"error": str(e)}

def get_daily_summary(username, password, date):
    """Get daily summary from Garmin Connect - optimized to reduce API calls"""
    try:
        client = get_client(username, password)
        if isinstance(client, dict) and "error" in client:
            return client  # Return the error directly

        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            return {"error": f"Invalid date format: {date}. Use YYYY-MM-DD."}

        # Get stats data - this contains all the information we need
        print(f"Fetching stats data for {date}...", file=sys.stderr)
        stats_data = handle_garmin_request(client.get_stats, date)
        print(f"Stats data type: {type(stats_data)}", file=sys.stderr)

        if stats_data:
            if isinstance(stats_data, dict):
                print(f"Stats data keys: {list(stats_data.keys())}", file=sys.stderr)
            elif isinstance(stats_data, list) and len(stats_data) > 0:
                print(f"Stats data is a list with {len(stats_data)} items", file=sys.stderr)
                if len(stats_data) > 0:
                    print(f"First item keys: {list(stats_data[0].keys()) if isinstance(stats_data[0], dict) else 'Not a dict'}", file=sys.stderr)
        else:
            print("No stats data returned", file=sys.stderr)
            return {"error": f"No fitness data available for {date}"}

        # If we hit rate limit, return immediately
        if isinstance(stats_data, dict) and stats_data.get("status_code") == 429:
            return stats_data

        # Extract total steps from stats_data
        total_steps = 0
        total_distance_meters = 0
        total_calories = 0
        active_calories = 0
        bmr_calories = 0
        avg_stress_level = 0
        floor_climbed = 0
        minutes_sedentary = 0
        minutes_active = 0
        minutes_highly_active = 0
        min_heart_rate = 0
        max_heart_rate = 0
        resting_heart_rate = 0

        # Extract data based on whether stats_data is a dictionary or a list
        if isinstance(stats_data, dict):
            # Extract steps, distance, calories
            total_steps = stats_data.get("totalSteps", stats_data.get("total_steps", 0))
            print(f"Found steps in stats data: {total_steps}", file=sys.stderr)

            total_distance_meters = stats_data.get("totalDistanceMeters", stats_data.get("total_distance_meters", 0))
            total_calories = stats_data.get("totalKilocalories", stats_data.get("total_calories", 0))
            active_calories = stats_data.get("activeKilocalories", stats_data.get("active_calories", 0))
            bmr_calories = stats_data.get("bmrKilocalories", stats_data.get("bmr_calories", 0))
            avg_stress_level = stats_data.get("averageStressLevel", stats_data.get("avg_stress_level", 0))
            floor_climbed = stats_data.get("floorsAscended", stats_data.get("floor_climbed", 0))

            # Try to get minute values directly first, fall back to seconds conversion if not available
            minutes_sedentary = stats_data.get("minutes_sedentary", stats_data.get("minutesSedentary", 0))
            if minutes_sedentary == 0 and "sedentarySeconds" in stats_data:
                minutes_sedentary = stats_data.get("sedentarySeconds", 0) // 60
                print(f"Converted sedentary seconds to minutes: {minutes_sedentary}", file=sys.stderr)

            # Try to get active minutes directly
            minutes_lightly_active = stats_data.get("minutes_lightly_active", stats_data.get("minutesLightlyActive", 0))
            minutes_moderately_active = stats_data.get("minutes_moderately_active", stats_data.get("minutesModeratelyActive", 0))
            minutes_highly_active = stats_data.get("minutes_highly_active", stats_data.get("minutesHighlyActive", 0))

            # If no direct minutes, try to calculate from seconds
            if minutes_lightly_active == 0 and minutes_moderately_active == 0 and minutes_highly_active == 0:
                minutes_active = stats_data.get("activeSeconds", 0) // 60
                if minutes_active > 0:
                    print(f"Converted active seconds to minutes: {minutes_active}", file=sys.stderr)
                    # Calculate moderately and lightly active minutes as a proportion (estimation)
                    minutes_highly_active = stats_data.get("highlyActiveSeconds", 0) // 60
                    moderately_active = int(minutes_active * 0.4)  # Estimate
                    lightly_active = minutes_active - minutes_highly_active - moderately_active
                    minutes_moderately_active = moderately_active
                    minutes_lightly_active = lightly_active

            # Get heart rate data if available
            min_heart_rate = stats_data.get("minHeartRate", stats_data.get("min_heart_rate", 0))
            max_heart_rate = stats_data.get("maxHeartRate", stats_data.get("max_heart_rate", 0))
            resting_heart_rate = stats_data.get("restingHeartRate", stats_data.get("resting_heart_rate", 0))

        elif isinstance(stats_data, list) and len(stats_data) > 0:
            first_item = stats_data[0]
            if isinstance(first_item, dict):
                # Extract steps, distance, calories
                total_steps = first_item.get("totalSteps", first_item.get("total_steps", 0))
                print(f"Found steps in stats list: {total_steps}", file=sys.stderr)

                total_distance_meters = first_item.get("totalDistanceMeters", first_item.get("total_distance_meters", 0))
                total_calories = first_item.get("totalKilocalories", first_item.get("total_calories", 0))
                active_calories = first_item.get("activeKilocalories", first_item.get("active_calories", 0))
                bmr_calories = first_item.get("bmrKilocalories", first_item.get("bmr_calories", 0))
                avg_stress_level = first_item.get("averageStressLevel", first_item.get("avg_stress_level", 0))
                floor_climbed = first_item.get("floorsAscended", first_item.get("floor_climbed", 0))

                # Try to get minute values directly first, fall back to seconds conversion if not available
                minutes_sedentary = first_item.get("minutes_sedentary", first_item.get("minutesSedentary", 0))
                if minutes_sedentary == 0 and "sedentarySeconds" in first_item:
                    minutes_sedentary = first_item.get("sedentarySeconds", 0) // 60
                    print(f"Converted sedentary seconds to minutes: {minutes_sedentary}", file=sys.stderr)

                # Try to get active minutes directly
                minutes_lightly_active = first_item.get("minutes_lightly_active", first_item.get("minutesLightlyActive", 0))
                minutes_moderately_active = first_item.get("minutes_moderately_active", first_item.get("minutesModeratelyActive", 0))
                minutes_highly_active = first_item.get("minutes_highly_active", first_item.get("minutesHighlyActive", 0))

                # If no direct minutes, try to calculate from seconds
                if minutes_lightly_active == 0 and minutes_moderately_active == 0 and minutes_highly_active == 0:
                    minutes_active = first_item.get("activeSeconds", 0) // 60
                    if minutes_active > 0:
                        print(f"Converted active seconds to minutes: {minutes_active}", file=sys.stderr)
                        # Calculate moderately and lightly active minutes as a proportion (estimation)
                        minutes_highly_active = first_item.get("highlyActiveSeconds", 0) // 60
                        moderately_active = int(minutes_active * 0.4)  # Estimate
                        lightly_active = minutes_active - minutes_highly_active - moderately_active
                        minutes_moderately_active = moderately_active
                        minutes_lightly_active = lightly_active

                # Get heart rate data if available
                min_heart_rate = first_item.get("minHeartRate", first_item.get("min_heart_rate", 0))
                max_heart_rate = first_item.get("maxHeartRate", first_item.get("max_heart_rate", 0))
                resting_heart_rate = first_item.get("restingHeartRate", first_item.get("resting_heart_rate", 0))

        # Print all the activity data we got directly for debugging
        print(f"Activity data extracted from Garmin API:", file=sys.stderr)
        print(f"  - Steps: {total_steps}", file=sys.stderr)
        print(f"  - Distance: {total_distance_meters} meters", file=sys.stderr)
        print(f"  - Calories: {total_calories} (active: {active_calories}, BMR: {bmr_calories})", file=sys.stderr)
        print(f"  - Minutes: sedentary={minutes_sedentary}, lightly={minutes_lightly_active}, " +
              f"moderately={minutes_moderately_active}, highly={minutes_highly_active}", file=sys.stderr)

        # If we have no meaningful data, indicate it
        if total_steps == 0 and total_distance_meters == 0 and total_calories == 0:
            return {"error": f"No fitness data available for {date}"}

        # Combine all data into our expected format
        summary = {
            "id": 0,  # This will be assigned by the database
            "user_id": 0,  # This will be assigned by the database
            "date": date,
            "total_steps": total_steps,
            "total_distance_meters": total_distance_meters,
            "total_calories": total_calories,
            "active_calories": active_calories,
            "bmr_calories": bmr_calories,
            "avg_heart_rate": min_heart_rate,
            "max_heart_rate": max_heart_rate,
            "resting_heart_rate": resting_heart_rate,
            "avg_stress_level": avg_stress_level,
            "floor_climbed": floor_climbed,
            "minutes_sedentary": minutes_sedentary,
            "minutes_lightly_active": minutes_lightly_active,
            "minutes_moderately_active": minutes_moderately_active,
            "minutes_highly_active": minutes_highly_active,
            "created_at": "",  # This will be assigned by the database
            "updated_at": ""   # This will be assigned by the database
        }

        print(f"Final summary: {json.dumps(summary, indent=2)}", file=sys.stderr)

        # Return the final JSON string, ensuring it's properly formatted
        return summary
    except Exception as e:
        print(f"Exception in get_daily_summary: {str(e)}", file=sys.stderr)
        print(f"Exception traceback: {traceback.format_exc()}", file=sys.stderr)
        return {"error": str(e)}

def get_daily_summaries(username, password, start_date, end_date=None):
    """Get daily summaries from Garmin Connect"""
    try:
        client = get_client(username, password)
        if isinstance(client, dict) and "error" in client:
            return {"error": client["error"]}

        # Format dates
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else start

        # Process each day in the range
        summaries = []
        current_date = start
        while current_date <= end:
            date_str = current_date.strftime("%Y-%m-%d")
            print(f"Processing date: {date_str}", file=sys.stderr)
            summary = get_daily_summary(username, password, date_str)
            if "error" not in summary:
                summaries.append(summary)
            current_date += timedelta(days=1)

        # Print array length for debugging
        print(f"Returning array with {len(summaries)} summaries", file=sys.stderr)

        # Return the array directly - the outer function will handle JSON serialization
        return summaries
    except Exception as e:
        print(f"Error in get_daily_summaries: {str(e)}", file=sys.stderr)
        return {"error": str(e)}

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
    parser.add_argument('--start-date', help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', help='End date (YYYY-MM-DD)')
    parser.add_argument('--activity-id', help='Activity ID')
    parser.add_argument('--date', help='Date (YYYY-MM-DD)')

    args = parser.parse_args()

    try:
        if args.command == 'authenticate':
            result = authenticate(args.username, args.password)
        elif args.command == 'profile':
            result = get_profile(args.username, args.password)
        elif args.command == 'activities':
            result = get_activities(args.username, args.password, args.start_date, args.end_date)
        elif args.command == 'activity_details':
            result = get_activity_details(args.username, args.password, args.activity_id)
        elif args.command == 'daily_summary':
            result = get_daily_summary(args.username, args.password, args.date)
        elif args.command == 'daily_summaries':
            result = get_daily_summaries(args.username, args.password, args.start_date, args.end_date)
        elif args.command == 'test':
            result = test_connection(args.username, args.password)
        else:
            result = {"error": f"Unknown command: {args.command}"}

        # Ensure we output clean JSON to stdout for the Node.js wrapper to parse
        print(json.dumps(result))
    except Exception as e:
        sys.stderr.write(f"Exception in main: {str(e)}\n")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()