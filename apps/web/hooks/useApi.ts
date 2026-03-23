'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Keys factory — consistent, invalidatable
const keys = {
  projects: { all: ['projects'] as const, list: (p?: Record<string, string>) => [...keys.projects.all, p] as const, detail: (id: string) => [...keys.projects.all, id] as const },
  tasks: { all: (pid: string) => ['tasks', pid] as const, list: (pid: string, p?: Record<string, string>) => [...keys.tasks.all(pid), p] as const },
  keywords: { all: (pid: string) => ['keywords', pid] as const, list: (pid: string, p?: Record<string, string>) => [...keys.keywords.all(pid), p] as const },
  audits: { all: (pid: string) => ['audits', pid] as const, list: (pid: string, p?: Record<string, string>) => [...keys.audits.all(pid), p] as const },
  approvals: { all: (pid: string) => ['approvals', pid] as const, list: (pid: string, p?: Record<string, string>) => [...keys.approvals.all(pid), p] as const },
  reviews: { all: (pid: string) => ['reviews', pid] as const, list: (pid: string, p?: Record<string, string>) => [...keys.reviews.all(pid), p] as const },
  reports: (pid: string) => ['reports', pid] as const,
  dashboard: { project: (pid: string, p?: Record<string, string>) => ['dashboard', pid, p] as const, portfolio: ['portfolio'] as const, workload: ['workload'] as const },
};

// ─── Projects ──
export function useProjects(p?: Record<string, string>) { return useQuery({ queryKey: keys.projects.list(p), queryFn: () => api.getProjects(p) }); }
export function useProject(id: string) { return useQuery({ queryKey: keys.projects.detail(id), queryFn: () => api.getProject(id), enabled: !!id }); }
export function useCreateProject() { const qc = useQueryClient(); return useMutation({ mutationFn: (d: any) => api.createProject(d), onSuccess: () => qc.invalidateQueries({ queryKey: keys.projects.all }) }); }

// ─── Tasks ──
export function useTasks(pid: string, p?: Record<string, string>) { return useQuery({ queryKey: keys.tasks.list(pid, p), queryFn: () => api.getTasks(pid, p), enabled: !!pid }); }
export function useCreateTask(pid: string) { const qc = useQueryClient(); return useMutation({ mutationFn: (d: any) => api.createTask(pid, d), onSuccess: () => { qc.invalidateQueries({ queryKey: keys.tasks.all(pid) }); qc.invalidateQueries({ queryKey: keys.dashboard.project(pid) }); } }); }
export function useUpdateTask(pid: string) { const qc = useQueryClient(); return useMutation({ mutationFn: ({ taskId, data }: { taskId: string; data: any }) => api.updateTask(pid, taskId, data), onSuccess: () => { qc.invalidateQueries({ queryKey: keys.tasks.all(pid) }); qc.invalidateQueries({ queryKey: keys.dashboard.project(pid) }); } }); }

// ─── Keywords ──
export function useKeywords(pid: string, p?: Record<string, string>) { return useQuery({ queryKey: keys.keywords.list(pid, p), queryFn: () => api.getKeywords(pid, p), enabled: !!pid }); }
export function useCreateKeyword(pid: string) { const qc = useQueryClient(); return useMutation({ mutationFn: (d: any) => api.createKeyword(pid, d), onSuccess: () => qc.invalidateQueries({ queryKey: keys.keywords.all(pid) }) }); }

// ─── Audits ──
export function useAudits(pid: string, p?: Record<string, string>) { return useQuery({ queryKey: keys.audits.list(pid, p), queryFn: () => api.getAudits(pid, p), enabled: !!pid }); }
export function useCreateAudit(pid: string) { const qc = useQueryClient(); return useMutation({ mutationFn: (d: any) => api.createAudit(pid, d), onSuccess: () => qc.invalidateQueries({ queryKey: keys.audits.all(pid) }) }); }
export function useUpdateAudit(pid: string) { const qc = useQueryClient(); return useMutation({ mutationFn: ({ auditId, data }: { auditId: string; data: any }) => api.updateAudit(pid, auditId, data), onSuccess: () => qc.invalidateQueries({ queryKey: keys.audits.all(pid) }) }); }

// ─── Approvals ──
export function useApprovals(pid: string, p?: Record<string, string>) { return useQuery({ queryKey: keys.approvals.list(pid, p), queryFn: () => api.getApprovals(pid, p), enabled: !!pid }); }
export function useDecideApproval(pid: string) { const qc = useQueryClient(); return useMutation({ mutationFn: ({ approvalId, data }: { approvalId: string; data: any }) => api.decideApproval(pid, approvalId, data), onSuccess: () => qc.invalidateQueries({ queryKey: keys.approvals.all(pid) }) }); }

// ─── Reviews ──
export function useReviews(pid: string, p?: Record<string, string>) { return useQuery({ queryKey: keys.reviews.list(pid, p), queryFn: () => api.getReviews(pid, p), enabled: !!pid }); }

// ─── Reports ──
export function useReports(pid: string) { return useQuery({ queryKey: keys.reports(pid), queryFn: () => api.getReports(pid), enabled: !!pid }); }
export function useGenerateReport(pid: string) { const qc = useQueryClient(); return useMutation({ mutationFn: (d: any) => api.generateReport(pid, d), onSuccess: () => qc.invalidateQueries({ queryKey: keys.reports(pid) }) }); }

// ─── Dashboard ──
export function useProjectDashboard(pid: string, p?: Record<string, string>) { return useQuery({ queryKey: keys.dashboard.project(pid, p), queryFn: () => api.getProjectDashboard(pid, p), enabled: !!pid }); }
export function usePortfolio() { return useQuery({ queryKey: keys.dashboard.portfolio, queryFn: () => api.getPortfolio() }); }
export function useWorkload() { return useQuery({ queryKey: keys.dashboard.workload, queryFn: () => api.getWorkload() }); }

// ─── Public ──
export function usePublicReport(token: string, password?: string) { return useQuery({ queryKey: ['public-report', token], queryFn: () => api.getPublicReport(token, password), enabled: !!token, retry: false }); }