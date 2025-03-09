# Nutrition Tracker - Todo List & Development Notes

## Additional Enhancements

## Bugs
- [ ] HTML title is broken again
- [x] Food search isn't working
- [ ] Food search is complaining that you have to type at least two characters and resulting in a Failed to fetch foods. Please try again. error message on screen

### Feature Additions
- [x] Use favicon.png instead
- [x] Today's summary tile on home page is using dummy information. It should use your goal and actual nutrition counts from your log
- [x] Add Home button beside logout button in header
- [ ] Add Custom food is not working
- [x] Implement food search functionality
- [ ] Implement Today's Summary page with calories and macros, maybe using some sort of chart rather than just a line graph
- [ ] use OpenFoodFacts as primary API, fail to USDA
- [ ] implement handling of recipies in the food database
- [ ] make the food database available to all users
- [ ] Add barcode scanning with food lookup
- [ ] Create data visualization for nutrition trends
- [ ] Add user profile management
- [ ] Implement OAUTH through google account
- [ ] Implement user avatars
- [ ] recommend recent foods/meals
- [ ] track weight and weight goals
- [ ] show weight loss progress

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
- [ ] Ensure logController.js properly connects to the database
- [x] Ensure goalController.js properly connects to the database
- [ ] Ensure authController.js properly connects to the database
- [ ] Ensure userController.js properly connects to the database
- [ ] Ensure syncController.js properly connects to the database

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
  - [x] Add appropriate indexes for common query patterns
  - [ ] Use query optimization techniques like SELECT only needed fields
- [ ] Reduce unnecessary re-renders in the UI
  - [ ] Implement React.memo for pure components
  - [ ] Use useMemo and useCallback hooks for expensive calculations


