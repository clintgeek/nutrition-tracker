# Nutrition Tracking App Development Plan

## Project Overview

A mobile-friendly application for a small group of users to track food intake, set calorie goals, and monitor progress. The app will feature a comprehensive food database with barcode scanning capabilities, cross-device synchronization, and user accounts.

## Technology Stack

### Backend
- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL for structured data storage
- **Authentication**: JWT-based authentication
- **API**: RESTful API with versioning

### Frontend
- **Framework**: React Native for cross-platform mobile development (iOS and Android)
- **State Management**: Redux or Context API
- **UI Components**: Native Base or similar component library
- **Navigation**: React Navigation

### Data Integration
- **Food Database**: OpenFoodFacts API (primary, free) with USDA FoodData Central API (fallback, free)
- **Barcode Scanning**: React Native Camera with ML Kit or ZXing
- **Data Synchronization**: Timestamp-based sync with conflict resolution

### Deployment
- **Containerization**: Docker with Docker Compose
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL in Docker container
- **Persistence**: Docker volumes for data persistence

## Free/Low-Cost Food Database Options

### OpenFoodFacts API (Primary)
- **Cost**: 100% Free and open-source
- **Features**:
  - Extensive database with over 2 million food products
  - Excellent barcode scanning support
  - Nutritional information, ingredients, allergens
  - Community-maintained and constantly growing
  - No API key required for basic usage
  - No rate limits that would affect 2-3 users
- **Implementation**: Simple REST API with endpoints for product lookup by barcode, name search, etc.
- **Example Endpoint**: `https://world.openfoodfacts.org/api/v0/product/[barcode].json`

### USDA FoodData Central API (Fallback)
- **Cost**: Free with API key (up to 3,600 requests per hour)
- **Features**:
  - Comprehensive nutritional information
  - Government-maintained data (high quality)
  - Detailed nutrient breakdowns
  - Regular updates with new foods
- **Limitation**: Less support for barcode scanning, better for nutritional data
- **Implementation**: Register for a free API key at https://fdc.nal.usda.gov/api-key-signup.html

### Local Caching Strategy
- Cache results locally to reduce API calls
- Implement a local database of frequently used foods
- Allow users to add custom foods that are stored locally

## Development Roadmap (Optimized for 15-20 Premium Requests)

### Request 1: System Architecture and Database Schema

#### Backend Structure
- Server configuration
- API route structure
- Authentication flow
- Error handling middleware

#### Database Schema
- User table
- Food items table
- User food logs table
- Goals and progress table
- Custom food entries table
- Sync metadata table

#### API Endpoints Documentation
- Authentication endpoints
- User management endpoints
- Food database endpoints
- Food logging endpoints
- Goal tracking endpoints
- Synchronization endpoints

### Request 2: User Authentication and Account Management

#### User Authentication System
- Registration functionality
- Login/logout functionality
- Password reset flow
- JWT token management
- Refresh token mechanism

#### User Profile Management
- Profile creation and editing
- User preferences storage
- Settings management
- Account deletion process

#### Security Considerations
- Password hashing
- Input validation
- Rate limiting
- CORS configuration

### Request 3: Food Database and Logging System

#### Food Database Integration
- OpenFoodFacts API client implementation
- USDA FoodData Central API client as fallback
- Caching strategy for frequent lookups
- Search functionality
- Nutritional information parsing
- Local storage for custom and frequently used foods

#### Food Logging System
- Daily food log creation
- Meal categorization
- Portion size calculation
- Nutritional totals calculation
- Historical data access

#### Custom Food Entry
- Custom food creation form
- Nutritional information input
- Custom food management
- Favorite foods functionality

### Request 4: Barcode Scanning and Mobile Features

#### Barcode Scanning Implementation
- Camera integration
- Barcode detection
- OpenFoodFacts API lookup based on barcode
- Fallback to USDA API when needed
- Scan history
- Offline scanning capability

#### Mobile-Specific Features
- Responsive layouts for iOS and Android
- Touch interactions
- Offline mode
- Push notifications
- Deep linking

#### Performance Optimizations
- Image caching
- Network request batching
- Lazy loading
- Memory management

### Request 5: Calorie Goals and Progress Tracking

