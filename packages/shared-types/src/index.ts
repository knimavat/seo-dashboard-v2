// ═══════════════════════════════════════════════════
// SEO Command Center — Shared Type Definitions
// ═══════════════════════════════════════════════════

// ─── Enums ─────────────────────────────────────────
export const ProjectStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const HealthStatus = {
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
} as const;
export type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus];

export const UserRole = {
  ADMIN: 'admin',
  SPECIALIST: 'specialist',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const TaskStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskCategory = {
  ON_PAGE: 'on_page',
  OFF_PAGE: 'off_page',
  TECHNICAL: 'technical',
  CONTENT: 'content',
  LOCAL_SEO: 'local_seo',
  STRATEGY: 'strategy',
  REPORTING: 'reporting',
} as const;
export type TaskCategory = (typeof TaskCategory)[keyof typeof TaskCategory];

export const Priority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const SearchIntent = {
  INFORMATIONAL: 'informational',
  NAVIGATIONAL: 'navigational',
  COMMERCIAL: 'commercial',
  TRANSACTIONAL: 'transactional',
} as const;
export type SearchIntent = (typeof SearchIntent)[keyof typeof SearchIntent];

export const KeywordTier = {
  TIER1: 'tier1',
  TIER2: 'tier2',
  TIER3: 'tier3',
} as const;
export type KeywordTier = (typeof KeywordTier)[keyof typeof KeywordTier];

export const AuditCategory = {
  CRAWLABILITY: 'crawlability',
  INDEXATION: 'indexation',
  PAGE_SPEED: 'page_speed',
  MOBILE: 'mobile',
  STRUCTURED_DATA: 'structured_data',
  SECURITY: 'security',
  URL_STRUCTURE: 'url_structure',
  REDIRECTS: 'redirects',
  DUPLICATE_CONTENT: 'duplicate_content',
  CWV: 'cwv',
  INTERNAL_LINKING: 'internal_linking',
  OTHER: 'other',
} as const;
export type AuditCategory = (typeof AuditCategory)[keyof typeof AuditCategory];

export const Severity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFORMATIONAL: 'informational',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const AuditIssueStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  FIXED: 'fixed',
  VERIFIED: 'verified',
  WONT_FIX: 'wont_fix',
  DEFERRED: 'deferred',
} as const;
export type AuditIssueStatus = (typeof AuditIssueStatus)[keyof typeof AuditIssueStatus];

export const ApprovalType = {
  CONTENT: 'content',
  STRATEGY: 'strategy',
  TECHNICAL_RECOMMENDATION: 'technical_recommendation',
  CLIENT_SIGNOFF: 'client_signoff',
} as const;
export type ApprovalType = (typeof ApprovalType)[keyof typeof ApprovalType];

export const ApprovalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVISION_REQUESTED: 'revision_requested',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const ReviewType = {
  PEER: 'peer',
  TECHNICAL: 'technical',
  STRATEGIC: 'strategic',
} as const;
export type ReviewType = (typeof ReviewType)[keyof typeof ReviewType];

export const ReviewRating = {
  PASS: 'pass',
  PASS_WITH_NOTES: 'pass_with_notes',
  NEEDS_REVISION: 'needs_revision',
  FAIL: 'fail',
} as const;
export type ReviewRating = (typeof ReviewRating)[keyof typeof ReviewRating];

export const ReportStatus = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const AuditSource = {
  MANUAL: 'manual',
  SCREAMING_FROG: 'screaming_frog',
  LIGHTHOUSE: 'lighthouse',
  GSC: 'gsc',
  PAGESPEED: 'pagespeed',
  OTHER: 'other',
} as const;
export type AuditSource = (typeof AuditSource)[keyof typeof AuditSource];

export const SerpFeature = {
  FEATURED_SNIPPET: 'featured_snippet',
  PAA: 'people_also_ask',
  LOCAL_PACK: 'local_pack',
  IMAGE_PACK: 'image_pack',
  VIDEO: 'video',
  KNOWLEDGE_PANEL: 'knowledge_panel',
  SITELINKS: 'sitelinks',
  SHOPPING: 'shopping',
  NEWS: 'news',
} as const;
export type SerpFeature = (typeof SerpFeature)[keyof typeof SerpFeature];

// ─── Interfaces ────────────────────────────────────

