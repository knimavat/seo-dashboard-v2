import { z } from 'zod';

// ─── Common ────────────────────────────────────────
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Project ───────────────────────────────────────
export const createProjectSchema = z.object({
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email().optional(),
  projectName: z.string().min(1).max(200),
  domain: z.string().url(),
  industry: z.string().max(100).optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const updateProjectSchema = z.object({
  clientName: z.string().min(1).max(200).optional(),
  clientEmail: z.string().email().optional(),
  projectName: z.string().min(1).max(200).optional(),
  domain: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  healthStatus: z.enum(['green', 'yellow', 'red']).optional(),
  healthNote: z.string().max(500).optional(),
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    logoUrl: z.string().url().optional(),
  }).optional(),
});

// ─── Task ──────────────────────────────────────────
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: z.enum(['on_page', 'off_page', 'technical', 'content', 'local_seo', 'strategy', 'reporting']),
  assignedTo: objectIdSchema,
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  estimatedHours: z.number().min(0).max(999).optional(),
  targetUrl: z.string().url().optional(),
  targetKeywords: z.array(objectIdSchema).optional(),
  internalNotes: z.string().max(5000).optional(),
  clientVisibleSummary: z.string().max(1000).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  category: z.enum(['on_page', 'off_page', 'technical', 'content', 'local_seo', 'strategy', 'reporting']).optional(),
  assignedTo: objectIdSchema.optional(),
  status: z.enum(['not_started', 'in_progress', 'in_review', 'approved', 'published', 'blocked', 'cancelled']).optional(),
  statusReason: z.string().max(500).optional(), // Required when status = blocked or cancelled
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).max(999).optional(),
  actualHours: z.number().min(0).max(999).optional(),
  targetUrl: z.string().url().optional(),
  targetKeywords: z.array(objectIdSchema).optional(),
  internalNotes: z.string().max(5000).optional(),
  clientVisibleSummary: z.string().max(1000).optional(),
});

// ─── Keyword ───────────────────────────────────────
export const createKeywordSchema = z.object({
  keyword: z.string().min(1).max(200),
  searchIntent: z.enum(['informational', 'navigational', 'commercial', 'transactional']),
  targetUrl: z.string().url(),
  group: z.string().min(1).max(100),
  priorityTier: z.enum(['tier1', 'tier2', 'tier3']),
  current: z.object({
    rank: z.number().int().min(0).max(200),
    searchVolume: z.number().int().min(0),
    difficulty: z.number().int().min(0).max(100),
    cpc: z.number().min(0),
    serpFeatures: z.array(z.string()).default([]),
    ownsSerpFeature: z.boolean().default(false),
    trafficEstimate: z.number().int().min(0).default(0),
  }),
  notes: z.string().max(1000).optional(),
});

export const updateKeywordSchema = z.object({
  keyword: z.string().min(1).max(200).optional(),
  searchIntent: z.enum(['informational', 'navigational', 'commercial', 'transactional']).optional(),
  targetUrl: z.string().url().optional(),
  group: z.string().min(1).max(100).optional(),
  priorityTier: z.enum(['tier1', 'tier2', 'tier3']).optional(),
  notes: z.string().max(1000).optional(),
});

export const keywordSnapshotSchema = z.object({
  rank: z.number().int().min(0).max(200),
  searchVolume: z.number().int().min(0),
  difficulty: z.number().int().min(0).max(100),
  cpc: z.number().min(0),
  serpFeatures: z.array(z.string()).default([]),
  ownsSerpFeature: z.boolean().default(false),
  trafficEstimate: z.number().int().min(0).default(0),
});

export const bulkKeywordSchema = z.object({
  keywords: z.array(createKeywordSchema).min(1).max(500),
});

// ─── Audit Issue ───────────────────────────────────
export const createAuditSchema = z.object({
  title: z.string().min(1).max(300),
  category: z.enum([
    'crawlability', 'indexation', 'page_speed', 'mobile', 'structured_data',
    'security', 'url_structure', 'redirects', 'duplicate_content', 'cwv',
    'internal_linking', 'other',
  ]),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'informational']),
  affectedUrls: z.array(z.string().url()).default([]),
  affectedUrlCount: z.number().int().min(0).optional(),
  impactEstimate: z.string().max(500).optional(),
  auditSource: z.enum(['manual', 'screaming_frog', 'lighthouse', 'gsc', 'pagespeed', 'other']),
});

export const updateAuditSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  category: z.enum([
    'crawlability', 'indexation', 'page_speed', 'mobile', 'structured_data',
    'security', 'url_structure', 'redirects', 'duplicate_content', 'cwv',
    'internal_linking', 'other',
  ]).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'informational']).optional(),
  status: z.enum(['open', 'in_progress', 'fixed', 'verified', 'wont_fix', 'deferred']).optional(),
  resolutionNotes: z.string().max(2000).optional(),
  impactEstimate: z.string().max(500).optional(),
});

// ─── Approval ──────────────────────────────────────
export const createApprovalSchema = z.object({
  taskId: objectIdSchema,
  type: z.enum(['content', 'strategy', 'technical_recommendation', 'client_signoff']),
  assignedApprovers: z.array(objectIdSchema).min(1),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'revision_requested']),
  comments: z.string().max(2000).optional(),
});

// ─── Review ────────────────────────────────────────
export const createReviewSchema = z.object({
  taskId: objectIdSchema,
  type: z.enum(['peer', 'technical', 'strategic']),
  rating: z.enum(['pass', 'pass_with_notes', 'needs_revision', 'fail']),
  feedback: z.string().min(1).max(5000),
  checklistScores: z.record(z.string(), z.number().min(0).max(10)).optional(),
});

// ─── Report ────────────────────────────────────────
export const generateReportSchema = z.object({
  dateRange: dateRangeSchema,
  sectionVisibility: z.record(z.string(), z.boolean()).optional(),
  executiveSummary: z.object({
    narrative: z.string().min(1).max(5000),
    keyWins: z.array(z.string()).default([]),
    keyConcerns: z.array(z.string()).default([]),
  }).optional(),
  nextMonthPlan: z.object({
    focusAreas: z.array(z.string()).default([]),
  }).optional(),
  password: z.string().min(6).max(100).optional(),
});

// ─── User Management ───────────────────────────────
export const addUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  role: z.enum(['admin', 'specialist']),
  assignedProjects: z.array(objectIdSchema).default([]),
});

export const updateUserSchema = z.object({
  role: z.enum(['admin', 'specialist']).optional(),
  assignedProjects: z.array(objectIdSchema).optional(),
  status: z.enum(['active', 'deactivated']).optional(),
});
