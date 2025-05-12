const FoodApiService = require('../utils/foodApiService');
const Food = require('../models/Food');
const FoodUtils = require('../utils/foodUtils');
const cacheService = require('../utils/cacheService');

// Mock the external services
jest.mock('../utils/nutritionixService', () => ({
  searchByName: jest.fn(),
  searchByUPC: jest.fn()
}));

jest.mock('../utils/openFoodFactsService', () => ({
  searchByName: jest.fn(),
  searchByUPC: jest.fn()
}));

jest.mock('../utils/spoonacularService', () => ({
  searchByName: jest.fn(),
  searchByUPC: jest.fn()
}));

// Mock axios for USDA API calls
jest.mock('axios', () => ({
  get: jest.fn()
}));

describe('FoodApiService', () => {
  let service;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clear the cache
    cacheService.clear();
    // Create a new instance of the service
    service = new FoodApiService();
  });

  describe('searchFood', () => {
    it('should return cached results when available', async () => {
      const mockResults = {
        foods: [
          new Food({
            name: 'Test Food',
            calories: 100,
            source: 'nutritionix'
          })
        ],
        stats: { total: 1 }
      };

      cacheService.set('search:test:{"limit":30,"offset":0}', mockResults);

      const results = await service.searchFood('test');
      expect(results).toEqual(mockResults);
    });

    it('should search across all APIs and combine results', async () => {
      const mockNutritionixResult = [{
        name: 'Apple',
        calories: 95,
        source: 'nutritionix'
      }];

      const mockUSDAResult = [{
        name: 'Apple',
        calories: 100,
        source: 'usda'
      }];

      // Mock API responses
      service.apis.nutritionix.searchByName.mockResolvedValue(mockNutritionixResult);
      service.apis.openFoodFacts.searchByName.mockResolvedValue([]);
      service.apis.spoonacular.searchByName.mockResolvedValue([]);

      // Mock USDA API response
      const axios = require('axios');
      axios.get.mockResolvedValue({ data: { foods: mockUSDAResult } });

      const results = await service.searchFood('apple');

      expect(results.foods).toHaveLength(1); // Should deduplicate
      expect(results.stats.total).toBe(1);
      expect(results.stats.sources.nutritionix).toBe(1);
      expect(results.stats.sources.usda).toBe(1);
    });

    it('should handle API errors gracefully', async () => {
      service.apis.nutritionix.searchByName.mockRejectedValue(new Error('API Error'));
      service.apis.openFoodFacts.searchByName.mockResolvedValue([]);
      service.apis.spoonacular.searchByName.mockResolvedValue([]);

      const axios = require('axios');
      axios.get.mockResolvedValue({ data: { foods: [] } });

      const results = await service.searchFood('apple');

      expect(results.foods).toHaveLength(0);
      expect(results.stats.sources.nutritionix).toBe(0);
    });
  });

  describe('fetchFoodByBarcode', () => {
    it('should return cached result when available', async () => {
      const mockFood = new Food({
        name: 'Test Food',
        barcode: '123456789',
        source: 'nutritionix'
      });

      cacheService.set('barcode:123456789', mockFood);

      const result = await service.fetchFoodByBarcode('123456789');
      expect(result).toEqual(mockFood);
    });

    it('should try APIs in priority order', async () => {
      const mockResult = {
        name: 'Test Food',
        barcode: '123456789'
      };

      service.apis.nutritionix.searchByUPC.mockResolvedValue(mockResult);

      const result = await service.fetchFoodByBarcode('123456789');

      expect(result).toBeTruthy();
      expect(result.name).toBe('Test Food');
      expect(service.apis.nutritionix.searchByUPC).toHaveBeenCalledWith('123456789');
      expect(service.apis.openFoodFacts.searchByUPC).not.toHaveBeenCalled();
    });
  });

  describe('processResults', () => {
    it('should filter out invalid foods', () => {
      const foods = [
        new Food({ name: 'Valid Food', calories: 100 }),
        new Food({ name: '', calories: 0 }),
        new Food({ name: 'Another Valid', protein: 10 })
      ];

      const processed = service.processResults(foods);
      expect(processed).toHaveLength(2);
    });

    it('should deduplicate foods with same name', () => {
      const foods = [
        new Food({ name: 'Apple', calories: 100, source: 'nutritionix' }),
        new Food({ name: 'Apple', calories: 95, source: 'usda' })
      ];

      const processed = service.processResults(foods);
      expect(processed).toHaveLength(1);
      expect(processed[0].source).toBe('nutritionix'); // Should keep higher quality source
    });
  });

  describe('calculateStats', () => {
    it('should calculate correct statistics', () => {
      const foods = [
        new Food({ name: 'Food 1', quality_score: 8 }),
        new Food({ name: 'Food 2', quality_score: 6 }),
        new Food({ name: 'Food 3', quality_score: 9 })
      ];

      const apiResults = [
        { status: 'fulfilled', value: [1, 2] },
        { status: 'fulfilled', value: [3] },
        { status: 'rejected' },
        { status: 'fulfilled', value: [] }
      ];

      const stats = service.calculateStats(foods, apiResults);

      expect(stats.total).toBe(3);
      expect(stats.quality_scores.min).toBe(6);
      expect(stats.quality_scores.max).toBe(9);
      expect(stats.quality_scores.avg).toBe(7.67);
      expect(stats.sources.nutritionix).toBe(2);
      expect(stats.sources.openFoodFacts).toBe(1);
      expect(stats.sources.usda).toBe(0);
      expect(stats.sources.spoonacular).toBe(0);
    });
  });
});