export interface Agency {
  _id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: {
    defaultBranding: {
      logoUrl?: string;
      primaryColor: string;
      accentColor: string;
    };
    allowedDomains: string[];
  };
  billingCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  agencyId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  assignedProjects: string[];
  status: 'active' | 'deactivated';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  agencyId: string;
  clientName: string;
  clientEmail?: string;
  clientLogo?: string;
  projectName: string;
  domain: string;
  industry?: string;
  startDate: string;
  status: ProjectStatus;
  healthStatus: HealthStatus;
  healthNote?: string;
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
  };
  settings?: {
    defaultReportSections?: string[];
    keywordGroups?: string[];
    taskCategories?: string[];
  };
  metadata: {
    totalKeywords: number;
    totalTasks: number;
    openAuditIssues: number;
    lastReportDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  filename: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface StatusChange {
  from: string;
  to: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface Task {
  _id: string;
  agencyId: string;
  projectId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  assignedTo: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  targetUrl?: string;
  targetKeywords?: string[];
  attachments?: Attachment[];
  internalNotes?: string;
  clientVisibleSummary?: string;
  statusHistory: StatusChange[];
  createdAt: string;
  updatedAt: string;
}

export interface KeywordSnapshot {
  rank: number;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  serpFeatures: SerpFeature[];
  ownsSerpFeature: boolean;
  trafficEstimate: number;
  recordedAt: string;
}

export interface Keyword {
  _id: string;
  agencyId: string;
  projectId: string;
  keyword: string;
  searchIntent: SearchIntent;
  targetUrl: string;
  group: string;
  priorityTier: KeywordTier;
  current: KeywordSnapshot;
  previous?: { rank: number; recordedAt: string };
  bestRank: number;
  snapshots: KeywordSnapshot[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditIssue {
  _id: string;
  agencyId: string;
  projectId: string;
  title: string;
  category: AuditCategory;
  severity: Severity;
  affectedUrls: string[];
  affectedUrlCount: number;
  identifiedBy: string;
  identifiedAt: string;
  status: AuditIssueStatus;
  resolvedAt?: string;
  resolutionNotes?: string;
  impactEstimate?: string;
  auditSource: AuditSource;
  evidence?: Attachment[];
  statusHistory: StatusChange[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalDecision {
  approverId: string;
  decision: ApprovalStatus;
  comments?: string;
  decidedAt: string;
}

export interface Approval {
  _id: string;
  agencyId: string;
  projectId: string;
  taskId: string;
  type: ApprovalType;
  submittedBy: string;
  submittedAt: string;
  assignedApprovers: string[];
  status: ApprovalStatus;
  decisions: ApprovalDecision[];
  revisionCount: number;
  finalApprovedVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  agencyId: string;
  projectId: string;
  taskId: string;
  type: ReviewType;
  reviewerId: string;
  reviewedAt: string;
  rating: ReviewRating;
  feedback: string;
  checklistScores: Record<string, number>;
  resolutionStatus: 'open' | 'addressed' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export interface ReportSnapshot {
  _id: string;
  agencyId: string;
  projectId: string;
  token: string;
  dateRange: { start: string; end: string };
  generatedBy: string;
  generatedAt: string;
  status: ReportStatus;
  revokedAt?: string;
  passwordHash?: string;
  branding: {
    clientName: string;
    clientLogo?: string;
    primaryColor: string;
    accentColor: string;
  };
  sections: ReportSections;
  sectionVisibility: Record<string, boolean>;
  viewCount: number;
  lastViewedAt?: string;
  createdAt: string;
}

export interface ReportSections {
  executiveSummary: {
    healthStatus: HealthStatus;
    narrative: string;
    keyWins: string[];
    keyConcerns: string[];
  };
  rankings: {
    summary: {
      total: number;
      top3: number;
      top10: number;
      improved: number;
      declined: number;
      stable: number;
    };
    keywords: Array<{
      keyword: string;
      rank: number;
      previousRank: number;
      change: number;
      volume: number;
      group: string;
      sparklineData: number[];
    }>;
  };
  workCompleted: {
    summary: { completed: number; inProgress: number; blocked: number; total: number };
    tasks: Array<{
      title: string;
      clientSummary: string;
      status: string;
      category: string;
      completedAt?: string;
    }>;
  };
  technicalHealth: {
    summary: { critical: number; high: number; medium: number; low: number; resolved: number };
    trendData: Array<{ date: string; open: number; resolved: number }>;
    topResolved: Array<{ title: string; severity: string; resolution: string }>;
  };
  contentApprovals: {
    published: number;
    approvalRate: number;
    peerReviewPassRate: number;
  };
  trafficVisibility: {
    organicTraffic: { value: number; change: number; period: string };
    visibilityScore: { value: number; change: number };
    ctr: { value: number; change: number };
  };
  nextMonthPlan: {
    tasks: Array<{ title: string; category: string; priority: string }>;
    milestones: Array<{ name: string; targetDate: string; percentComplete: number }>;
    focusAreas: string[];
  };
}

// ─── API Response Types ────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DashboardKPIs {
  health: HealthStatus;
  healthNote?: string;
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    blocked: number;
  };
  keywords: {
    total: number;
    top3: number;
    top10: number;
    improved: number;
    declined: number;
    avgPositionChange: number;
  };
  audits: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolvedThisPeriod: number;
  };
  approvals: {
    pending: number;
    approvedThisPeriod: number;
  };
  content: {
    publishedThisPeriod: number;
  };
}

export interface PortfolioProject {
  _id: string;
  projectName: string;
  clientName: string;
  domain: string;
  healthStatus: HealthStatus;
  tasksCompleted: number;
  tasksTotal: number;
  keywordsInTop10: number;
  keywordsTotal: number;
  lastReportDate?: string;
}
