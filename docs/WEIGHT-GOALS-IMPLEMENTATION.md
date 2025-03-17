# Weight Goals Implementation Plan

## Overview
This document outlines the plan for implementing weight goals tracking and restructuring the app navigation in the Nutrition Tracker application.

## 1. Navigation Restructuring

### Current Navigation Structure
- Bottom Tab Navigation with tabs for:
  - Home
  - Log
  - Foods
  - Recipes
  - Goals (to be removed)

### Proposed Navigation Structure
- Bottom Tab Navigation with tabs for:
  - Home
  - Log
  - Foods
  - Recipes
- Hamburger Menu (Drawer Navigation) for secondary features:
  - Nutrition Goals (moved from Goals tab)
  - Weight Goals (new feature)
  - Logout option

### Implementation Steps
- ✅ Create a DrawerNavigator component
- ✅ Move Nutrition Goals from the Goals tab to the drawer
- ✅ Add Weight Goals to the drawer
- ✅ Remove the Goals tab from the bottom navigation
- ✅ Add a hamburger menu icon to the header
- ✅ Update package.json with required dependencies
- ✅ Update AppNavigator to include the drawer navigator

## 2. Weight Goals Feature

### Data Models
- ✅ Weight Goal:
  - target_weight: number
  - start_weight: number
  - start_date: Date
  - target_date: Date
  - user_id: string

- ✅ Weight Log:
  - weight: number
  - date: Date
  - notes: string (optional)
  - user_id: string

### Weight Goals Screen Layout
- ✅ Current Status Section:
  - Current weight
  - Target weight
  - Progress visualization
  - Days remaining

- ✅ Set Weight Goal Section:
  - Input for target weight
  - Input for target date
  - Save button

- ✅ Log Weight Section:
  - Input for current weight
  - Date picker (defaults to today)
  - Notes field
  - Add button

- ✅ Weight History Section:
  - List of weight logs with dates
  - Option to delete entries

### Functions
- ✅ loadWeightData(): Load weight goal and logs from backend
- ✅ saveWeightGoal(): Save or update weight goal
- ✅ addWeightLog(): Add a new weight log entry
- ✅ deleteWeightLog(): Remove a weight log entry
- ✅ calculateProgress(): Calculate progress towards goal

## 3. Implementation Plan

### Phase 1: Backend Setup
- ✅ Create database tables for weight goals and logs
- ✅ Implement API endpoints for weight goals CRUD operations
- ✅ Implement API endpoints for weight logs CRUD operations

### Phase 2: Frontend Services
- ✅ Create weightService.ts with functions for:
  - getWeightGoal
  - saveWeightGoal
  - getWeightLogs
  - addWeightLog
  - deleteWeightLog

### Phase 3: UI Components
- ✅ Create WeightGoalsScreen component
- ✅ Create NutritionGoalsScreen component (moved from GoalsScreen)
- ✅ Implement form validation for weight inputs

### Phase 4: Navigation Restructuring
- ✅ Create DrawerNavigator component
- ✅ Update MainTabNavigator to remove Goals tab
- ✅ Add hamburger menu icon to header
- ✅ Connect drawer navigation to main app flow

## 4. Next Steps

### Install Required Dependencies
```bash
npm install @react-navigation/drawer
```
Note: react-native-gesture-handler and react-native-reanimated are already installed.

### Create Backend API Endpoints
- Implement the following endpoints in the backend:
  - GET /api/weight/goal - Get user's weight goal
  - POST /api/weight/goal - Create/update weight goal
  - GET /api/weight/logs - Get user's weight logs
  - POST /api/weight/logs - Add a new weight log
  - DELETE /api/weight/logs/:id - Delete a weight log

### Test Implementation
- Test navigation flow between screens
- Test weight goal setting functionality
- Test weight logging functionality
- Test weight history display and deletion

## 5. Technical Notes
- Follow existing application patterns for API calls and state management
- Ensure all components are accessible and follow the app's design language
- Use the existing theme colors and styles for consistency