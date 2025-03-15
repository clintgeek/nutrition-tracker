# Nutrition Tracker - Todo List & Development Notes

## Recently Completed
- [x] Fixed weight goals API endpoint issue (changed from `/weight/goals` to `/weight/goal`)
- [x] Added weight tables to initial database schema for new installations
- [x] Fixed field naming consistency between frontend and backend for weight tracking
- [x] Improved error handling in WeightGoalsScreen for undefined values and invalid dates
- [x] Enhanced UI for weight tracking with better formatting and visual indicators
- [x] Fixed drawer navigation system with proper typing and safety checks
- [x] Improved loading indicators across main screens (FoodScreen, LogScreen, RecipesScreen, TodaySummary)

## In Progress
- [ ] Complete weight tracking functionality
  - [x] Create weight logs schema
  - [x] Create weight goals schema
  - [x] Implement weight tracking UI
  - [x] Fix weight goal saving functionality
  - [ ] Improve weight visualization
    - [ ] **Weight Trend Graph**: Line chart showing weight over time with trend line, color-coded to show progress toward goal
    - [ ] **Progress Cards**: Visual cards showing key metrics (total weight lost/gained, percentage toward goal, average weekly change, projected goal date)
    - [ ] **Interactive Calendar View**: Calendar with color intensity showing weight entries, tap on a day to see details
    - [ ] **Milestone Markers**: Visual indicators for significant milestones (5% lost, 10% lost, etc.)
    - [ ] **Comparison Visualizations**: Before/after style visualization with equivalent weight objects
    - [ ] **Multi-metric Tracking**: Add body measurements tracking alongside weight
    - [ ] **Goal Projection**: Visual projection of expected weight loss/gain based on current trend
    - [ ] **Contextual Insights**: Highlight correlations between weight changes and food log entries

## Planned Features

### High Priority (by complexity)
- [x] Improve loading indicators (Low)
- [ ] Implement success notifications for actions (Low)
- [ ] Add confirmation dialogs for destructive actions (Low)
- [ ] Add form validation with helpful error messages (Medium)
- [ ] Complete weight goals and tracking (Medium)
  - [x] Track weight and weight goals
  - [x] Show weight loss progress
  - [ ] Add weight trend visualization

### Medium Priority (by complexity)
- [ ] Allow setting of default page in user profile settings (Low)
- [ ] Create data visualization for nutrition trends (Medium)
- [ ] Rework home to be more of a dashboard (Medium)
- [ ] Implement handling of recipes in the food database (High)
- [ ] Add user profile management (High)
- [ ] Implement OAUTH through Google account (High)

### Future Improvements (by complexity)
- [ ] Implement swipe between screens for mobile (Low)
- [ ] Dark mode theme with toggle in hamburger menu (Low)
- [ ] Implement user avatars (Low)
- [ ] CSV import functionality for food and weight data (Medium)
- [ ] Make the web page "installable" in the Chrome browser (Medium)
- [ ] Implement "milestones" as badges (e.g., each 5 pounds lost, every 30 days logged) (Medium)
- [ ] Add insights dashboard (most logged foods, total calories, logging streaks, etc.) (Medium)
- [ ] Add barcode scanning with food lookup (High)
- [ ] Add meal planning and scheduling (High)
- [ ] Create an admin interface for user management and system configuration (High)
- [ ] Integrate with fitness trackers (e.g., Garmin) (High)

## Completed Features
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

## Technical Improvements

### Completed
- [x] Replace mock data with actual database queries
- [x] Fix database connection issues
- [x] Update API services to call external APIs
- [x] Optimize API usage by saving results to database
- [x] Ensure database tables are created automatically during setup
- [x] Ensure all controllers properly connect to the database
- [x] Cache API results to reduce external calls
- [x] Implement batch processing for database operations

### Planned
- [ ] Implement SASS for styling
  - [ ] Convert existing CSS/inline styles to SASS
  - [ ] Create variables for colors, spacing, and typography
  - [ ] Implement nested styles for better organization
  - [ ] Set up proper build process for SASS compilation
