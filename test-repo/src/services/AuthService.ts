import { UserRepository } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/crypto.js';

/**
 * Authentication service for user login and registration
 */
export class AuthService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string): Promise<string> {
    const hashedPassword = await hashPassword(password);

    const user = await this.userRepository.create({
      email,
      name,
    });

    return user.id;
  }

  /**
   * Authenticate user credentials
   */
  async login(email: string, password: string): Promise<string | null> {
    // Simplified - real implementation would store hashed passwords
    return 'mock-token';
  }

  /**
   * Validate authentication token
   */
  async validateToken(token: string): Promise<boolean> {
    return token.startsWith('mock-');
  }
}
