/**
 * Pakistan Time Utility
 * 
 * Provides functions to get current date and time in Pakistan timezone (PKT/Asia/Karachi)
 */

/**
 * Get current date and time in Pakistan timezone
 * Use proper timezone conversion via toLocaleString
 */
export function getPakistanDateTime(): Date {
  // Get Pakistan time string using proper timezone
  const pakistanTimeString = new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse the Pakistan time string back to Date object
  return new Date(pakistanTimeString);
}

/**
 * Get Pakistan date string in YYYY-MM-DD format
 */
export function getPakistanDateString(): string {
  const pakistanDate = new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Convert from MM/DD/YYYY to YYYY-MM-DD
  const [month, day, year] = pakistanDate.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Format Pakistan time for display
 * @returns Formatted string like "Saturday, November 08, 2025 - 01:51 AM"
 */
export function formatPakistanDateTime(): string {
  const date = getPakistanDateTime();
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Karachi',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Get just the time portion in Pakistan timezone
 * @returns Time string like "01:51 AM"
 */
export function getPakistanTimeString(): string {
  const date = getPakistanDateTime();
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Get day of week in Pakistan timezone (0=Sunday, 6=Saturday)
 */
export function getPakistanDayOfWeek(): number {
  const dateString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  return new Date(dateString).getDay();
}

/**
 * Get yesterday's date in Pakistan timezone (YYYY-MM-DD format)
 * Used for Friday auto-submit logic
 */
export function getYesterdayPakistanDateString(): string {
  // Get today in Pakistan timezone
  const today = new Date();
  const pakistanDateString = today.toLocaleString('en-US', { 
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Parse to get components
  const [month, day, year] = pakistanDateString.split('/');
  
  // Create a Date object with Pakistan date
  const pakistanToday = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
  
  // Subtract one day
  const yesterday = new Date(pakistanToday);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format as YYYY-MM-DD
  const yearStr = yesterday.getFullYear();
  const monthStr = String(yesterday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(yesterday.getDate()).padStart(2, '0');
  
  return `${yearStr}-${monthStr}-${dayStr}`;
}

/**
 * Get yesterday's day of week in Pakistan timezone (0=Sunday, 5=Friday, 6=Saturday)
 */
export function getYesterdayPakistanDayOfWeek(): number {
  // Get yesterday's date string
  const yesterdayDateStr = getYesterdayPakistanDateString();
  
  // Parse it and get day of week
  const yesterday = new Date(yesterdayDateStr + 'T00:00:00');
  return yesterday.getDay();
}
