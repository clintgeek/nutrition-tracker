# Nutrition Tracker - Todo List & Development Notes

## Additional Enhancements

## Bugs
- [x] HTML title is broken again
- [x] Food search isn't working
- [x] Food search is complaining that you have to type at least two characters and resulting in a Failed to fetch foods. Please try again. error message on screen
- [x] Add Custom food is not working

### Feature Additions
- [x] Break up food log into Breakfast, Lunch, Dinner, Snacks each with an add food button that adds food to that category
- [ ] recommend recent foods/meals on log page
- [ ] track weight and weight goals
- [ ] show weight loss progress
- [ ] Add user profile management
- [ ] Implement OAUTH through google account
- [ ] Implement user avatars
- [ ] Rework home to be more of a dashboard
- [ ] allow setting of default page in user profile settings
- [ ] implement handling of recipies in the food database
- [ ] Add barcode scanning with food lookup
- [ ] Add barcode scanning for food log
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


