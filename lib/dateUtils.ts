/**
 * Utility functions for date formatting
 */

/**
 * Format date to dd/mm/yyyy format
 * @param date - Date object, string, or number
 * @returns Formatted date string in dd/mm/yyyy format
 */
export function formatDateToDDMMYYYY(date: Date | string | number): string {
  const dateObj = new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Format date to dd/mm/yyyy with time
 * @param date - Date object, string, or number
 * @returns Formatted date string in dd/mm/yyyy HH:MM format
 */
export function formatDateTimeToDDMMYYYY(date: Date | string | number): string {
  const dateObj = new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format date for display (compatibility with existing code)
 * @param date - Date object, string, or number
 * @returns Formatted date string in dd/mm/yyyy format
 */
export function formatDate(date: Date | string | number): string {
  return formatDateToDDMMYYYY(date);
}
