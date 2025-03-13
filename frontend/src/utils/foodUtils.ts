export const getSourceIcon = (source: string) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return 'leaf';  // Leaf icon for USDA
    case 'openfoodfacts':
      return 'database';  // Database icon for OpenFoodFacts
    case 'custom':
      return 'food-apple';  // Apple icon for custom foods (matching the tab icon)
    default:
      return 'food';
  }
};

export const getSourceColor = (source: string, theme: any) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return '#4CAF50';  // Green for USDA
    case 'openfoodfacts':
      return '#2196F3';  // Blue for OpenFoodFacts
    case 'custom':
      return '#FF9800';  // Orange for custom foods (matching the food database card)
    default:
      return theme.colors.primary;
  }
};