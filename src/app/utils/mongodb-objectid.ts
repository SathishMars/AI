/**
 * MongoDB ObjectID Utility
 * Provides client-side generation of valid MongoDB ObjectIDs
 * Compatible with MongoDB 5.0 and AWS DocumentDB
 */

/**
 * Generate a valid MongoDB ObjectID string
 * Format: 24 character hex string (12 bytes)
 * Structure: [4-byte timestamp][5-byte random][3-byte counter]
 */
export function generateObjectId(): string {
  // Get current timestamp (4 bytes)
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Generate random bytes (5 bytes)
  const randomBytes = Array.from({ length: 5 }, () => 
    Math.floor(Math.random() * 256)
  );
  
  // Generate counter bytes (3 bytes)
  const counter = Math.floor(Math.random() * 0xFFFFFF);
  const counterBytes = [
    (counter >> 16) & 0xFF,
    (counter >> 8) & 0xFF,
    counter & 0xFF
  ];
  
  // Combine all bytes
  const bytes = [
    (timestamp >> 24) & 0xFF,
    (timestamp >> 16) & 0xFF,
    (timestamp >> 8) & 0xFF,
    timestamp & 0xFF,
    ...randomBytes,
    ...counterBytes
  ];
  
  // Convert to hex string
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate if a string is a valid MongoDB ObjectID format
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Generate a valid session ID for MongoDB operations
 */
export function generateSessionId(): string {
  return generateObjectId();
}

/**
 * Generate a valid workflow ID for MongoDB operations
 */
export function generateWorkflowId(): string {
  return generateObjectId();
}