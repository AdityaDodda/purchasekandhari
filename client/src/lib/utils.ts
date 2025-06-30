import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency with consistent decimal places
 * @param amount - The amount to format
 * @param currency - The currency symbol (default: ₹)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string | null | undefined, currency: string = "₹"): string {
  if (amount === null || amount === undefined) {
    return `${currency}0.00`
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) {
    return `${currency}0.00`
  }
  
  return `${currency}${numAmount.toFixed(2)}`
}

/**
 * Formats a date to dd-mm-yyyy format
 * @param date - Date to format (Date object, string, or timestamp)
 * @returns Formatted date string in dd-mm-yyyy format
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) {
    return 'N/A'
  }

  let dateObj: Date;
  if (typeof date === 'string') {
    // Check for dd-mm-yyyy format
    const ddmmyyyy = date.match(/^\d{2}-\d{2}-\d{4}$/);
    if (ddmmyyyy) {
      const [day, month, year] = date.split('-');
      dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = new Date(date);
  }

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }

  const day = dateObj.getDate().toString().padStart(2, '0')
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getFullYear()

  return `${day}-${month}-${year}`
}

/**
 * Formats a date for HTML date input (yyyy-mm-dd format)
 * @param date - Date to format
 * @returns Formatted date string for HTML date input
 */
export function formatDateForInput(date: Date | string | number | null | undefined): string {
  if (!date) {
    return ''
  }
  
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return ''
  }
  
  const year = dateObj.getFullYear()
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const day = dateObj.getDate().toString().padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Formats a date and time together (dd-mm-yyyy HH:MM format)
 * @param date - Date to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) {
    return 'N/A'
  }
  
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }
  
  const day = dateObj.getDate().toString().padStart(2, '0')
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getFullYear()
  const hours = dateObj.getHours().toString().padStart(2, '0')
  const minutes = dateObj.getMinutes().toString().padStart(2, '0')
  
  return `${day}-${month}-${year} ${hours}:${minutes}`
}
