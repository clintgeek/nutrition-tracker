/**
 * Calculate relevance score for a food item based on search query
 * @param {Object} food - Food item
 * @param {string} query - Search query
 * @returns {number} Relevance score
 */
function calculateRelevanceScore(food, query) {
  if (!food || !query) return 0;

  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
  const name = food.name.toLowerCase();
  const brand = (food.brand || '').toLowerCase();
  let score = 0;

  // Source quality score (base points)
  const sourceScores = { nutritionix: 20, openfoodfacts: 20 };
  score += sourceScores[food.source] || 0;

  // Name matching score
  for (const term of queryTerms) {
    // Exact word match in name
    if (name.split(/\s+/).includes(term)) {
      score += 50;
    }
    // Partial match in name
    else if (name.includes(term)) {
      score += 30;
    }

    // Brand match
    if (brand) {
      if (brand.split(/\s+/).includes(term)) {
        score += 20;
      }
      else if (brand.includes(term)) {
        score += 10;
      }
    }

    // Bonus for matches at start of name
    if (name.startsWith(term)) {
      score += 15;
    }
  }

  // Completeness score (having all nutritional values)
  // Give more weight to items with complete nutritional data
  const hasCalories = food.calories > 0;
  const hasProtein = food.protein > 0;
  const hasCarbs = food.carbs > 0;
  const hasFat = food.fat > 0;

  if (hasCalories) score += 10;
  if (hasProtein) score += 8;
  if (hasCarbs) score += 8;
  if (hasFat) score += 8;
  if (food.serving_size) score += 5;
  if (food.serving_unit) score += 5;

  // Bonus for having complete nutritional profile
  if (hasCalories && hasProtein && hasCarbs && hasFat) {
    score += 15;
  }

  return score;
}