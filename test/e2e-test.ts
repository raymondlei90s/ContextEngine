/**
 * End-to-End Test for ContextEngine
 * Tests the complete pipeline from entity extraction to documentation generation
 */

import { PrismaClient } from '@prisma/client';
import { entityExtractor } from '../src/services/entity-extractor.js';
import { knowledgeGraphService } from '../src/services/knowledge-graph.js';
import { relationshipAnalyzer } from '../src/services/relationship-analyzer.js';
import { documentationGenerator } from '../src/services/documentation-generator.js';
import { documentationAnalyzer } from '../src/services/documentation-analyzer.js';
import { llmDocEnhancer } from '../src/services/llm-doc-enhancer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface TestResults {
  phase: string;
  success: boolean;
  details: any;
  error?: string;
}

const results: TestResults[] = [];

function logPhase(phase: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${phase}`);
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  console.log(`✓ ${message}`);
}

function logError(message: string, error?: any) {
  console.log(`✗ ${message}`);
  if (error) {
    console.error(error);
  }
}

async function cleanDatabase() {
  logPhase('Cleaning Database');

  try {
    await prisma.relationship.deleteMany({});
    await prisma.knowledgeEntity.deleteMany({});
    await prisma.project.deleteMany({});
    logSuccess('Database cleaned');
    return true;
  } catch (error) {
    logError('Failed to clean database', error);
    return false;
  }
}

async function testPhase1_EntityExtraction() {
  logPhase('Phase 1: Entity Extraction');

  try {
    const testRepoPath = path.join(__dirname, '..', 'test-repo', 'src');

    console.log(`Extracting entities from: ${testRepoPath}`);
    const result = await entityExtractor.extractFromDirectory(testRepoPath);

    console.log('\nExtraction Results:');
    console.log(`  Total entities: ${result.entities.length}`);
    console.log(`  Total relationships: ${result.relationships.length}`);

    console.log('\nEntity breakdown:');
    const byType = result.entities.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [type, count] of Object.entries(byType)) {
      console.log(`  ${type}: ${count}`);
    }

    console.log('\nRelationship breakdown:');
    const relByType = result.relationships.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [type, count] of Object.entries(relByType)) {
      console.log(`  ${type}: ${count}`);
    }

    logSuccess(`Extracted ${result.entities.length} entities and ${result.relationships.length} relationships`);

    results.push({
      phase: 'Entity Extraction',
      success: true,
      details: {
        entities: result.entities.length,
        relationships: result.relationships.length,
      },
    });

    return result;
  } catch (error) {
    logError('Entity extraction failed', error);
    results.push({
      phase: 'Entity Extraction',
      success: false,
      details: {},
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function testPhase2_KnowledgeGraph(projectId: string) {
  logPhase('Phase 2: Knowledge Graph Building');

  try {
    const testRepoPath = path.join(__dirname, '..', 'test-repo', 'src');

    console.log('Building knowledge graph...');
    const result = await knowledgeGraphService.buildFromRepository(projectId, testRepoPath);

    console.log('\nKnowledge Graph Results:');
    console.log(`  Entities created: ${result.entitiesCreated}`);
    console.log(`  Relationships created: ${result.relationshipsCreated}`);
    console.log(`  Embeddings generated: ${result.embeddingsGenerated}`);

    logSuccess('Knowledge graph built successfully');

    results.push({
      phase: 'Knowledge Graph',
      success: true,
      details: result,
    });

    return result;
  } catch (error) {
    logError('Knowledge graph building failed', error);
    results.push({
      phase: 'Knowledge Graph',
      success: false,
      details: {},
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function testPhase3_SemanticSearch(projectId: string) {
  logPhase('Phase 3: Semantic Search');

  try {
    const queries = [
      'user authentication',
      'password hashing',
      'blog post creation',
      'data validation',
    ];

    console.log('Running semantic searches...\n');

    for (const query of queries) {
      console.log(`Query: "${query}"`);
      const searchResults = await knowledgeGraphService.semanticSearch(projectId, query, 3);

      if (searchResults.length > 0) {
        console.log(`  Found ${searchResults.length} results:`);
        for (const result of searchResults) {
          console.log(`    - ${result.entity.name} (${result.entity.type}) - similarity: ${result.similarity.toFixed(3)}`);
        }
      } else {
        console.log('  No results found');
      }
      console.log();
    }

    logSuccess('Semantic search tests completed');

    results.push({
      phase: 'Semantic Search',
      success: true,
      details: { queries: queries.length },
    });

    return true;
  } catch (error) {
    logError('Semantic search failed', error);
    results.push({
      phase: 'Semantic Search',
      success: false,
      details: {},
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function testPhase4_RelationshipAnalysis(projectId: string) {
  logPhase('Phase 4: Relationship Analysis');

  try {
    console.log('Analyzing relationships...\n');

    // Get critical entities
    console.log('Finding critical entities...');
    const critical = await relationshipAnalyzer.findCriticalEntities(projectId, 5);
    console.log(`  Found ${critical.length} critical entities:`);
    for (const item of critical) {
      console.log(`    - ${item.entity.name}: criticality=${item.criticality} (in=${item.incomingCount}, out=${item.outgoingCount})`);
    }

    // Find orphaned entities
    console.log('\nFinding orphaned entities...');
    const orphaned = await relationshipAnalyzer.findOrphanedEntities(projectId);
    console.log(`  Found ${orphaned.length} orphaned entities`);
    if (orphaned.length > 0) {
      for (const entity of orphaned.slice(0, 3)) {
        console.log(`    - ${entity.name} (${entity.type})`);
      }
    }

    // Get statistics
    console.log('\nRelationship statistics:');
    const stats = await relationshipAnalyzer.getRelationshipStatistics(projectId);
    console.log(`  Total relationships: ${stats.totalRelationships}`);
    console.log(`  Average per entity: ${stats.averagePerEntity.toFixed(2)}`);
    console.log('  By type:');
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`    ${type}: ${count}`);
    }

    // Generate graph visualization data
    console.log('\nGenerating graph visualization...');
    const graphData = await relationshipAnalyzer.generateGraphVisualization(projectId, {
      maxNodes: 50,
    });
    console.log(`  Nodes: ${graphData.nodes.length}`);
    console.log(`  Edges: ${graphData.edges.length}`);
    console.log(`  Density: ${graphData.statistics.density.toFixed(4)}`);
    console.log(`  Clusters: ${graphData.statistics.clusters}`);

    logSuccess('Relationship analysis completed');

    results.push({
      phase: 'Relationship Analysis',
      success: true,
      details: {
        critical: critical.length,
        orphaned: orphaned.length,
        graphNodes: graphData.nodes.length,
        graphEdges: graphData.edges.length,
      },
    });

    return true;
  } catch (error) {
    logError('Relationship analysis failed', error);
    results.push({
      phase: 'Relationship Analysis',
      success: false,
      details: {},
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function testPhase5_DocumentationGeneration(projectId: string) {
  logPhase('Phase 5: Documentation Generation');

  try {
    console.log('Analyzing documentation coverage...');
    const coverage = await documentationAnalyzer.analyzeCoverage(projectId);

    console.log('\nCoverage Analysis:');
    console.log(`  Total entities: ${coverage.totalEntities}`);
    console.log(`  Documented: ${coverage.documentedEntities}`);
    console.log(`  Coverage: ${coverage.coveragePercentage.toFixed(2)}%`);
    console.log('\n  By type:');
    for (const [type, stats] of Object.entries(coverage.byType)) {
      console.log(`    ${type}: ${stats.documented}/${stats.total} (${stats.coverage.toFixed(1)}%)`);
    }

    // Generate documentation for a few entities
    console.log('\nGenerating sample documentation...');
    const entities = await prisma.knowledgeEntity.findMany({
      where: { projectId },
      take: 3,
    });

    const docs = [];
    for (const entity of entities) {
      const doc = await documentationGenerator.generateForEntity(entity.id, {
        format: 'markdown',
        includeRelationships: true,
        includeExamples: false,
        includeMetadata: true,
      });
      docs.push(doc);
      console.log(`  ✓ Generated docs for ${entity.name} (${doc.metadata?.wordCount} words)`);
    }

    // Generate project documentation
    console.log('\nGenerating project documentation...');
    const projectDocs = await documentationGenerator.generateForProject(projectId, {
      format: 'markdown',
      includeRelationships: true,
      includeMetadata: true,
    });

    console.log(`  Generated ${projectDocs.entities.length} documentation files`);
    console.log(`  Coverage: ${projectDocs.summary.coverage.toFixed(2)}%`);

    // Analyze quality for sample entities
    console.log('\nAnalyzing documentation quality...');
    for (const entity of entities.slice(0, 2)) {
      const quality = await documentationAnalyzer.analyzeQuality(entity.id);
      console.log(`  ${entity.name}:`);
      console.log(`    Overall score: ${quality.scores.overall.toFixed(1)}/100`);
      console.log(`    Description: ${quality.scores.descriptionQuality.toFixed(1)}/100`);
      console.log(`    Relationships: ${quality.scores.relationshipDocumentation.toFixed(1)}/100`);
      if (quality.issues.length > 0) {
        console.log(`    Issues: ${quality.issues.length}`);
      }
    }

    logSuccess('Documentation generation completed');

    results.push({
      phase: 'Documentation Generation',
      success: true,
      details: {
        coverage: coverage.coveragePercentage,
        docsGenerated: projectDocs.entities.length,
      },
    });

    return entities[0]?.id; // Return first entity ID for AI enhancement test
  } catch (error) {
    logError('Documentation generation failed', error);
    results.push({
      phase: 'Documentation Generation',
      success: false,
      details: {},
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function testPhase6_AIEnhancement(entityId: string | null) {
  logPhase('Phase 6: AI-Powered Enhancement');

  if (!entityId) {
    console.log('⊘ Skipping AI enhancement (no entity available)');
    return false;
  }

  if (!llmDocEnhancer.isEnabled()) {
    console.log('⊘ Skipping AI enhancement (ANTHROPIC_API_KEY not set)');
    results.push({
      phase: 'AI Enhancement',
      success: true,
      details: { skipped: true, reason: 'API key not set' },
    });
    return false;
  }

  try {
    console.log('Testing AI-powered description enhancement...\n');

    const entity = await prisma.knowledgeEntity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      console.log('⊘ Entity not found');
      return false;
    }

    console.log(`Enhancing: ${entity.name}`);
    console.log(`Original: ${entity.description || '(no description)'}\n`);

    const enhanced = await llmDocEnhancer.enhanceDescription(entityId, {
      includeContext: true,
      tone: 'technical',
    });

    console.log('Enhanced description:');
    console.log(enhanced.enhanced);
    console.log(`\nTokens used: ${enhanced.metadata.tokensUsed}`);
    console.log(`Model: ${enhanced.metadata.modelUsed}`);

    // Test example generation
    console.log('\nGenerating code examples...');
    const examples = await llmDocEnhancer.generateExamples(entityId, 1);

    if (examples.length > 0) {
      console.log(`Generated ${examples.length} example(s):`);
      for (const example of examples) {
        console.log(`\n  ${example.description}`);
        console.log(`  Language: ${example.language}`);
        console.log(`  Lines: ${example.code.split('\n').length}`);
      }
    }

    logSuccess('AI enhancement completed');

    results.push({
      phase: 'AI Enhancement',
      success: true,
      details: {
        tokensUsed: enhanced.metadata.tokensUsed,
        examplesGenerated: examples.length,
      },
    });

    return true;
  } catch (error) {
    logError('AI enhancement failed', error);
    results.push({
      phase: 'AI Enhancement',
      success: false,
      details: {},
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function printSummary() {
  logPhase('Test Summary');

  console.log('\nResults:');
  console.log('--------');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    const status = result.success ? '✓' : '✗';
    const color = result.success ? '' : '';

    if ((result.details as any)?.skipped) {
      console.log(`⊘ ${result.phase} - SKIPPED`);
      skipped++;
    } else if (result.success) {
      console.log(`${status} ${result.phase} - PASSED`);
      passed++;
    } else {
      console.log(`${status} ${result.phase} - FAILED`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log('='.repeat(60));

  return failed === 0;
}

async function main() {
  console.log('ContextEngine End-to-End Test');
  console.log('==============================\n');

  const startTime = Date.now();

  try {
    // Clean database
    await cleanDatabase();

    // Create test project
    logPhase('Setup: Creating Test Project');
    const project = await prisma.project.create({
      data: {
        name: 'Test Blog Application',
        repoUrl: 'file://./test-repo',
      },
    });
    logSuccess(`Test project created: ${project.id}`);

    // Run all test phases
    await testPhase1_EntityExtraction();
    await testPhase2_KnowledgeGraph(project.id);
    await testPhase3_SemanticSearch(project.id);
    await testPhase4_RelationshipAnalysis(project.id);
    const entityId = await testPhase5_DocumentationGeneration(project.id);
    await testPhase6_AIEnhancement(entityId);

    // Print summary
    const success = await printSummary();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nCompleted in ${duration}s`);

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
    await printSummary();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
