import { PostRepository } from '../models/Post.js';
import { UserRepository } from '../models/User.js';
import { validateContent } from '../utils/validation.js';

/**
 * Service for managing blog posts
 */
export class PostService {
  constructor(
    private postRepository: PostRepository,
    private userRepository: UserRepository
  ) {}

  /**
   * Create and publish a new post
   */
  async createPost(authorId: string, title: string, content: string): Promise<string> {
    const author = await this.userRepository.findById(authorId);
    if (!author) {
      throw new Error('Author not found');
    }

    if (!validateContent(content)) {
      throw new Error('Invalid content');
    }

    const post = await this.postRepository.publish({
      title,
      content,
      authorId,
    });

    return post.id;
  }

  /**
   * Get all posts by a user
   */
  async getUserPosts(userId: string): Promise<any[]> {
    return await this.postRepository.findByAuthor(userId);
  }
}
