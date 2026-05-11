/**
 * Integration Test
 * Tests the complete end-to-end documentation generation pipeline
 */

import { PrismaClient } from '@prisma/client';
import { queueManager } from './src/infrastructure/job-queue.js';
import logger from './src/utils/logger.js';
import { RepoAnalyzerAgent } from './src/agents/repo-analyzer.js';
import { DocPlannerAgent } from './src/agents/doc-planner.js';
import { DocGeneratorAgent } from './src/agents/doc-generator.js';
import { MintlifyAdapter, DocFile } from './src/adapters/mintlify-adapter.js';
import path from 'path';

const prisma = new PrismaClient();

async function runIntegrationTest() {
  logger.info('Starting integration test...');

  try {
    // 1. Create a test project
    logger.info('Step 1: Creating test project...');
    const project = await prisma.project.create({
      data: {
        name: 'SGDS Web Component',
        repoUrl: 'https://github.com/GovTechSG/sgds-web-component',
        repoType: 'github',
        docFramework: 'mintlify',
        targetAudience: 'mixed',
        status: 'active',
      },
    });

    logger.info('Test project created', { projectId: project.id });

    // 2. Analyze repository
    logger.info('Step 2: Analyzing repository...');
    const analyzer = new RepoAnalyzerAgent();
    const analysis = await analyzer.analyze(project.repoUrl);

    logger.info('Repository analysis complete', {
      projectType: analysis.projectType,
      technology: analysis.technology.primary,
      audience: analysis.targetAudience.primary,
    });

    // Update project with analysis
    await prisma.project.update({
      where: { id: project.id },
      data: {
        targetAudience: analysis.targetAudience.primary,
      },
    });

    // 3. Plan documentation
    logger.info('Step 3: Planning documentation structure...');
    const planner = new DocPlannerAgent();
    const plan = await planner.plan(analysis);

    logger.info('Documentation plan created', {
      totalTasks: plan.totalTasks,
      tasks: plan.tasks.map((t) => ({ title: t.metadata.title, path: t.path })),
    });

    // 4. Generate documentation (limit to first 3 for testing)
    logger.info('Step 4: Generating documentation (first 3 docs)...');
    const generator = new DocGeneratorAgent();
    const generatedDocs: DocFile[] = [];
    const docsToGenerate = plan.tasks.slice(0, 3);

    for (const task of docsToGenerate) {
      logger.info('Generating documentation', {
        path: task.path,
        title: task.metadata.title,
      });

      const doc = await generator.generateDoc(task, analysis);

      // Save to database
      await prisma.generatedDoc.create({
        data: {
          projectId: project.id,
          filePath: task.path,
          title: task.metadata.title,
          content: doc.content,
          audience: task.metadata.audience,
          status: 'published',
          lastUpdatedAt: new Date(),
          lastCodeChangeAt: new Date(),
        },
      });

      generatedDocs.push({
        path: task.path,
        content: doc.content,
        title: task.metadata.title,
        category: task.category,
      });

      logger.info('Documentation generated', {
        path: task.path,
        tokensUsed: doc.tokensUsed,
        contentLength: doc.content.length,
      });
    }

    // 5. Write to Mintlify format
    logger.info('Step 5: Writing Mintlify documentation...');
    const outputDir = path.join(process.cwd(), 'output', 'test-' + project.id);
    const mintlifyAdapter = new MintlifyAdapter(outputDir);

    await mintlifyAdapter.writeAll(project.name, generatedDocs);

    logger.info('Mintlify documentation written', {
      outputDir,
      filesWritten: generatedDocs.length,
    });

    // 6. Verify results
    logger.info('Step 6: Verifying results...');

    const dbDocs = await prisma.generatedDoc.findMany({
      where: { projectId: project.id },
    });

    logger.info('Database verification', {
      expectedDocs: docsToGenerate.length,
      actualDocs: dbDocs.length,
      success: dbDocs.length === docsToGenerate.length,
    });

    // Calculate freshness
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const freshDocs = await prisma.generatedDoc.count({
      where: {
        projectId: project.id,
        status: 'published',
        lastUpdatedAt: { gte: oneDayAgo },
      },
    });

    const freshnessScore = dbDocs.length > 0 ? freshDocs / dbDocs.length : 0;

    await prisma.project.update({
      where: { id: project.id },
      data: {
        freshnessScore,
        lastGeneratedAt: new Date(),
      },
    });

    logger.info('✅ Integration test PASSED', {
      projectId: project.id,
      projectName: project.name,
      docsGenerated: dbDocs.length,
      freshnessScore,
      outputDir,
    });

    logger.info('\nNext steps:', {
      'View output': `ls -la ${outputDir}`,
      'View mint.json': `cat ${outputDir}/mint.json`,
      'View docs': `ls -la ${outputDir}/getting-started/`,
      'Database': `npx prisma studio`,
    });

    return {
      success: true,
      projectId: project.id,
      outputDir,
      docsGenerated: dbDocs.length,
      freshnessScore,
    };
  } catch (error) {
    logger.error('❌ Integration test FAILED', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
runIntegrationTest()
  .then((result) => {
    console.log('\n✅ Test completed successfully!');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
