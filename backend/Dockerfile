FROM node:18-alpine

# Install Python 3 and required dependencies
RUN apk add --no-cache python3 py3-pip bash

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci

# Copy application code
COPY . .

# Setup Python virtual environment
RUN python3 -m venv venv && \
    . venv/bin/activate && \
    pip install --no-cache-dir -r requirements-garmin.txt

# Set permissions on Python scripts
RUN chmod +x src/python/garmin/*.py

# Set Python path in environment
ENV PYTHON_PATH=/app/venv/bin/python3

# Expose port
EXPOSE 4081

# Start the application
CMD ["npm", "start"]
