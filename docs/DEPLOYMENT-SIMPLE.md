# Nutrition Tracker Web Deployment Guide (Simplified)

This guide explains how to deploy the Nutrition Tracker application as a mobile-friendly web application using Docker with environment variables for credentials.

## Prerequisites

- Docker and Docker Compose installed on your server
- A domain name (optional, but recommended)
- Basic knowledge of server administration
- Python 3.8 or higher (for Garmin integration)

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
   - `ENABLE_GARMIN_API`: Set to `true` to enable Garmin API access
   - `ENABLE_GARMIN_API_IN_DEV`: Set to `false` to disable live API calls in development
   - `PYTHON_PATH`: Path to your Python executable (e.g., `/usr/bin/python3` or `/path/to/venv/bin/python3`)
   - Port settings if needed (`FRONTEND_PORT`, `BACKEND_PORT`, `DATABASE_PORT`)

### 3. Set Up Python Environment (for Garmin Integration)

1. Create a Python virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install required Python packages:
```bash
pip install -r backend/src/python/requirements.txt
```

3. Update the `PYTHON_PATH` in your `.env` file to point to the virtual environment:
```
PYTHON_PATH=/absolute/path/to/nutrition-tracker/venv/bin/python3
```

4. Verify the Python setup:
```bash
# Test if the garminconnect package is installed correctly
python3 -c "import garminconnect; print('Garmin Connect package installed successfully')"
```

### 4. Create Docker Compose File

1. Copy the example Docker Compose file:
```bash
cp docker-compose.web.example.yml docker-compose.web.yml
```

2. The file is already configured to use environment variables from your `.env` file, so no additional changes are needed unless you want to customize the configuration.

### 5. Deploy with Docker Compose

```bash
docker-compose -f docker-compose.web.yml up -d
```

This will:
- Build the frontend as a mobile-friendly web application
- Deploy the backend API
- Set up the PostgreSQL database
- Start all services in detached mode

### 6. Access Your Application

Your application will be available at:
- http://your-server-ip:4080 (or your domain if configured)

The backend API will be available at:
- http://your-server-ip:4081/api

The PostgreSQL database will be available at:
- Port: 4082
- Username: nutrition_user (or as configured in .env)
- Password: As configured in your .env file
- Database: nutrition_tracker (or as configured in .env)

### 7. Setting Up a Domain (Optional)

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

# Update Python dependencies (for Garmin integration)
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r backend/src/python/requirements.txt

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

# Garmin integration logs (look for Python process logs)
docker-compose -f docker-compose.web.yml logs backend | grep -i "garmin\|python"
```

### Checking Garmin API Status

To check if the Garmin API integration is working correctly:

```bash
# Check if the Garmin API is enabled
grep ENABLE_GARMIN_API .env

# Check if the Python path is correctly set
grep PYTHON_PATH .env

# Verify the Python executable exists and is accessible
ls -l $(grep PYTHON_PATH .env | cut -d= -f2)

# Check for Garmin connections in the database
source .env
docker exec -t nutrition-tracker_db_1 psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT * FROM garmin_connections;"
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

### Garmin Integration Issues

If the Garmin integration is not working correctly:

#### Python Environment Problems

```bash
# Check Python environment variables
grep PYTHON backend/.env

# Verify Python executable and packages
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -c "import garminconnect; print(garminconnect.__version__)"

# Check if the Python script exists
ls -l backend/src/python/garmin/garmin_service.py

# Try running the test function directly
cd backend/src/python/garmin
python garmin_service.py test_connection --help
```

#### Database Issues

```bash
# Check if the Garmin tables exist
source .env
docker exec -t nutrition-tracker_db_1 psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt garmin*"

# Check for data in the daily summaries table
docker exec -t nutrition-tracker_db_1 psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT COUNT(*) FROM garmin_daily_summaries;"
```

#### API Rate Limiting

If you're encountering rate limit errors from Garmin:

1. Temporarily disable the Garmin API in development mode to prevent further API calls:
   ```bash
   # Update the .env file
   sed -i 's/ENABLE_GARMIN_API_IN_DEV=true/ENABLE_GARMIN_API_IN_DEV=false/' .env

   # Restart the backend to apply changes
   docker-compose -f docker-compose.web.yml restart backend
   ```

2. Check the API call count in the logs:
   ```bash
   docker-compose -f docker-compose.web.yml logs backend | grep -i "rate limit"
   ```

3. Wait at least one hour before re-enabling API access.

#### Reset Garmin Connection

If a user's Garmin connection is malfunctioning, you can reset it:

```bash
# Connect to the database
source .env
docker exec -it nutrition-tracker_db_1 psql -U $POSTGRES_USER -d $POSTGRES_DB

# Inside the PostgreSQL prompt, run:
UPDATE garmin_connections SET is_active = false WHERE user_id = [USER_ID];
# Replace [USER_ID] with the actual user ID
```