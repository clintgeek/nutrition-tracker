export const getSourceIcon = (source: string) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return 'leaf';  // Leaf icon for USDA (official data)
    case 'nutritionix':
      return 'check-decagram';  // Verified/badge icon for Nutritionix (verified data)
    case 'openfoodfacts':
      return 'database';  // Database icon for OpenFoodFacts (community data)
    case 'custom':
      return 'food-apple';  // Apple icon for custom foods (user-created)
    case 'recipe':
      return 'book-open-variant';  // Book/recipe icon for recipe foods
    default:
      return 'food';  // Generic food icon for unknown sources
  }
};

export const getSourceColor = (source: string, theme: any) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return '#4CAF50';  // Green for USDA (official data)
    case 'nutritionix':
      return '#2196F3';  // Blue for Nutritionix (verified data)
    case 'openfoodfacts':
      return '#FF9800';  // Orange for OpenFoodFacts (community data)
    case 'custom':
      return '#9C27B0';  // Purple for custom foods (user-created)
    case 'recipe':
      return '#E91E63';  // Pink for recipe foods
    default:
      return theme.colors.primary;  // Theme color for unknown sources
  }
};