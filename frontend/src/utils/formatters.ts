/**
 * Utility functions for formatting numbers, dates, and other values
 */

/**
 * Format a number with the specified number of decimal places
 * @param value The number to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted string with specified decimal places
 */
export const formatNumber = (value: number, decimals: number = 1): string => {
  if (decimals === 0) {
    return Math.round(value).toString();
  }
  return value.toFixed(decimals);
};

/**
 * Format a number as a percentage with the specified number of decimal places
 * @param value The number to format (0-1)
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format a number with units (g, mg, etc)
 * @param value The number to format
 * @param unit The unit to append
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted string with units
 */
export const formatWithUnit = (value: number, unit: string, decimals: number = 1): string => {
  return `${formatNumber(value, decimals)}${unit}`;
};

/**
 * Format a number as calories
 * @param value The number of calories
 * @returns Formatted calorie string
 */
export const formatCalories = (value: number): string => {
  return `${formatNumber(value, 0)} cal`;
};

/**
 * Format a number as grams
 * @param value The number of grams
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted gram string
 */
export const formatGrams = (value: number, decimals: number = 1): string => {
  return formatWithUnit(value, 'g', decimals);
};

/**
 * Format a number as milligrams
 * @param value The number of milligrams
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted milligram string
 */
export const formatMilligrams = (value: number, decimals: number = 1): string => {
  return formatWithUnit(value, 'mg', decimals);
};

/**
 * Format a number as micrograms
 * @param value The number of micrograms
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted microgram string
 */
export const formatMicrograms = (value: number, decimals: number = 1): string => {
  return formatWithUnit(value, 'µg', decimals);
};

export const formatMacro = (grams: number): string => {
  return `${Math.round(grams)}g`;
};

export const formatDate = (date: string | Date): string => {
  if (date instanceof Date) {
    return date.toLocaleDateString();
  }
  return new Date(date).toLocaleDateString();
};

export const formatAmount = (amount: number, unit: string): string => {
  return `${amount} ${unit}`;
};