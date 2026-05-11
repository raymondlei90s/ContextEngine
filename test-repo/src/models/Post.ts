import { User } from './User.js';

/**
 * Blog post model
 */
export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  publishedAt: Date;
}

/**
 * Post repository for managing blog posts
 */
export class PostRepository {
  private posts: Map<string, Post> = new Map();

  /**
   * Find all posts by author
   */
  async findByAuthor(authorId: string): Promise<Post[]> {
    return Array.from(this.posts.values()).filter((post) => post.authorId === authorId);
  }

  /**
   * Publish a new post
   */
  async publish(postData: Omit<Post, 'id' | 'publishedAt'>): Promise<Post> {
    const post: Post = {
      id: this.generateId(),
      ...postData,
      publishedAt: new Date(),
    };
    this.posts.set(post.id, post);
    return post;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
