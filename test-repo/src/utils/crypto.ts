/**
 * Hash a password using bcrypt-like algorithm
 */
export async function hashPassword(password: string): Promise<string> {
  // Mock implementation
  return `hashed_${password}`;
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return hash === `hashed_${password}`;
}

/**
 * Generate a random salt
 */
export function generateSalt(): string {
  return Math.random().toString(36).substring(2, 15);
}
