# Food Card Component

## Overview
The Food Card component provides a consistent way to display food items throughout the application. Each card shows essential nutrition information in a clean, scannable format optimized for quick browsing.

## Visual Design
```
┌─────────────────────────────────────────────┐
│                                             │
│  ○  Banana 118 g                          + │
│                                             │
│     105       1.00g     27.00g      0.00g   │
│    Calories   Protein    Carbs       Fat    │
└─────────────────────────────────────────────┘
```

## Component Structure

### Container Hierarchy
1. **List/ScrollView Container**
   - Vertical padding: 8dp
   - No horizontal padding (handled by cards)

2. **Card Container**
   - Horizontal margins: 16dp from screen edges
   - Vertical margins: 4dp between cards
   - Background: theme.colors.surface
   - Elevation: 1
   - Border radius: 8dp
   - Width: Fills container width minus horizontal margins

3. **Card Content Container**
   - Padding: 16dp all around
   - Contains all internal card elements

### Source Icon
- Positioned in the left side of the card, vertically centered
- Circular background with brand color at 20% opacity
- Icon color matches the source type (blue for verified foods, etc.)
- Size: 48dp diameter
- Horizontal margin of 16dp from card edge

### Food Information
- **Food Name**: Primary text, left-aligned
- **Serving Size**: Secondary text, positioned immediately after food name on the same line
- **Action Button**: "+" icon at the far right (optional)

### Nutrition Grid
- Four columns with equal spacing
- Aligned to the bottom of the card
- Each column contains a value and label vertically stacked

### Layout Measurements
- **Container Spacing**:
  - ScrollView/List vertical padding: 8dp
  - Card horizontal margins: 16dp
  - Card vertical margins: 4dp
  - Card content padding: 16dp
  - Total card side margins: 32dp (16dp card + 16dp content)

- **Internal Spacing**:
  - Source icon to content: 72dp (48dp icon + 16dp margin + 8dp space)
  - Name row bottom margin: 16dp
  - Gap between nutrition items: 16dp
  - Name to serving text gap: 4dp

- **Element Sizes**:
  - Source icon: 48x48dp
  - Action icon: 24x24dp
  - Minimum card height: 100dp
  - Touch targets: Minimum 48x48dp

## Specifications

### Typography
- **Food Name**: 16sp, Medium weight (500), Primary text color
- **Serving Size**: 14sp, Regular weight (400), Secondary text color
- **Nutrition Values**: 16sp, Medium weight (500), Primary text color
- **Nutrition Labels**: 12sp, Regular weight (400), Secondary text color

### Colors
- **Card Background**: theme.colors.surface
- **Food Name**: theme.colors.onSurface
- **Serving Size**: theme.colors.onSurfaceVariant
- **Source Icon Background**: [Source color]20 (20% opacity)
- **Source Icon**: Varies based on source
- **Nutrition Values**: theme.colors.onSurface
- **Nutrition Labels**: theme.colors.onSurfaceVariant
- **Action Button**: theme.colors.primary

### Spacing
- **Card Padding**: 16dp all around
- **Source Icon Margin**: 16dp from card edges
- **Gap between Food Name and Serving Size**: 4dp
- **Vertical Spacing between Sections**: 16dp
- **Horizontal Spacing between Nutrition Columns**: Equal distribution

### Sizes
- **Card Width**: Match parent width minus horizontal margins
- **Card Min Height**: 100dp
- **Source Icon**: 48dp diameter
- **Action Button**: 40dp diameter

## States
- **Default**: As described above
- **Pressed**: Light ripple effect across the entire card
- **Disabled**: Reduced opacity (70%)

## Interactions
- Entire card is tappable and navigates to food details
- Action button (when present) performs specific actions (e.g., add to log)

## Variations

### Standard Food Card
- Shows full nutrition grid
- Used in food search, browse, and selection screens

### Compact Food Card
- Shows only calories
- Used in summary views or space-constrained contexts

### Detailed Food Card
- Shows additional nutritional information
- Used in food details screens

## Usage Guidelines
- Always show calories as the first nutrition value
- Display consistent decimal places:
  - Calories: whole numbers only
  - Macronutrients: 1 decimal place with "g" suffix
- Use appropriate source icons based on the food's origin
- If brand information is available, it should be displayed on a second line below the name when needed
- Long food names should truncate with ellipsis rather than wrap
- Source icon should match the source type's color scheme

## Accessibility
- Ensure minimum touch target size of 48x48dp
- Maintain text contrast ratio of at least 4.5:1
- Include clear content descriptions for icons
- Support screen reader navigation with appropriate descriptions

## Examples

### Basic Implementation
```tsx
<FoodCard
  name="Banana"
  servingSize={118}
  servingUnit="g"
  calories={105}
  protein={1.00}
  carbs={27.00}
  fat={0.00}
  source="verified"
  onPress={() => handleFoodPress(food)}
/>
```

### With Action Button
```tsx
<FoodCard
  name="Egg"
  servingSize={1}
  servingUnit="egg"
  calories={72}
  protein={6.00}
  carbs={0.00}
  fat={5.00}
  source="verified"
  actionIcon="plus"
  onActionPress={() => handleAddToLog(food)}
  onPress={() => handleFoodPress(food)}
/>
```

## Best Practices
1. Use consistent formatting for nutritional values
2. Ensure all card elements are properly aligned
3. Maintain readable text sizes, especially for nutritional values
4. Use appropriate spacing to create clear visual hierarchy
5. Implement proper error states when nutritional data is missing