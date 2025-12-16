/**
 * Semantic Version Comparison Utility
 * Parses and compares semantic versions (MAJOR.MINOR.PATCH)
 * Used for determining which database migration scripts have already been applied
 */

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

/**
 * Parse a semantic version string into components
 * @param version - Version string (e.g., "1.0.0", "2.3.1")
 * @returns Parsed version object, or null if invalid
 */
export function parseVersion(version: string): SemanticVersion | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: version,
  };
}

/**
 * Compare two semantic versions
 * @param versionA - First version string
 * @param versionB - Second version string
 * @returns -1 if A < B, 0 if A === B, 1 if A > B
 */
export function compareVersions(versionA: string, versionB: string): number {
  const a = parseVersion(versionA);
  const b = parseVersion(versionB);

  if (!a || !b) {
    throw new Error(`Invalid version format: ${!a ? versionA : versionB}`);
  }

  // Compare major
  if (a.major !== b.major) {
    return a.major < b.major ? -1 : 1;
  }

  // Compare minor
  if (a.minor !== b.minor) {
    return a.minor < b.minor ? -1 : 1;
  }

  // Compare patch
  if (a.patch !== b.patch) {
    return a.patch < b.patch ? -1 : 1;
  }

  return 0;
}

/**
 * Sort an array of version strings in ascending order
 * @param versions - Array of version strings
 * @returns Sorted array
 */
export function sortVersions(versions: string[]): string[] {
  return [...versions].sort((a, b) => compareVersions(a, b));
}

/**
 * Check if a version string is valid semantic version format
 * @param version - Version string to validate
 * @returns true if valid, false otherwise
 */
export function isValidVersion(version: string): boolean {
  return parseVersion(version) !== null;
}
