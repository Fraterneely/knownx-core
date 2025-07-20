import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * A utility function that merges multiple class names together,
 * handling Tailwind CSS conflicts properly.
 * 
 * @param {...string} inputs - Class names or conditional class expressions
 * @returns {string} - Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}