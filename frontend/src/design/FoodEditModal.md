# Food Edit Modal Design Pattern

## Layout Structure
The food edit modal follows a consistent vertical layout with clear section grouping and spacing:

### 1. Header Section
- Modal title using capitalized food name
- Full width
- Uses Dialog.Title component

### 2. Servings Group
- **Servings Input**
  - Full width numeric input
  - Label: "Servings"
  - Keyboard: decimal-pad

- **Serving Details**
  - Horizontal layout with 2:1 ratio
  - Serving size input (2/3 width)
    - Numeric input
    - Default: "100"
  - Serving unit input (1/3 width)
    - Text input
    - Placeholder: "g"

### 3. Meal Details Group
- **Meal Type Selection**
  - Grid of buttons (2x2)
  - Options: Breakfast, Lunch, Dinner, Snack
  - Minimum width: 45% per button
  - Uses contained/outlined states for selection

- **Date Selection**
  - Full width input
  - Default: current date
  - Format: YYYY-MM-DD

### 4. Nutrition Information
- Grid layout (2x2)
- Equal width columns
- Centered alignment
- Fields:
  - Calories
  - Protein
  - Carbs
  - Fat
- Each field includes:
  - Label above
  - Numeric input below
  - Auto-calculation based on servings

## Styling Guidelines
- **Spacing**
  - 16px padding for content
  - 16px margin between major sections
  - 8px margin between related elements
  - 12px gap in nutrition grid

- **Typography**
  - Section labels: 16px, fontWeight: '500'
  - Nutrition title: 18px, bold
  - Input labels: 14px
  - Use theme colors:
    - Primary text: theme.colors.onSurface
    - Secondary text: theme.colors.onSurfaceVariant

- **Inputs**
  - Consistent border: 1px solid theme.colors.outline
  - Border radius: 4px
  - Padding: 8px (4px for nutrition inputs)
  - Background: theme.colors.background

- **Visual Separation**
  - Dividers between major sections
  - Clear visual hierarchy through spacing and typography

## Behavior
- All numeric inputs should use appropriate keyboard types
- Changes to nutrition values should mark the food as custom
- Servings changes should auto-update nutrition values
- Modal should be scrollable for smaller screens
- Maximum height: 80% of screen height

## Usage
This pattern should be used for:
- Adding new foods to the log
- Editing existing food entries
- Creating custom foods
- Modifying custom foods

The layout prioritizes frequently used fields (servings, meal type) while maintaining easy access to detailed nutrition information.