/**
 * Validates a barcode/UPC code format
 * Supports:
 * - UPC-A (12 digits)
 * - EAN-13 (13 digits)
 * - UPC-E (8 digits)
 * - EAN-8 (8 digits)
 */
export const validateBarcode = (barcode: string): { isValid: boolean; format?: string; error?: string } => {
  if (!barcode) {
    return { isValid: false, error: 'Barcode is empty' };
  }

  // Remove any whitespace
  const cleanBarcode = barcode.trim();

  // Check if barcode contains only digits
  if (!/^\d+$/.test(cleanBarcode)) {
    return { isValid: false, error: 'Barcode should contain only numbers' };
  }

  // Validate based on length
  switch (cleanBarcode.length) {
    case 8:
      return { isValid: true, format: 'UPC-E/EAN-8' };
    case 12:
      return { isValid: true, format: 'UPC-A' };
    case 13:
      return { isValid: true, format: 'EAN-13' };
    default:
      return {
        isValid: false,
        error: 'Invalid barcode length. Must be 8, 12, or 13 digits'
      };
  }
};

/**
 * Formats a barcode for display
 * Adds spaces for readability based on format
 */
export const formatBarcodeForDisplay = (barcode: string): string => {
  if (!barcode) return '';

  const cleanBarcode = barcode.trim();

  // Format based on length
  switch (cleanBarcode.length) {
    case 8: // UPC-E/EAN-8
      return `${cleanBarcode.slice(0, 4)} ${cleanBarcode.slice(4)}`;
    case 12: // UPC-A
      return `${cleanBarcode.slice(0, 1)} ${cleanBarcode.slice(1, 6)} ${cleanBarcode.slice(6, 11)} ${cleanBarcode.slice(11)}`;
    case 13: // EAN-13
      return `${cleanBarcode.slice(0, 1)} ${cleanBarcode.slice(1, 7)} ${cleanBarcode.slice(7, 13)}`;
    default:
      return barcode;
  }
};