#### Goal Setting System
- Daily calorie goal setting
- Macronutrient targets
- Weight goals
- Progress tracking

#### Analytics and Visualization
- Daily consumption charts
- Progress over time graphs
- Nutrient breakdown visualizations
- Goal completion statistics

#### Feedback Mechanisms
- Daily summaries
- Achievement notifications
- Trend analysis
- Recommendation engine

### Request 6: Data Synchronization Between Devices

#### Synchronization Architecture
- Change tracking mechanism
- Timestamp-based synchronization
- Conflict resolution strategy
- Batch synchronization

#### Offline Support
- Local storage structure
- Pending changes queue
- Background sync when online
- Data integrity validation

#### Edge Cases Handling
- Network interruptions
- Partial synchronization
- Duplicate data detection
- Data validation

### Request 7: Docker Deployment Configuration

#### Docker Compose Setup
- Service definitions
- Environment configuration
- Volume management
- Network configuration

#### Database Configuration
- PostgreSQL setup
- Initial schema creation
- Indexing strategy
- Backup mechanism

#### Nginx Reverse Proxy Configuration
- Routing rules
- SSL termination
- Caching strategy
- Security headers

#### Deployment Instructions
- Environment setup
- Build process
- Deployment commands
- Monitoring setup

### Request 8: Testing and Documentation

#### Testing Strategy
- Unit tests for core functions
- Integration tests for API endpoints
- End-to-end tests for critical flows
- Performance testing

#### User Documentation
- Installation guide
- User manual
- Feature walkthrough
- Troubleshooting guide

#### Developer Documentation
- API documentation
- Code structure overview
- Contribution guidelines
- Extension points

## Implementation Details

### Database Schema Details

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Food items table
CREATE TABLE food_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  barcode VARCHAR(100) UNIQUE,
  calories_per_serving DECIMAL(10, 2),
  protein_grams DECIMAL(10, 2),
  carbs_grams DECIMAL(10, 2),
  fat_grams DECIMAL(10, 2),
  serving_size VARCHAR(100),
  serving_unit VARCHAR(50),
  source VARCHAR(50), -- API or custom
  source_id VARCHAR(100), -- ID from external API if applicable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User food logs table
CREATE TABLE food_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  food_item_id INTEGER REFERENCES food_items(id),
  log_date DATE NOT NULL,
  meal_type VARCHAR(50), -- breakfast, lunch, dinner, snack
  servings DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id UUID NOT NULL, -- For synchronization
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Goals table
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  daily_calorie_target INTEGER,
  protein_target_grams INTEGER,
  carbs_target_grams INTEGER,
  fat_target_grams INTEGER,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_id UUID NOT NULL, -- For synchronization
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Sync metadata table
CREATE TABLE sync_metadata (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  device_id VARCHAR(255) NOT NULL,
  last_sync_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, device_id)
);

-- Indexes
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, log_date);
CREATE INDEX idx_food_items_barcode ON food_items(barcode);
CREATE INDEX idx_food_items_name ON food_items(name);
CREATE INDEX idx_goals_user ON goals(user_id);
```

### API Endpoints Overview

```
# Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh-token
POST /api/auth/logout

# User Management
GET /api/users/profile
PUT /api/users/profile
PUT /api/users/password

# Food Database
GET /api/foods/search?query=
GET /api/foods/barcode/:barcode
POST /api/foods/custom
PUT /api/foods/custom/:id
DELETE /api/foods/custom/:id

# Food Logging
GET /api/logs?date=
POST /api/logs
PUT /api/logs/:id
DELETE /api/logs/:id
GET /api/logs/summary?start_date=&end_date=

# Goals
GET /api/goals/current
POST /api/goals
PUT /api/goals/:id
DELETE /api/goals/:id

