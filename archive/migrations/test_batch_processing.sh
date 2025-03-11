#!/bin/bash

# Use the server's IP address
SERVER_IP="192.168.1.17"
BACKEND_PORT="4081"
BACKEND_URL="${SERVER_IP}:${BACKEND_PORT}"

# Use a somewhat unique food item that's likely to be in the USDA database
FOOD_ITEM="kiwi"

echo "First search for $FOOD_ITEM at $BACKEND_URL"
echo "This should query the USDA API and batch insert results to our database"
echo "-------------------------------------------------------------------"

# First search - should query the API and batch insert
curl -s "http://$BACKEND_URL/api/foods/search?query=$FOOD_ITEM&page=1&limit=5" | head -n 30

echo -e "\n\nWaiting 5 seconds before second search...\n"
sleep 5

echo "Second search for $FOOD_ITEM at $BACKEND_URL"
echo "This should retrieve results from our database without querying the API"
echo "-------------------------------------------------------------------"

# Second search - should use the database
curl -s "http://$BACKEND_URL/api/foods/search?query=$FOOD_ITEM&page=1&limit=5" | head -n 30

echo -e "\n\nNow let's check the logs to see if batch processing was used:"
ssh server "cd /mnt/Media/Docker/nutrition-tracker && docker compose -f docker-compose.web.yml logs backend --since 30s | grep -A 2 -B 2 \"Batch inserted\""

echo -e "\n\nTest completed!"