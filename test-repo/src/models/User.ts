/**
 * User model representing a system user
 */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

/**
 * User repository for data access
 */
export class UserRepository {
  private users: Map<string, User> = new Map();

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  /**
   * Create a new user
   */
  async create(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      id: this.generateId(),
      ...userData,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
