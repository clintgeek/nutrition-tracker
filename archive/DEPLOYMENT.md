# Nutrition Tracker Web Deployment Guide

This guide explains how to deploy the Nutrition Tracker application as a mobile-friendly web application using Docker.

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

### 2. Configure Environment Variables (IMPORTANT)

For security reasons, sensitive information like database credentials should never be hardcoded in your docker-compose files. Instead, use environment variables.

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit the `.env` file with your secure credentials:
```bash
# Use a secure password generator for these values
POSTGRES_USER=your_secure_username
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=nutrition_tracker

# Generate a secure random string for JWT_SECRET
# You can use: openssl rand -base64 32
JWT_SECRET=your_secure_jwt_secret

NODE_ENV=production
```

⚠️ **SECURITY WARNING**:
- Never commit your `.env` file to version control
- Use strong, unique passwords for production environments
- Regularly rotate your credentials
- Restrict access to your `.env` file on the server

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
- http://your-server-ip (or your domain if configured)

The backend API will be available at:
- http://your-server-ip:3000/api

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
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Mobile-Friendly Features

The web application is optimized for mobile devices with:

1. Responsive design that adapts to different screen sizes
2. Touch-friendly UI elements
3. PWA capabilities for home screen installation
4. Offline functionality for core features

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
# Use the credentials from your .env file
docker exec -t nutrition-tracker_db_1 pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
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

### Environment Variable Issues

If your environment variables aren't being applied:

```bash
# Check if your .env file is being loaded
docker-compose -f docker-compose.web.yml config

# Verify the environment variables in a running container
docker exec nutrition-tracker_backend_1 env | grep POSTGRES
```