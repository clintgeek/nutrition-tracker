# Food Search Enhancement Plan

## Overview
Enhance food search functionality to use multiple APIs in parallel, with intelligent result ranking and deduplication.

## Phase 1: Parallel API Integration
1. Modify `foodApiService.js`:
   - Use `Promise.all()` for parallel API calls
   - Add proper error handling for each API
   - Maintain individual API rate limits
   - Update caching strategy for multiple sources

2. Required Changes:
```javascript
// Example structure
static async searchFood(query) {
  const searches = [
    nutritionixService.searchByName(query),
    this.searchOpenFoodFacts(query),
    this.searchUSDAByName(query)
  ];

  const results = await Promise.all(
    searches.map(p => p.catch(error => {
      logger.error(error);
      return [];
    }))
  );

  return this.processResults(results.flat(), query);
}
```

## Phase 2: Deduplication System
1. Implement smart deduplication:
   - Match by name + brand combination
   - Match by barcode if available
   - Handle slight name variations

2. Required Changes:
```javascript
static deduplicateResults(foods) {
  const seen = new Map();

  return foods.filter(food => {
    const key = this.generateFoodKey(food);
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
}

static generateFoodKey(food) {
  return `${food.name.toLowerCase()}-${food.brand || ''}-${food.barcode || ''}`;
}
```

## Phase 3: Relevance Scoring
1. Implement weighted scoring system:

```javascript
const SOURCE_WEIGHTS = {
  nutritionix: 3,  // Verified data
  usda: 2,         // Official data
  openfoodfacts: 1 // Community data
};

const SCORING_FACTORS = {
  exactMatch: 20,
  containsMatch: 10,
  hasBrand: 5,
  hasCompleteNutrition: 5,
  hasBarcode: 3,
  hasServingInfo: 2
};
```

2. Scoring Implementation:
```javascript
function scoreResult(food, query) {
  let score = SOURCE_WEIGHTS[food.source] * 10;

  // Text matching
  if (food.name.toLowerCase() === query.toLowerCase()) {
    score += SCORING_FACTORS.exactMatch;
  } else if (food.name.toLowerCase().includes(query.toLowerCase())) {
    score += SCORING_FACTORS.containsMatch;
  }

  // Additional factors
  if (food.brand) score += SCORING_FACTORS.hasBrand;
  if (food.calories && food.protein && food.carbs && food.fat) {
    score += SCORING_FACTORS.hasCompleteNutrition;
  }
  if (food.barcode) score += SCORING_FACTORS.hasBarcode;
  if (food.servingSize && food.servingUnit) score += SCORING_FACTORS.hasServingInfo;

  return score;
}
```

## Phase 4: UI Updates
1. Update food item display:
   - Add source indicator/badge
   - Show relevance score (optional)
   - Improve result grouping
   - Add source filters

2. Required Changes:
   - Modify `FoodCard` component
   - Add source filtering controls
   - Update search results display
   - Add loading states for parallel searches

## Implementation Order
1. Phase 1: Parallel API Integration
   - Implement basic parallel search
   - Add error handling
   - Update caching

2. Phase 2: Deduplication
   - Implement deduplication logic
   - Add food matching algorithms
   - Test with various data combinations

3. Phase 3: Scoring System
   - Implement basic scoring
   - Fine-tune weights
   - Add sorting

4. Phase 4: UI Updates
   - Add source indicators
   - Implement filters
   - Update results display

## Testing Strategy
1. Unit Tests:
   - Test scoring algorithm
   - Test deduplication
   - Test API error handling

2. Integration Tests:
   - Test parallel API calls
   - Test caching behavior
   - Test rate limiting

3. UI Tests:
   - Test source filtering
   - Test search result display
   - Test loading states

## Rollback Plan
1. Keep old search implementation in code (commented)
2. Add feature flag for new search
3. Monitor error rates and performance
4. Ready to switch back if issues arise