#!/bin/bash

# Garmin integration setup script
echo "Setting up Garmin integration dependencies..."

# Create Python virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python requirements
echo "Installing Python requirements..."
pip install -r requirements-garmin.txt

# Create required directories
echo "Creating Python directory structure..."
mkdir -p src/python/garmin

echo "Garmin integration setup complete!"
echo "Users will be prompted to enter their Garmin credentials in the app settings."