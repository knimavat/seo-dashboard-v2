/**
 * Seed script: Creates a demo agency, users, project, and sample data.
 * Run: npm run seed (or: npx tsx src/scripts/seed.ts)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import AgencyModel from '../modules/auth/agency.model.js';
import UserModel from '../modules/auth/user.model.js';
import ProjectModel from '../modules/projects/project.model.js';
import TaskModel from '../modules/tasks/task.model.js';
import KeywordModel from '../modules/keywords/keyword.model.js';
import AuditIssueModel from '../modules/audits/audit.model.js';

async function seed() {
  // Seed only needs MongoDB — skip full env validation
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is required. Create a .env file in the project root.');
    console.error('   Example: MONGODB_URI=mongodb://localhost:27017/seo-command-center');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    AgencyModel.deleteMany({}),
    UserModel.deleteMany({}),
    ProjectModel.deleteMany({}),
    TaskModel.deleteMany({}),
    KeywordModel.deleteMany({}),
    AuditIssueModel.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // Create Agency
  const agency = await AgencyModel.create({
    name: 'Kaushal Nimavat',
    slug: 'kaushal-nimavat',
    plan: 'pro',
    settings: {
      defaultBranding: { primaryColor: '#1B2A4A', accentColor: '#2E75B6' },
      allowedDomains: [],
    },
  });
  console.log(`Agency created: ${agency.name}`);

  // Create Users — REPLACE THESE EMAILS WITH YOUR GOOGLE EMAILS
  const admin = await UserModel.create({
    agencyId: agency._id,
    email: 'kaushal.nimavat@aureatelabs.com', // ← Replace with your Google email
    name: 'Agency Admin',
    role: 'admin',
    status: 'active',
  });

  const specialist = await UserModel.create({
    agencyId: agency._id,
    email: 'specialist@example.com', // ← Replace with team member's Google email
    name: 'SEO Specialist',
    role: 'specialist',
    status: 'active',
    assignedProjects: [],
  });
  console.log('Users created');

  // Create Project
  const project = await ProjectModel.create({
    agencyId: agency._id,
    clientName: 'TechNova Solutions',
    clientEmail: 'marketing@technova.com',
    projectName: 'TechNova SEO Campaign',
    domain: 'https://technova.com',
    industry: 'B2B SaaS',
    startDate: new Date('2025-09-01'),
    status: 'active',
    healthStatus: 'green',
    healthNote: 'Strong upward trend in rankings. On track for Q1 targets.',
    metadata: { totalKeywords: 0, totalTasks: 0, openAuditIssues: 0 },
  });

  // Assign specialist to project
  specialist.assignedProjects = [project._id];
  await specialist.save();
  console.log(`Project created: ${project.projectName}`);

  // Create Tasks
  const tasks = [
    { title: 'Homepage Title Tag & Meta Description Optimization', category: 'on_page', status: 'published', priority: 'high', dueDate: new Date('2025-10-15'), completedAt: new Date('2025-10-12'), clientVisibleSummary: 'Optimized homepage title and meta description for primary brand + conversion keywords.' },
    { title: 'Blog Content: "What is Cloud ERP" (2500 words)', category: 'content', status: 'published', priority: 'high', dueDate: new Date('2025-11-01'), completedAt: new Date('2025-10-28'), clientVisibleSummary: 'Published comprehensive guide targeting "what is cloud ERP" keyword cluster.' },
    { title: 'Internal Linking Audit & Implementation', category: 'technical', status: 'in_progress', priority: 'medium', dueDate: new Date('2026-03-15'), clientVisibleSummary: 'Auditing and improving internal link structure across product pages.' },
    { title: 'Schema Markup: Product Pages', category: 'technical', status: 'in_review', priority: 'high', dueDate: new Date('2026-03-10'), clientVisibleSummary: 'Implementing Product and FAQ schema across all product pages.' },
    { title: 'Competitor Backlink Gap Analysis', category: 'off_page', status: 'approved', priority: 'medium', dueDate: new Date('2026-03-20'), clientVisibleSummary: 'Identified 45 link opportunities from competitor analysis.' },
    { title: 'Google Business Profile Optimization', category: 'local_seo', status: 'not_started', priority: 'low', dueDate: new Date('2026-04-01') },
    { title: 'Core Web Vitals Fix: LCP on Product Pages', category: 'technical', status: 'blocked', priority: 'critical', dueDate: new Date('2026-03-05'), internalNotes: 'Blocked: waiting on dev team to deploy image CDN changes', clientVisibleSummary: 'Optimizing page load speed on product pages — requires dev support.' },
    { title: 'Monthly Ranking Report - February', category: 'reporting', status: 'published', priority: 'medium', dueDate: new Date('2026-03-05'), completedAt: new Date('2026-03-02'), clientVisibleSummary: 'February ranking report compiled and delivered.' },
  ];

  for (const t of tasks) {
    await TaskModel.create({
      ...t,
      agencyId: agency._id,
      projectId: project._id,
      assignedTo: t.priority === 'critical' ? admin._id : specialist._id,
      estimatedHours: Math.floor(Math.random() * 8) + 2,
      statusHistory: [{ from: '', to: t.status, changedBy: admin._id, changedAt: new Date() }],
    });
  }
  await ProjectModel.updateOne({ _id: project._id }, { 'metadata.totalTasks': tasks.length });
  console.log(`${tasks.length} tasks created`);

  // Create Keywords
  const keywords = [
    { keyword: 'cloud ERP software', group: 'Product - ERP', priorityTier: 'tier1', searchIntent: 'commercial', targetUrl: 'https://technova.com/cloud-erp', current: { rank: 8, searchVolume: 2400, difficulty: 65, cpc: 12.50 }, previous: { rank: 14 } },
    { keyword: 'what is cloud ERP', group: 'Informational - ERP', priorityTier: 'tier1', searchIntent: 'informational', targetUrl: 'https://technova.com/blog/what-is-cloud-erp', current: { rank: 3, searchVolume: 3600, difficulty: 45, cpc: 5.20 }, previous: { rank: 7 } },
    { keyword: 'best ERP for small business', group: 'Product - ERP', priorityTier: 'tier1', searchIntent: 'commercial', targetUrl: 'https://technova.com/small-business-erp', current: { rank: 12, searchVolume: 1800, difficulty: 72, cpc: 15.80 }, previous: { rank: 18 } },
    { keyword: 'ERP implementation guide', group: 'Informational - ERP', priorityTier: 'tier2', searchIntent: 'informational', targetUrl: 'https://technova.com/blog/erp-implementation', current: { rank: 5, searchVolume: 1200, difficulty: 38, cpc: 8.90 }, previous: { rank: 5 } },
    { keyword: 'cloud vs on-premise ERP', group: 'Informational - ERP', priorityTier: 'tier2', searchIntent: 'informational', targetUrl: 'https://technova.com/blog/cloud-vs-onpremise', current: { rank: 2, searchVolume: 880, difficulty: 42, cpc: 7.30 }, previous: { rank: 4 } },
    { keyword: 'TechNova ERP', group: 'Brand', priorityTier: 'tier1', searchIntent: 'navigational', targetUrl: 'https://technova.com', current: { rank: 1, searchVolume: 320, difficulty: 5, cpc: 2.10 }, previous: { rank: 1 } },
    { keyword: 'ERP software pricing', group: 'Product - ERP', priorityTier: 'tier2', searchIntent: 'transactional', targetUrl: 'https://technova.com/pricing', current: { rank: 22, searchVolume: 2200, difficulty: 78, cpc: 18.50 }, previous: { rank: 28 } },
    { keyword: 'manufacturing ERP system', group: 'Industry - Manufacturing', priorityTier: 'tier2', searchIntent: 'commercial', targetUrl: 'https://technova.com/manufacturing-erp', current: { rank: 15, searchVolume: 1500, difficulty: 68, cpc: 14.20 }, previous: { rank: 19 } },
    { keyword: 'ERP integration with CRM', group: 'Product - Integrations', priorityTier: 'tier3', searchIntent: 'informational', targetUrl: 'https://technova.com/blog/erp-crm-integration', current: { rank: 9, searchVolume: 720, difficulty: 35, cpc: 6.40 }, previous: { rank: 11 } },
    { keyword: 'migrate to cloud ERP', group: 'Product - ERP', priorityTier: 'tier2', searchIntent: 'commercial', targetUrl: 'https://technova.com/migration', current: { rank: 18, searchVolume: 590, difficulty: 55, cpc: 11.70 }, previous: { rank: 25 } },
  ];

  for (const kw of keywords) {
    const now = new Date();
    const currentData = { ...kw.current, serpFeatures: [], ownsSerpFeature: false, trafficEstimate: 0, recordedAt: now };
    // Generate fake historical snapshots
    const snapshots = Array.from({ length: 6 }, (_, i) => ({
      ...currentData,
      rank: Math.max(1, (kw.previous?.rank || kw.current.rank) - Math.floor(Math.random() * 3) + i),
      recordedAt: new Date(now.getTime() - (6 - i) * 30 * 24 * 60 * 60 * 1000),
    }));
    snapshots.push(currentData);

    await KeywordModel.create({
      agencyId: agency._id,
      projectId: project._id,
      keyword: kw.keyword,
      searchIntent: kw.searchIntent,
      targetUrl: kw.targetUrl,
      group: kw.group,
      priorityTier: kw.priorityTier,
      current: currentData,
      previous: kw.previous ? { rank: kw.previous.rank, recordedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } : undefined,
      bestRank: Math.min(kw.current.rank, kw.previous?.rank || 999),
      snapshots,
      notes: '',
    });
  }
  await ProjectModel.updateOne({ _id: project._id }, { 'metadata.totalKeywords': keywords.length });
  console.log(`${keywords.length} keywords created`);

  // Create Audit Issues
  const audits = [
    { title: 'Missing H1 tags on 12 product pages', category: 'crawlability', severity: 'high', status: 'fixed', auditSource: 'screaming_frog', impactEstimate: 'Improves content clarity for search engines on high-value pages' },
    { title: 'LCP exceeds 4s on mobile for product pages', category: 'cwv', severity: 'critical', status: 'open', auditSource: 'pagespeed', impactEstimate: 'Directly impacts Core Web Vitals score and mobile rankings' },
    { title: '23 pages returning soft 404s', category: 'indexation', severity: 'high', status: 'in_progress', auditSource: 'gsc', impactEstimate: 'Wasting crawl budget on non-existent pages' },
    { title: 'Missing Product schema on all product pages', category: 'structured_data', severity: 'medium', status: 'open', auditSource: 'manual', impactEstimate: 'Could unlock rich snippet visibility in SERPs' },
    { title: 'Mixed content warnings on 5 pages', category: 'security', severity: 'low', status: 'verified', auditSource: 'lighthouse' },
    { title: 'Duplicate meta descriptions on blog archive pages', category: 'duplicate_content', severity: 'medium', status: 'fixed', auditSource: 'screaming_frog' },
  ];

  let openCount = 0;
  for (const a of audits) {
    if (!['fixed', 'verified', 'wont_fix'].includes(a.status)) openCount++;
    await AuditIssueModel.create({
      ...a,
      agencyId: agency._id,
      projectId: project._id,
      identifiedBy: specialist._id,
      affectedUrls: [],
      affectedUrlCount: Math.floor(Math.random() * 20) + 1,
      resolvedAt: ['fixed', 'verified'].includes(a.status) ? new Date() : undefined,
      statusHistory: [{ from: '', to: a.status, changedBy: specialist._id, changedAt: new Date() }],
    });
  }
  await ProjectModel.updateOne({ _id: project._id }, { 'metadata.openAuditIssues': openCount });
  console.log(`${audits.length} audit issues created`);

  console.log('\n✅ Seed complete!');
  console.log(`\n📋 Summary:`);
  console.log(`   Agency: ${agency.name} (${agency.slug})`);
  console.log(`   Admin: kaushal.nimavat@aureatelabs.com ← REPLACE with your Google email`);
  console.log(`   Specialist: specialist@example.com ← REPLACE with team email`);
  console.log(`   Project: ${project.projectName}`);
  console.log(`   Tasks: ${tasks.length}`);
  console.log(`   Keywords: ${keywords.length}`);
  console.log(`   Audit Issues: ${audits.length}`);

  await mongoose.disconnect();
}

seed().catch(console.error);