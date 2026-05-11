/**
 * Core type definitions for ContextEngine
 */

// Project Configuration
export interface ProjectConfig {
  id: string;
  name: string;
  repoUrl: string;
  repoType: 'github' | 'gitlab';
  docFramework: DocFramework;
  targetAudience: TargetAudience;
  docStyle: DocStyle;
}

export type DocFramework =
  | 'mintlify'
  | 'docusaurus'
  | 'vitepress'
  | 'starlight'
  | 'docus'
  | 'docsify';

export type TargetAudience =
  | 'developers'
  | 'end-users'
  | 'mixed';

export type DocStyle =
  | 'api-reference'
  | 'user-guide'
  | 'tutorial'
  | 'how-to'
  | 'explanatory';

// Events
export interface WebhookEvent {
  id: string;
  provider: 'github' | 'gitlab' | 'jira' | 'confluence' | 'slack';
  eventType: string;
  payload: Record<string, any>;
  receivedAt: Date;
}

export interface GitHubPushEvent {
  repository: {
    id: number;
    name: string;
    full_name: string;
    clone_url: string;
  };
  commits: Array<{
    id: string;
    message: string;
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  ref: string;
}

export interface GitLabPushEvent {
  project: {
    id: number;
    name: string;
    path_with_namespace: string;
    http_url: string;
  };
  commits: Array<{
    id: string;
    message: string;
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  ref: string;
}

// Knowledge Graph
export interface KnowledgeEntity {
  id: string;
  projectId: string;
  type: EntityType;
  name: string;
  description?: string;
  embeddings?: number[];
  metadata?: Record<string, any>;
  sourceFile?: string;
  sourceLine?: number;
}

export type EntityType =
  | 'Class'
  | 'Function'
  | 'API'
  | 'Concept'
  | 'Product';

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength: number; // 0-1
  metadata?: Record<string, any>;
}

export type RelationshipType =
  | 'DEPENDS_ON'
  | 'IMPLEMENTS'
  | 'DOCUMENTED_IN'
  | 'RELATED_TO';

// Documentation Generation
export interface GenerationTask {
  id: string;
  projectId: string;
  type: 'full-generation' | 'incremental-update' | 'quality-improvement';
  priority: 'low' | 'medium' | 'high';
  trigger: TriggerType;
  context: GenerationContext;
  status: 'queued' | 'running' | 'completed' | 'failed';
}

export type TriggerType =
  | 'webhook'
  | 'schedule'
  | 'manual';

export interface GenerationContext {
  repoAnalysis?: RepoAnalysis;
  changedFiles?: string[];
  affectedDocs?: string[];
  targetAudience: TargetAudience;
  docStyle: DocStyle;
}

export interface RepoAnalysis {
  projectType: string;
  technology: {
    primary: string;
    framework?: string;
  };
  targetAudience: {
    primary: TargetAudience;
    secondary?: TargetAudience;
    reasoning: string;
  };
  documentationStyle: {
    primary: DocStyle;
    secondary?: DocStyle;
  };
  structure: {
    entrypoint?: string;
    components?: string[];
    apis?: string[];
    utilities?: string[];
  };
}

// Documentation Output
export interface GeneratedDoc {
  id: string;
  projectId: string;
  filePath: string;
  content: string;
  metadata: DocMetadata;
  quality: QualityMetrics;
}

export interface DocMetadata {
  title: string;
  description?: string;
  audience: TargetAudience;
  style: DocStyle;
  framework: DocFramework;
  version: number;
}

export interface QualityMetrics {
  qualityScore?: number;
  alignmentScore?: number;
  completenessScore?: number;
  readabilityScore?: number;
}

// Analytics
export interface DocAnalytics {
  docId: string;
  projectId: string;
  pageviews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  scrollDepth: number;
  thumbsUp: number;
  thumbsDown: number;
  feedbackComments: string[];
  aiQueries: number;
  aiConfidence: number;
}

// Agent Communication
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  content: string;
  confidence: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
  metadata?: Record<string, any>;
}

// Job Queue
export interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

// Configuration
export interface Config {
  app: {
    nodeEnv: string;
    port: number;
    logLevel: string;
  };
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  anthropic: {
    apiKey: string;
    model: string;
  };
  github?: {
    appId: string;
    privateKey: string;
    webhookSecret: string;
  };
  gitlab?: {
    accessToken: string;
    webhookSecret: string;
  };
  features: {
    learningLoop: boolean;
    autonomousMode: boolean;
    multiFramework: boolean;
    knowledgeGraph: boolean;
  };
}
