const TEN_DIGIT_CHECKSUM_WEIGHTS = [2, 4, 10, 3, 5, 9, 4, 6, 8];
const TWELVE_DIGIT_FIRST_CHECKSUM_WEIGHTS = [
  7, 2, 4, 10, 3, 5, 9, 4, 6, 8,
];
const TWELVE_DIGIT_SECOND_CHECKSUM_WEIGHTS = [
  3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8,
];

// Spaces and punctuation commonly used to split long identifiers for display.
// Any other non-digit character is deliberately rejected.
const RUSSIAN_INN_SEPARATOR_PATTERN = /[\s./()\-\u2010-\u2015]/gu;
const RUSSIAN_INN_INPUT_PATTERN = /^[0-9\s./()\-\u2010-\u2015]+$/u;

export class InvalidRussianInnError extends Error {
  constructor(message = "Некорректный ИНН") {
    super(message);
    this.name = "InvalidRussianInnError";
  }
}

const calculateChecksumDigit = (
  digits: readonly number[],
  weights: readonly number[],
): number =>
  weights.reduce((sum, weight, index) => sum + weight * digits[index], 0) %
  11 %
  10;

const hasValidChecksum = (inn: string): boolean => {
  const digits = [...inn].map(Number);

  if (inn.length === 10) {
    return (
      calculateChecksumDigit(digits, TEN_DIGIT_CHECKSUM_WEIGHTS) === digits[9]
    );
  }

  return (
    calculateChecksumDigit(digits, TWELVE_DIGIT_FIRST_CHECKSUM_WEIGHTS) ===
      digits[10] &&
    calculateChecksumDigit(digits, TWELVE_DIGIT_SECOND_CHECKSUM_WEIGHTS) ===
      digits[11]
  );
};

/**
 * Converts a Russian INN to its canonical digits-only representation.
 *
 * This is the strict path for current API input: only strings are accepted,
 * common visual separators may be present, and both length and checksum must
 * be valid. The returned value is always exactly 10 or 12 ASCII digits.
 */
export const normalizeRussianInn = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new InvalidRussianInnError("ИНН должен быть строкой");
  }

  const trimmed = value.trim();
  if (!trimmed || !RUSSIAN_INN_INPUT_PATTERN.test(trimmed)) {
    throw new InvalidRussianInnError(
      "ИНН должен содержать только цифры и допустимые разделители",
    );
  }

  const normalized = trimmed.replace(RUSSIAN_INN_SEPARATOR_PATTERN, "");
  if (normalized.length !== 10 && normalized.length !== 12) {
    throw new InvalidRussianInnError("ИНН должен содержать 10 или 12 цифр");
  }

  // Such values satisfy the arithmetic checksum but are not issued INNs.
  if (/^(\d)\1+$/u.test(normalized) || !hasValidChecksum(normalized)) {
    throw new InvalidRussianInnError("Некорректная контрольная сумма ИНН");
  }

  return normalized;
};

export const isValidRussianInn = (value: unknown): boolean => {
  try {
    normalizeRussianInn(value);
    return true;
  } catch (error) {
    if (error instanceof InvalidRussianInnError) return false;
    throw error;
  }
};

/**
 * Best-effort conversion for historical database values. Invalid records stay
 * unnormalized (NULL in the new column) and can be reviewed without blocking
 * the schema migration.
 */
export const normalizeLegacyRussianInn = (value: unknown): string | null => {
  try {
    return normalizeRussianInn(value);
  } catch (error) {
    if (error instanceof InvalidRussianInnError) return null;
    throw error;
  }
};
