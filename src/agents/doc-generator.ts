/**
 * Documentation Generator Agent
 * Generates actual documentation using Claude with audience-aware prompts
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../core/config.js';
import logger from '../utils/logger.js';
import { TargetAudience } from '../core/types.js';

interface DocTask {
  id: string;
  type: string;
  path: string;
  metadata: {
    title: string;
    description: string;
    audience: TargetAudience;
    style: string;
  };
  context: any;
}

interface GeneratedDoc {
  success: boolean;
  content: string;
  tokensUsed: number;
}

export class DocGeneratorAgent {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  /**
   * Generate documentation for a task
   */
  async generateDoc(docTask: DocTask, repoContext: any): Promise<GeneratedDoc> {
    logger.info('Generating documentation', {
      path: docTask.path,
      audience: docTask.metadata.audience,
    });

    const systemPrompt = this.buildSystemPrompt(docTask);
    const userPrompt = this.buildUserPrompt(docTask, repoContext);

    try {
      const response = await this.client.messages.create({
        model: config.anthropic.model,
        max_tokens: 16384,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // Extract text content
      let finalResponse = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          finalResponse += block.text;
        }
      }

      if (!finalResponse) {
        throw new Error('No response from Claude');
      }

      // Extract MDX content
      const mdxContent = this.extractMdxContent(finalResponse);

      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      logger.info('Documentation generated', {
        path: docTask.path,
        tokensUsed,
        contentLength: mdxContent.length,
      });

      return {
        success: true,
        content: mdxContent,
        tokensUsed,
      };
    } catch (error) {
      logger.error('Failed to generate documentation', {
        path: docTask.path,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Build system prompt based on audience
   */
  private buildSystemPrompt(docTask: DocTask): string {
    const audience = docTask.metadata.audience;

    if (audience === 'end-users') {
      return `You are a user guide documentation expert. Generate clear, user-friendly Mintlify MDX documentation for non-technical users.

Guidelines:
- Use plain language - avoid technical jargon
- Focus on WHAT users can do, not HOW it's implemented internally
- Include screenshot placeholders where UI elements are described: ![Description](/images/screenshot-name.png)
- Use numbered steps for procedures
- Explain WHY features are useful and when to use them
- NO CODE examples unless showing UI elements or user-visible text
- Use active voice and direct instructions ("Click the button" not "The button can be clicked")
- Anticipate common questions and address them
- Keep paragraphs short (2-3 sentences)
- Use bullet points for lists of features or options

Always return complete, well-structured documentation.`;
    } else {
      // Developer-focused documentation
      return `You are a technical documentation expert. Generate clear, comprehensive Mintlify MDX documentation for developers.

Guidelines:
- Include code examples showing usage
- Reference APIs, methods, properties, and events
- Explain technical details and architecture when relevant
- Show installation and setup commands
- Document parameters, return types, and error handling
- Use TypeScript for type annotations when applicable
- Provide realistic, working code samples
- Link to related concepts and dependencies
- Cover edge cases and common pitfalls
- Include testing examples when appropriate

Always return complete, well-structured documentation.`;
    }
  }

  /**
   * Build user prompt for the documentation task
   */
  private buildUserPrompt(docTask: DocTask, repoContext: any): string {
    const { title, description, audience, style } = docTask.metadata;

    return `You are generating Mintlify MDX documentation.

**CRITICAL**: Return ONLY the raw MDX content wrapped in a \`\`\`mdx code block. Do NOT include explanations, descriptions, or meta-commentary.

**Document**: ${title}
**Type**: ${style}
**Audience**: ${audience}
**File Path**: ${docTask.path}

**Project Context**:
- Name: ${repoContext.name || 'Unknown'}
- Description: ${repoContext.description || 'No description'}
- Technology: ${repoContext.technology?.primary || 'Unknown'}
- Project Type: ${repoContext.projectType || 'Unknown'}

**Your Task**:
Generate complete MDX documentation for "${title}" following this structure:

\`\`\`mdx
---
title: "${title}"
description: "${description}"
---

# ${title}

${description}

[Include appropriate sections based on the document type and audience]

${audience === 'end-users' ? `
## What You Can Do

[List key features in plain language]

## How to Get Started

[Step-by-step instructions with screenshots placeholders]

## Common Tasks

[Numbered procedures for common use cases]

## FAQ

[Anticipated questions]
` : `
## Overview

[Technical overview]

## Installation

\`\`\`bash
# Installation commands
\`\`\`

## Usage

\`\`\`typescript
// Code examples
\`\`\`

## API Reference

[API documentation if applicable]

## Examples

[More detailed examples]
`}

\`\`\`

**Requirements**:
1. Start with frontmatter (title, description)
2. Use Mintlify MDX format
3. Match the audience level (${audience})
4. Be comprehensive but concise
5. Include examples appropriate for the audience

Generate the complete documentation now:`;
  }

  /**
   * Extract MDX content from Claude response
   */
  private extractMdxContent(response: string): string {
    // Try to extract from MDX code blocks
    let mdxMatch = response.match(/```mdx\s*\n([\s\S]+)\n?```\s*$/);
    if (mdxMatch) {
      return mdxMatch[1];
    }

    // Try without closing backticks (incomplete response)
    mdxMatch = response.match(/```mdx\s*\n([\s\S]+)$/);
    if (mdxMatch) {
      return mdxMatch[1];
    }

    // Try markdown code blocks
    let markdownMatch = response.match(/```markdown\s*\n([\s\S]+)\n?```\s*$/);
    if (markdownMatch) {
      return markdownMatch[1];
    }

    // Try without closing backticks
    markdownMatch = response.match(/```markdown\s*\n([\s\S]+)$/);
    if (markdownMatch) {
      return markdownMatch[1];
    }

    // If response starts with frontmatter, assume it's already MDX
    if (response.trim().startsWith('---')) {
      return response;
    }

    // Return as-is if no code block found
    return response;
  }
}
