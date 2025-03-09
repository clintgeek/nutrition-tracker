# Nutrition Tracker Web Deployment Guide (Simplified)

This guide explains how to deploy the Nutrition Tracker application as a mobile-friendly web application using Docker with environment variables for credentials.

## Prerequisites

- Docker and Docker Compose installed on your server
- A domain name (optional, but recommended)
- Basic knowledge of server administration

## Deployment Steps

### 1. Clone the Repository

```bash
git clone https://github.com/clintgeek/nutrition-tracker.git
cd nutrition-tracker
```

### 2. Set Up Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit the `.env` file with your secure credentials:
```bash
nano .env
```

3. Update the following values:
   - `POSTGRES_USER`: The database username
   - `POSTGRES_PASSWORD`: A strong database password
   - `POSTGRES_DB`: The database name
   - `JWT_SECRET`: A secure random string for JWT token generation
     - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Port settings if needed (`FRONTEND_PORT`, `BACKEND_PORT`, `DATABASE_PORT`)

### 3. Create Docker Compose File

1. Copy the example Docker Compose file:
```bash
cp docker-compose.web.example.yml docker-compose.web.yml
```

2. The file is already configured to use environment variables from your `.env` file, so no additional changes are needed unless you want to customize the configuration.

### 4. Deploy with Docker Compose

```bash
docker-compose -f docker-compose.web.yml up -d
```

This will:
- Build the frontend as a mobile-friendly web application
- Deploy the backend API
- Set up the PostgreSQL database
- Start all services in detached mode

### 5. Access Your Application

Your application will be available at:
- http://your-server-ip:4080 (or your domain if configured)

The backend API will be available at:
- http://your-server-ip:4081/api

The PostgreSQL database will be available at:
- Port: 4082
- Username: nutrition_user (or as configured in .env)
- Password: As configured in your .env file
- Database: nutrition_tracker (or as configured in .env)

### 6. Setting Up a Domain (Optional)

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

## Authentication System

The Nutrition Tracker application uses JWT (JSON Web Tokens) for authentication. Here's what you need to know:

### How It Works

1. **User Registration**: Users create accounts with email and password
2. **User Login**: Users authenticate and receive a JWT token
3. **Protected Routes**: API endpoints require valid JWT tokens
4. **Token Storage**: Tokens are stored in the browser's localStorage

### Security Considerations

- **JWT Secret**: The `JWT_SECRET` environment variable is critical for security
  - Use a strong, random value (32+ characters)
  - Keep this secret secure and never expose it
  - If compromised, change it immediately (this will invalidate all existing tokens)

- **Token Expiration**: Tokens expire after a set period (default: 24 hours)
  - Users will need to log in again after expiration
  - This limits the damage if a token is compromised

- **HTTPS**: Always use HTTPS in production to protect tokens in transit

### Creating the First Admin User

After deployment, you'll need to create your first user:

1. Access the frontend application
2. Click on the "Login" tab in the navigation
3. Select "Register" and create your account
4. This first account can be used to access all features

## Security Information

### Environment Variables

Your application uses environment variables to manage sensitive information:

1. **Database Credentials**: Stored in .env file
   - Never commit your .env file to version control
   - Use strong, unique passwords in production

2. **JWT Secret**: Used for signing authentication tokens
   - Generate a secure random string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Store only in your .env file
   - If this is compromised, all user sessions can be hijacked

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
source .env
docker exec -t nutrition-tracker_db_1 pg_dump -U $POSTGRES_USER -W $POSTGRES_DB > backup.sql
# When prompted, enter the password from your .env file
```

### Connecting to the Database Directly

To connect to the PostgreSQL database from your local machine:

```bash
# Load environment variables
source .env

# Using psql client
psql -h your-server-ip -p $DATABASE_PORT -U $POSTGRES_USER -d $POSTGRES_DB
# When prompted, enter the password from your .env file
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

### Authentication Issues

If users are having trouble logging in:

1. **Check JWT Secret**: Verify the JWT_SECRET is set correctly in your .env file
2. **Check Backend Logs**: Look for authentication errors
   ```bash
   docker-compose -f docker-compose.web.yml logs backend | grep auth
   ```
3. **Clear Browser Data**: Have users clear their localStorage and cookies
4. **Check Network Requests**: Use browser dev tools to check for 401 errors

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