# Synchronization
POST /api/sync
GET /api/sync/status
```

### Food Database Integration Code Example

```javascript
// OpenFoodFacts API lookup by barcode
const fetchFoodByBarcode = async (barcode) => {
  try {
    // First try OpenFoodFacts
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1) {
      // Product found, extract and return nutritional information
      return {
        name: data.product.product_name,
        calories: data.product.nutriments['energy-kcal_100g'],
        protein: data.product.nutriments.proteins_100g,
        carbs: data.product.nutriments.carbohydrates_100g,
        fat: data.product.nutriments.fat_100g,
        serving_size: data.product.serving_size,
        barcode: barcode,
        source: 'openfoodfacts',
        source_id: data.product._id
      };
    }

    // If not found in OpenFoodFacts, try USDA API as fallback
    // This would require a text search since USDA doesn't directly support barcode lookup
    return await searchUSDAByName(data.product?.product_name || barcode);
  } catch (error) {
    console.error('Error fetching food data:', error);
    return null;
  }
};

// USDA FoodData Central API search by name
const searchUSDAByName = async (query) => {
  try {
    const apiKey = process.env.USDA_API_KEY;
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${apiKey}`
    );
    const data = await response.json();

    if (data.foods && data.foods.length > 0) {
      const food = data.foods[0];

      // Extract nutrients
      const getNutrientValue = (nutrientId) => {
        const nutrient = food.foodNutrients.find(n => n.nutrientId === nutrientId);
        return nutrient ? nutrient.value : 0;
      };

      return {
        name: food.description,
        calories: getNutrientValue(1008), // Energy (kcal)
        protein: getNutrientValue(1003), // Protein
        carbs: getNutrientValue(1005), // Carbohydrates
        fat: getNutrientValue(1004), // Total lipid (fat)
        serving_size: food.servingSize || '100',
        serving_unit: food.servingSizeUnit || 'g',
        barcode: null, // USDA doesn't provide barcodes
        source: 'usda',
        source_id: food.fdcId
      };
    }

    return null;
  } catch (error) {
    console.error('Error searching USDA database:', error);
    return null;
  }
};

// Local caching implementation
const cacheFood = async (foodData) => {
  try {
    // Check if food already exists in database
    const existingFood = await db.query(
      'SELECT * FROM food_items WHERE barcode = $1 OR (source = $2 AND source_id = $3)',
      [foodData.barcode, foodData.source, foodData.source_id]
    );

    if (existingFood.rows.length > 0) {
      // Update existing food
      return await db.query(
        `UPDATE food_items
         SET name = $1, calories_per_serving = $2, protein_grams = $3,
             carbs_grams = $4, fat_grams = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [
          foodData.name,
          foodData.calories,
          foodData.protein,
          foodData.carbs,
          foodData.fat,
          existingFood.rows[0].id
        ]
      );
    } else {
      // Insert new food
      return await db.query(
        `INSERT INTO food_items
         (name, barcode, calories_per_serving, protein_grams, carbs_grams,
          fat_grams, serving_size, serving_unit, source, source_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          foodData.name,
          foodData.barcode,
          foodData.calories,
          foodData.protein,
          foodData.carbs,
          foodData.fat,
          foodData.serving_size,
          foodData.serving_unit,
          foodData.source,
          foodData.source_id
        ]
      );
    }
  } catch (error) {
    console.error('Error caching food data:', error);
    throw error;
  }
};
```

### Docker Compose Configuration

```yaml
version: '3.8'
services:
  # Database
  postgres:
    image: postgres:14
    container_name: nutrition_postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - nutrition_network

  # Backend API
  backend:
    build: ./backend
    container_name: nutrition_backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      USDA_API_KEY: ${USDA_API_KEY}
      PORT: 3000
    networks:
      - nutrition_network

  # Nginx for reverse proxy
  nginx:
    image: nginx:alpine
    container_name: nutrition_nginx
    restart: always
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
    ports:
      - "8080:80"  # Adjust as needed
    depends_on:
      - backend
    networks:
      - nutrition_network

networks:
  nutrition_network:
    driver: bridge

volumes:
  postgres_data:
```

## Development Timeline

1. **Week 1-2**: System architecture, database schema, and authentication system
2. **Week 3-4**: Food database integration and logging system
3. **Week 5-6**: Barcode scanning and mobile features
4. **Week 7-8**: Goals, progress tracking, and data visualization
5. **Week 9-10**: Data synchronization and offline support
6. **Week 11-12**: Testing, deployment, and documentation

## Next Steps

1. Set up development environment
2. Create initial project structure
3. Implement database schema
4. Begin backend API development
5. Start frontend mobile app development
6. Register for a free USDA FoodData Central API key