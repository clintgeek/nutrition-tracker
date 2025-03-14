/**
 * Format a date string (YYYY-MM-DD) to a more readable format (e.g., "Jan 1, 2023")
 */
export const formatDate = (dateString: string): string => {
  // Parse the date string manually to avoid timezone issues
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // JavaScript months are 0-indexed
  const day = parseInt(dayStr);

  // Create date with explicit year, month, day in local timezone
  const date = new Date(year, month, day, 12, 0, 0);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format a date string (YYYY-MM-DD) to a readable format (e.g., "Monday, January 1")
 */
export const getReadableDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format a date string (YYYY-MM-DD) to display the day of week (e.g., "Monday")
 */
export const formatDayOfWeek = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  const today = new Date();

  // Get the date in local timezone instead of UTC
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Get a date N days ago in YYYY-MM-DD format
 */
export const getDateDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);

  // Get the date in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Get a date N days in the future in YYYY-MM-DD format
 */
export const getDateDaysFromNow = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);

  // Get the date in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Get an array of dates for the last N days (including today)
 * Returns an array of objects with date (YYYY-MM-DD) and label (e.g., "Mon")
 */
export const getLastNDays = (n: number): Array<{ date: string; label: string }> => {
  const dates: Array<{ date: string; label: string }> = [];
  for (let i = 0; i < n; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Get the date in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const label = date.toLocaleDateString('en-US', { weekday: 'short' });
    dates.push({ date: dateString, label });
  }
  return dates.reverse();
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: string, date2: string): boolean => {
  return date1 === date2;
};

/**
 * Format a time string (HH:MM) to a more readable format (e.g., "1:30 PM")
 */
export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Get the current time in HH:MM format
 */
export const getCurrentTime = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};