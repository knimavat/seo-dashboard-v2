import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getEnv } from './config/env.js';
import { authenticate } from './middleware/authenticate.js';
import { tenantScope } from './middleware/tenantScope.js';
import { errorHandler, rateLimiter, projectAccess } from './middleware/index.js';
import { logger } from './config/logger.js';

// Route modules
import authRoutes from './modules/auth/auth.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import keywordRoutes from './modules/keywords/keyword.routes.js';
import auditRoutes from './modules/audits/audit.routes.js';
import approvalRoutes from './modules/approvals/approval.routes.js';
import reviewRoutes from './modules/reviews/review.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import publicReportRoutes from './modules/reports/public.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import competitorRoutes from './modules/competitors/competitor.routes.js';

const app = express();

// ─── Global Middleware ─────────────────────────────
app.use(helmet());
app.use(cors({
  origin: getEnv().CORS_ORIGIN.split(','),
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Request logging
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// ─── Health Check ──────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Public Routes (no auth) ───────────────────────
app.use('/api/v1/public/report', rateLimiter(30, 60), publicReportRoutes);

// ─── Auth Routes (partially protected) ─────────────
app.use('/api/v1/auth', rateLimiter(20, 60), authRoutes);

// ─── Protected Routes ──────────────────────────────
app.use('/api/v1', authenticate, tenantScope);

app.use('/api/v1/projects', rateLimiter(100, 60), projectRoutes);

// Project-scoped routes
app.use('/api/v1/projects/:projectId/tasks', projectAccess, taskRoutes);
app.use('/api/v1/projects/:projectId/keywords', projectAccess, keywordRoutes);
app.use('/api/v1/projects/:projectId/audits', projectAccess, auditRoutes);
app.use('/api/v1/projects/:projectId/approvals', projectAccess, approvalRoutes);
app.use('/api/v1/projects/:projectId/reviews', projectAccess, reviewRoutes);
app.use('/api/v1/projects/:projectId/reports', projectAccess, reportRoutes);
app.use('/api/v1/projects/:projectId/analytics', projectAccess, analyticsRoutes);
app.use('/api/v1/projects/:projectId/competitors', projectAccess, competitorRoutes);

// Dashboard aggregation routes
app.use('/api/v1/dashboard', dashboardRoutes);

// ─── Error Handler (must be last) ──────────────────
app.use(errorHandler);

export default app;
