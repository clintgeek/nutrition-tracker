FROM node:16-alpine

WORKDIR /app

# Install build dependencies and postgresql-client
RUN apk add --no-cache --virtual .gyp python3 make g++ postgresql-client

# Add npmrc with more aggressive settings
RUN echo "registry=http://registry.npmjs.org/" > ~/.npmrc && \
    echo "strict-ssl=false" >> ~/.npmrc && \
    echo "loglevel=verbose" >> ~/.npmrc && \
    echo "fetch-retries=5" >> ~/.npmrc

# Copy package files
COPY package*.json ./

# Configure npm and clean cache
RUN npm config set registry=http://registry.npmjs.org/ && \
    npm config set strict-ssl=false && \
    npm cache clean --force

# Install dependencies
RUN npm install --no-audit --no-fund --network-timeout=100000
RUN npm install bcrypt --no-audit --no-fund

# Remove build dependencies
RUN apk del .gyp

# Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
