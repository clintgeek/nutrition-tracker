# Nutrition Tracker Web Deployment Guide (Simplified)

This guide explains how to deploy the Nutrition Tracker application as a mobile-friendly web application using Docker with direct credentials.

## Prerequisites

- Docker and Docker Compose installed on your server
- A domain name (optional, but recommended)
- Basic knowledge of server administration

## Deployment Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/nutrition-tracker.git
cd nutrition-tracker
```

### 2. Customize Your Credentials (Optional)

If you want to change the default credentials in the docker-compose.web.yml file:

1. Open the file:
```bash
nano docker-compose.web.yml
```

2. Update the following values with your preferred credentials:
   - `POSTGRES_USER`: The database username (currently "nutrition_user")
   - `POSTGRES_PASSWORD`: The database password (currently a secure generated password)
   - `JWT_SECRET`: The secret key for JWT token generation (currently a secure random string)

Make sure to update both the database environment variables AND the backend DATABASE_URL to match.

### 3. Deploy with Docker Compose

```bash
docker-compose -f docker-compose.web.yml up -d
```

This will:
- Build the frontend as a mobile-friendly web application
- Deploy the backend API
- Set up the PostgreSQL database
- Start all services in detached mode

### 4. Access Your Application

Your application will be available at:
- http://your-server-ip:4080 (or your domain if configured)

The backend API will be available at:
- http://your-server-ip:4081/api

The PostgreSQL database will be available at:
- Port: 4082
- Username: nutrition_user
- Password: jK8p$2xL9#Qr7ZvT5yE3bN6*mW4dF
- Database: nutrition_tracker

### 5. Setting Up a Domain (Optional)

For a production deployment, you should set up a domain name with HTTPS:

1. Configure your domain's DNS to point to your server
2. Set up a reverse proxy (like Nginx or Traefik) to handle HTTPS
3. Obtain SSL certificates (e.g., using Let's Encrypt)

Example Nginx configuration for your domain:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:4080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Security Information

### Credentials Summary

Your application is configured with the following secure credentials:

1. **Database Password**: `jK8p$2xL9#Qr7ZvT5yE3bN6*mW4dF`
   - Used for PostgreSQL authentication
   - 28 characters with mixed case, numbers, and special characters

2. **JWT Secret**: `eT7pM3kR8sL2gF9dH5jN6bV1cX4zQ0yU`
   - Used for signing authentication tokens
   - 32 characters of random alphanumeric characters

Keep these credentials secure and do not share them with unauthorized individuals.

## Maintenance

### Updating the Application

To update your application with the latest changes:

```bash
# Pull the latest code
git pull

# Rebuild and restart the containers
docker-compose -f docker-compose.web.yml up -d --build
```

### Backing Up the Database

To back up your PostgreSQL database:

```bash
# Use the credentials from your docker-compose file
docker exec -t nutrition-tracker_db_1 pg_dump -U nutrition_user -W nutrition_tracker > backup.sql
# When prompted, enter the password: jK8p$2xL9#Qr7ZvT5yE3bN6*mW4dF
```

### Connecting to the Database Directly

To connect to the PostgreSQL database from your local machine:

```bash
# Using psql client
psql -h your-server-ip -p 4082 -U nutrition_user -d nutrition_tracker
# When prompted, enter the password: jK8p$2xL9#Qr7ZvT5yE3bN6*mW4dF

# Using a database management tool
# Host: your-server-ip
# Port: 4082
# Username: nutrition_user
# Password: jK8p$2xL9#Qr7ZvT5yE3bN6*mW4dF
# Database: nutrition_tracker
```

### Monitoring Logs

To view logs from your containers:

```bash
# All services
docker-compose -f docker-compose.web.yml logs

# Specific service
docker-compose -f docker-compose.web.yml logs frontend-web
```

## Troubleshooting

### Frontend Issues

If the frontend is not loading properly:

```bash
# Check the frontend container logs
docker-compose -f docker-compose.web.yml logs frontend-web

# Rebuild the frontend container
docker-compose -f docker-compose.web.yml up -d --build frontend-web
```

### Backend Issues

If the API is not responding:

```bash
# Check the backend container logs
docker-compose -f docker-compose.web.yml logs backend

# Restart the backend container
docker-compose -f docker-compose.web.yml restart backend
```

### Database Issues

If there are database connection problems:

```bash
# Check the database container logs
docker-compose -f docker-compose.web.yml logs db

# Check if the database container is running
docker ps | grep nutrition-tracker_db
```

### Password Issues

If you need to change the database password:

1. Update both occurrences in docker-compose.web.yml:
   - The `POSTGRES_PASSWORD` environment variable in the db service
   - The `DATABASE_URL` environment variable in the backend service

2. Restart the services:
```bash
docker-compose -f docker-compose.web.yml down
docker-compose -f docker-compose.web.yml up -d
```

## Setup

1. Copy the example configuration:
   ```
   cp docker-compose.web.example.yml docker-compose.web.yml
   ```

2. Edit docker-compose.web.yml to add your secure credentials:
   - Replace `your_secure_password_here` with a strong password
   - Replace `your_jwt_secret_here` with a secure random string