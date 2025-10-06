// src/app/utils/short-id-generator.ts
/**
 * Short ID Generator
 * 
 * Generates 10-character alphanumeric IDs for workflow templates.
 * Uses crypto.randomUUID() for randomness with Base62 encoding.
 * 
 * Format: 10 characters, alphanumeric (a-z, A-Z, 0-9)
 * Example: "a1B2c3D4e5"
 * 
 * Collision probability: ~1 in 839 quadrillion for 10 chars
 */

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a random 10-character short ID
 * 
 * Uses crypto.randomUUID() for secure randomness,
 * then encodes to Base62 and truncates to 10 chars.
 * 
 * @returns 10-character alphanumeric string
 */
export function generateShortId(): string {
  // Use crypto.randomUUID() for secure randomness
  const uuid = crypto.randomUUID();
  
  // Remove hyphens and convert to number
  const hex = uuid.replace(/-/g, '');
  
  // Convert hex to base62
  let num = BigInt('0x' + hex);
  let result = '';
  const base = BigInt(62);
  
  while (num > 0) {
    const remainder = Number(num % base);
    result = BASE62_CHARS[remainder] + result;
    num = num / base;
  }
  
  // Pad with leading characters if needed and take first 10 chars
  const padded = result.padStart(10, BASE62_CHARS[0]);
  return padded.substring(0, 10);
}

/**
 * Validate a short ID format
 * 
 * @param id - ID to validate
 * @returns true if valid format
 */
export function isValidShortId(id: string): boolean {
  return (
    typeof id === 'string' &&
    id.length === 10 &&
    /^[a-zA-Z0-9]{10}$/.test(id)
  );
}

/**
 * Generate multiple unique short IDs
 * 
 * @param count - Number of IDs to generate
 * @returns Array of unique short IDs
 */
export function generateShortIds(count: number): string[] {
  const ids = new Set<string>();
  
  while (ids.size < count) {
    ids.add(generateShortId());
  }
  
  return Array.from(ids);
}
