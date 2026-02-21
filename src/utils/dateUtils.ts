
/**
 * Parses a date string in YYYY-MM-DD format as a local date.
 * This avoids the "off by one" issue caused by UTC parsing.
 */
export const parseLocalDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month - 1, day);
};

/**
 * Formats a date string in YYYY-MM-DD format to a localized Hebrew string.
 */
export const formatLocalDate = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return '';
  return date.toLocaleDateString('he-IL');
};
