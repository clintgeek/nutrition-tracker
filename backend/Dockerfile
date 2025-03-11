FROM node:16-alpine

WORKDIR /app

# Install build dependencies and postgresql-client
RUN apk add --no-cache --virtual .gyp python3 make g++ postgresql-client

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install bcrypt

# Remove build dependencies
RUN apk del .gyp

# Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
