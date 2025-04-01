# Nutrition Tracker - Todo List & Development Notes

## Current Status

### Recently Completed
- [x] Fixed weight goals API endpoint issue (changed from `/weight/goals` to `/weight/goal`)
- [x] Added weight tables to initial database schema for new installations
- [x] Fixed field naming consistency between frontend and backend for weight tracking
- [x] Improved error handling in WeightGoalsScreen for undefined values and invalid dates
- [x] Enhanced UI for weight tracking with better formatting and visual indicators
- [x] Fixed drawer navigation system with proper typing and safety checks
- [x] Improved loading indicators across main screens
- [x] Created dashboard components for weight visualization (WeightProgressCard, WeightMiniGraph)
- [x] Fixed calorie display in Recent Activity section showing "0 cal"
- [x] Improved graph padding in weight trend visualizations
- [x] Fixed logout functionality with proper token clearing and navigation
- [x] Enhanced weight trend visualization to use goal start date
- [x] Reworked home screen to be more of a dashboard with cards layout

### In Progress
- [ ] Complete weight tracking functionality
  - [x] Create weight logs schema
  - [x] Create weight goals schema
  - [x] Implement weight tracking UI
  - [x] Fix weight goal saving functionality
  - [x] Improve weight visualization
    - [x] **Phase 1: Dashboard Integration** (Completed)
      - [x] Create `WeightProgressCard` component for dashboard
      - [x] Create `WeightMiniGraph` component
      - [x] Update HomeScreen to use dashboard layout with cards
      - [x] Add user preference for showing/hiding weight values
      - [x] Implement conditional rendering based on user preference
    - [x] **Phase 2: Detailed Weight Goals Screen** (Completed)
      - [x] Implement full `WeightTrendGraph` with actual values and trend line
      - [x] Add time range filters (week, month, 3 months, year)
      - [x] Create progress metrics cards (total change, weekly average, projected date)
      - [x] Add color coding to show progress toward goal
    - [ ] **Phase 3: Advanced Visualizations** (Future)
      - [ ] Milestone Markers for significant achievements
      - [ ] Multi-metric Tracking with body measurements
      - [ ] Goal Projection with adjustable parameters

## Roadmap

### High Priority
- [x] Round all calories to whole numbers (Low)
- [ ] Implement success notifications for actions (Low)
- [ ] Add confirmation dialogs for destructive actions (Low)
- [ ] Add form validation with helpful error messages (Medium)
- [ ] Fix linter errors across the application (Medium)
  - [ ] Address TypeScript type errors and undefined properties
  - [ ] Fix duplicate style definitions in component files
  - [ ] Resolve missing required props warnings
  - [ ] Standardize import ordering and formatting
  - [ ] Remove unused imports and variables

### Medium Priority
- [ ] Allow setting of default page in user profile settings (Low)
- [ ] Create data visualization for nutrition trends (Medium)
- [x] Implement handling of recipes in the food database (High)
  - [x] Create, save, and log custom recipes
  - [x] Calculate nutritional information for recipes
- [x] Add user profile management (High)
- [ ] Implement SASS for styling (Medium)
  - [ ] Convert existing CSS/inline styles to SASS
  - [ ] Create variables for colors, spacing, and typography
  - [ ] Implement nested styles for better organization
  - [ ] Set up proper build process for SASS compilation

### Future Improvements
- [ ] Dark mode theme with toggle in hamburger menu (Low)
- [ ] Implement user avatars (Low)
- [x] CSV import functionality for food and weight data (Medium)
- [x] Make the web page "installable" as a PWA in browsers (Medium)
- [ ] Implement "milestones" as badges (e.g., each 5 pounds lost, every 30 days logged) (Medium)
- [ ] Add insights dashboard (most logged foods, total calories, logging streaks, etc.) (Medium)
- [ ] Add barcode scanning with food lookup (High)
- [x] Add meal planning and scheduling (High)
- [ ] Create an admin interface for user management and system configuration (High)
- [ ] Integrate with fitness trackers (e.g., Garmin) (High)

## Performance Optimization

### Completed
- [x] Replace mock data with actual database queries
- [x] Fix database connection issues (incorrect hostname and password)
- [x] Update API services to call external APIs
- [x] Optimize API usage by saving results to database
- [x] Ensure database tables are created automatically during setup
- [x] Ensure all controllers properly connect to the database
- [x] Cache API results to reduce external calls
- [x] Implement batch processing for database operations
  - [x] Use bulk insert operations when saving multiple items
  - [x] Process food items in batches rather than one by one

### Planned
- [ ] Implement smarter caching strategies
  - [ ] Add TTL (time-to-live) for cached items to refresh data periodically
  - [ ] Cache partial search results to handle pagination more efficiently
- [ ] Add request throttling for external APIs
  - [ ] Implement rate limiting for external API calls
  - [ ] Add exponential backoff for retries on failed requests
- [ ] Prefetch and preload common data
  - [ ] Preload commonly searched food items during application startup
  - [ ] Implement a background job to periodically refresh popular items
- [ ] Optimize response size and database queries
  - [ ] Compress API responses to reduce payload size
  - [ ] Implement field filtering to return only needed data
  - [ ] Add appropriate indexes for common query patterns
  - [ ] Use query optimization techniques like SELECT only needed fields
- [ ] Reduce unnecessary re-renders in the UI
  - [ ] Implement React.memo for pure components
  - [ ] Use useMemo and useCallback hooks for expensive calculations
- [ ] Add comprehensive error handling throughout the application

## Future Enhancements

### New Integrations
- [ ] Recipe APIs: Connect to services like Spoonacular or Edamam for recipe suggestions
- [ ] AI Image Recognition: Take photos of meals for automatic food identification and logging
- [ ] Barcode Scanning: Quickly log packaged foods and compare alternatives while shopping

## Completed Features Archive
- [x] Break up food log into Breakfast, Lunch, Dinner, Snacks each with an add food button
- [x] Recommend recent foods/meals on log page
- [x] Use favicon.png instead of default
- [x] Fix Today's summary tile to use actual nutrition counts
- [x] Add Home button beside logout button in header
- [x] Include API results in food search
- [x] Implement food search functionality
- [x] Create Today's Summary page with calories and macros visualization
- [x] Use OpenFoodFacts as primary API, fallback to USDA
- [x] Make food database available to all users
- [x] Show calories/macros on home screen based on user goals
- [x] Implement weight tracking with goal visualization
- [x] Today's summary tile shows calories for calorie goal and macros for macro goal
- [x] Improve loading indicators across the application

## Development Notes
- Explore offline functionality for logging when internet connection is unavailable
- Insights page could use a tabbed interface to show information without overwhelming the user