- [ ] Implement smarter caching strategies
  - [ ] Add TTL for cached items
  - [ ] Cache partial search results for pagination
- [ ] Add request throttling for external APIs
- [ ] Optimize response size and database queries
- [ ] Reduce unnecessary re-renders in the UI
- [ ] Add comprehensive error handling throughout the application

## Notes
- Recipe functionality should include ability to create, save, and log custom recipes
- Consider implementing a progressive web app (PWA) approach for installability
- Explore offline functionality for logging when internet connection is unavailable

## Additional Enhancements

## Bugs

### Feature Additions
- [x] Track weight and weight goals
- [x] Show weight loss progress
- [ ] Add user profile management
- [ ] Implement OAUTH through google account
- [ ] Implement user avatars
- [ ] Rework home to be more of a dashboard
- [ ] allow setting of default page in user profile settings
- [ ] implement handling of recipies in the food database
- [ ] Add barcode scanning with food lookup
- [ ] Create data visualization for nutrition trends
- [ ] implement "milestones" as badges for various things like each 5 pounds lost or every 30 days logged
- [ ] Make the web page "installable" in the chrome browser
- [ ] insights that highlight most logged foods or recipies and total logged calories, total logged days and a avg calories per day. Maybe make this page a tabbed interface to show a bunch of information without overwhelming the user
- [ ] create an admin login for an admin page that would allow user management, turning on maintenance mode, turning off and on allowing user self registration and future configuration changes
- [ ] see what data could be imported from Garmin
- [ ] meal planning and scheduling
- [ ] swipe between screens
- [x] Use favicon.png instead
- [x] Today's summary tile on home page is using dummy information. It should use your goal and actual nutrition counts from your log
- [x] Add Home button beside logout button in header
- [x] API results should be automatically searched and added to the search list with the other foods
- [x] Implement food search functionality
- [x] Implement Today's Summary page with calories and macros, maybe using some sort of chart rather than just a line graph
- [x] use OpenFoodFacts as primary API, fail to USDA
- [x] make the food database available to all users

### User Experience
- [x] Today's summary tile on the home screen should only show calories if your using a calorie goal and only show macros if you're using a macro goal
- [ ] Add form validation with helpful error messages
- [ ] Implement success notifications for actions
- [ ] Add confirmation dialogs for destructive actions
- [ ] Improve loading indicators

### Database Connection Fixes
- [x] Replace mock data in foodController.js with actual database queries
- [x] Fix database connection issues (incorrect hostname and password)
- [x] Update foodApiService.js to call actual external API instead of using mock data
- [x] Optimize API usage by saving results to database
- [x] Ensure database tables are created automatically during initial setup
- [x] Ensure logController.js properly connects to the database
- [x] Ensure goalController.js properly connects to the database
- [x] Ensure authController.js properly connects to the database
- [x] Ensure userController.js properly connects to the database
- [x] Ensure syncController.js properly connects to the database

### Performance Improvements
- [x] Cache API results in database to reduce external API calls
- [x] Implement batch processing for database operations
  - [x] Use bulk insert operations when saving multiple items
  - [x] Process food items in batches rather than one by one
- [ ] Implement smarter caching strategies
  - [ ] Add TTL (time-to-live) for cached items to refresh data periodically
  - [ ] Cache partial search results to handle pagination more efficiently
- [ ] Add request throttling for external APIs
  - [ ] Implement rate limiting for external API calls
  - [ ] Add exponential backoff for retries on failed requests
- [ ] Prefetch and preload common data
  - [ ] Preload commonly searched food items during application startup
  - [ ] Implement a background job to periodically refresh popular items
- [ ] Optimize response size
  - [ ] Compress API responses to reduce payload size
  - [ ] Implement field filtering to return only needed data
- [ ] Optimize database queries
  - [ ] Add appropriate indexes for common query patterns
  - [ ] Use query optimization techniques like SELECT only needed fields
- [ ] Reduce unnecessary re-renders in the UI
  - [ ] Implement React.memo for pure components
  - [ ] Use useMemo and useCallback hooks for expensive calculations

## Recipie Notes

