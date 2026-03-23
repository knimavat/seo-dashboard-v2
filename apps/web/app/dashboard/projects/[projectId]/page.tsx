'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProject, useProjectDashboard, useTasks, useAudits, useApprovals, useReviews, useUpdateTask, useCreateTask, useUpdateAudit, useDecideApproval } from '@/hooks/useApi';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader, Tabs, KPICard, StatusBadge, SeverityBadge, Button, EmptyState, TableSkeleton, Modal, Input, Select } from '@/components/ui';
import { formatDate, formatNumber, cn, getHealthColor } from '@/lib/utils';
import { KeywordsTab } from '@/components/keywords/KeywordsTab';
import { ProjectEditModal } from '@/components/projects/ProjectEditModal';
import { AnalyticsTab } from '@/components/analytics/AnalyticsTab';
import { CompetitorsTab } from '@/components/competitors/CompetitorsTab';
import { ReportsTab } from '@/components/reports/ReportsTab';

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  return (
    <Suspense fallback={<TableSkeleton rows={6} cols={5} />}>
      <Content projectId={params.projectId} />
    </Suspense>
  );
}

function Content({ projectId }: { projectId: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [showEdit, setShowEdit] = useState(false);
  const { user } = useAuthStore();
  const tab = sp.get('tab') || 'overview';

  const upd = useCallback((u: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(u).forEach(([k, v]) => { if (v === null || v === '') p.delete(k); else p.set(k, v); });
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [router, sp]);

  const setTab = (t: string) => { const p = new URLSearchParams(); p.set('tab', t); router.replace(`?${p.toString()}`, { scroll: false }); };

  const { data: res, isLoading, refetch } = useProject(projectId);
  const project = res?.data;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'competitors', label: 'Competitors' },
    { id: 'audits', label: 'Audits' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'reports', label: 'Reports' },
  ];

  if (isLoading) return <div className="space-y-6"><div className="h-8 w-64 bg-gray-200 rounded animate-pulse" /><TableSkeleton rows={6} cols={5} /></div>;
  if (!project) return <EmptyState title="Project not found" description="This project doesn't exist or you don't have access." />;

  return (
    <>
      <PageHeader
        title={project.projectName}
        subtitle={`${project.clientName} · ${project.domain}`}
        breadcrumbs={[{ label: 'Projects', href: '/dashboard/projects' }, { label: project.projectName }]}
        actions={
          <div className="flex items-center gap-2">
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border', getHealthColor(project.healthStatus))}>
              <span className={cn('w-2 h-2 rounded-full', { 'bg-health-green': project.healthStatus === 'green', 'bg-health-yellow': project.healthStatus === 'yellow', 'bg-health-red': project.healthStatus === 'red' })} />
              {project.healthStatus?.charAt(0).toUpperCase() + project.healthStatus?.slice(1)}
            </div>
            <StatusBadge status={project.status} />
            {user?.role === 'admin' && (
              <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </Button>
            )}
          </div>
        }
      />
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      <div className="mt-6">
        {tab === 'overview' && <OverviewTab pid={projectId} />}
        {tab === 'tasks' && <TasksTab pid={projectId} sp={sp} upd={upd} />}
        {tab === 'keywords' && <KeywordsTab projectId={projectId} />}
        {tab === 'analytics' && <AnalyticsTab projectId={projectId} />}
        {tab === 'competitors' && <CompetitorsTab projectId={projectId} />}
        {tab === 'audits' && <AuditsTab pid={projectId} sp={sp} upd={upd} />}
        {tab === 'approvals' && <ApprovalsTab pid={projectId} sp={sp} upd={upd} />}
        {tab === 'reviews' && <ReviewsTab pid={projectId} sp={sp} upd={upd} />}
        {tab === 'reports' && <ReportsTab projectId={projectId} />}
      </div>
      <ProjectEditModal open={showEdit} onClose={() => setShowEdit(false)} project={project} onSuccess={refetch} />
    </>
  );
}

// ─── Overview ──────────────────────────────────────
function OverviewTab({ pid }: { pid: string }) {
  const { data, isLoading } = useProjectDashboard(pid);
  const k = data?.data;
  if (isLoading) return <TableSkeleton rows={2} cols={4} />;
  if (!k) return <EmptyState title="No data yet" />;
  return (
    <div className="space-y-6">
      <Section title="Tasks">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard label="Total" value={k.tasks.total} color="brand" /><KPICard label="Completed" value={k.tasks.completed} color="green" /><KPICard label="In Progress" value={k.tasks.inProgress} color="brand" /><KPICard label="Overdue" value={k.tasks.overdue} color="red" /><KPICard label="Blocked" value={k.tasks.blocked} color="amber" />
        </div>
      </Section>
      <Section title="Keywords">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard label="Tracked" value={k.keywords.total} /><KPICard label="Top 3" value={k.keywords.top3} color="green" /><KPICard label="Top 10" value={k.keywords.top10} color="brand" /><KPICard label="Improved" value={k.keywords.improved} color="green" /><KPICard label="Declined" value={k.keywords.declined} color="red" />
        </div>
      </Section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Technical Issues">
          <div className="grid grid-cols-2 gap-4">
            <KPICard label="Critical" value={k.audits.critical} color="red" /><KPICard label="High" value={k.audits.high} color="amber" /><KPICard label="Medium" value={k.audits.medium} color="brand" /><KPICard label="Resolved" value={k.audits.resolvedThisPeriod} color="green" />
          </div>
        </Section>
        <Section title="Workflow">
          <div className="grid grid-cols-2 gap-4">
            <KPICard label="Pending Approvals" value={k.approvals.pending} color="amber" /><KPICard label="Published" value={k.content.publishedThisPeriod} color="green" />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>{children}</div>;
}

// ─── Tasks (URL filters: status, category, priority, search) ──
type SP = URLSearchParams;
type Upd = (u: Record<string, string | null>) => void;

function TasksTab({ pid, sp, upd }: { pid: string; sp: SP; upd: Upd }) {
  const [showCreate, setShowCreate] = useState(false);
  const status = sp.get('status') || '';
  const category = sp.get('category') || '';
  const priority = sp.get('priority') || '';
  const search = sp.get('q') || '';

  const params: Record<string, string> = { limit: '50' };
  if (status) params.status = status;
  if (category) params.category = category;
  if (priority) params.priority = priority;
  if (search) params.search = search;

  const { data, isLoading } = useTasks(pid, params);
  const mut = useUpdateTask(pid);
  const tasks = data?.data || [];

  const changeStatus = async (id: string, s: string) => {
    let reason: string | undefined;
    if (['blocked', 'cancelled'].includes(s)) { reason = prompt('Reason:') || undefined; if (!reason) return; }
    await mut.mutateAsync({ taskId: id, data: { status: s, statusReason: reason } });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-48"><Input value={search} onChange={v => upd({ q: v || null })} placeholder="Search tasks..." /></div>
          <Select value={status} onChange={v => upd({ status: v || null })} placeholder="All statuses" options={[
            { label: 'Not Started', value: 'not_started' }, { label: 'In Progress', value: 'in_progress' }, { label: 'In Review', value: 'in_review' },
            { label: 'Approved', value: 'approved' }, { label: 'Published', value: 'published' }, { label: 'Blocked', value: 'blocked' },
          ]} />
          <Select value={category} onChange={v => upd({ category: v || null })} placeholder="All categories" options={[
            { label: 'On-Page', value: 'on_page' }, { label: 'Off-Page', value: 'off_page' }, { label: 'Technical', value: 'technical' },
            { label: 'Content', value: 'content' }, { label: 'Local SEO', value: 'local_seo' }, { label: 'Strategy', value: 'strategy' }, { label: 'Reporting', value: 'reporting' },
          ]} />
          <Select value={priority} onChange={v => upd({ priority: v || null })} placeholder="All priorities" options={[
            { label: 'Critical', value: 'critical' }, { label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' },
          ]} />
          {(status || category || priority || search) && <button onClick={() => upd({ status: null, category: null, priority: null, q: null })} className="text-xs text-red-500 hover:text-red-600">Clear</button>}
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">+ Add Task</Button>
      </div>

      {isLoading ? <TableSkeleton rows={8} cols={6} /> : tasks.length === 0 ? (
        <EmptyState title="No tasks" description={status || category ? 'No tasks match the current filters.' : 'Create a task to start tracking work.'} action={!status && !category && <Button onClick={() => setShowCreate(true)}>Create Task</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Task</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Assigned</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Due</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t: any) => (
                <tr key={t._id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900 truncate max-w-xs">{t.title}</p>{t.clientVisibleSummary && <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{t.clientVisibleSummary}</p>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{t.category?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2">{t.assignedTo?.avatarUrl ? <img src={t.assignedTo.avatarUrl} alt="" className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-[10px] font-semibold">{t.assignedTo?.name?.charAt(0) || '?'}</div>}<span className="text-xs text-gray-600">{t.assignedTo?.name || '—'}</span></div></td>
                  <td className="px-4 py-3"><span className={cn('text-xs font-medium capitalize', { 'text-red-600': t.priority === 'critical', 'text-orange-500': t.priority === 'high', 'text-yellow-600': t.priority === 'medium', 'text-blue-400': t.priority === 'low' })}>{t.priority}</span></td>
                  <td className="px-4 py-3"><span className={cn('text-xs', t.dueDate && new Date(t.dueDate) < new Date() && !['published', 'cancelled'].includes(t.status) ? 'text-red-500 font-medium' : 'text-gray-500')}>{t.dueDate ? formatDate(t.dueDate) : '—'}</span></td>
                  <td className="px-4 py-3"><select value={t.status} onChange={e => changeStatus(t._id, e.target.value)} className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400">{['not_started', 'in_progress', 'in_review', 'approved', 'published', 'blocked', 'cancelled'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}</select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} pid={pid} />
    </>
  );
}

function CreateTaskModal({ open, onClose, pid }: { open: boolean; onClose: () => void; pid: string }) {
  const [f, setF] = useState({ title: '', category: 'content', priority: 'medium', dueDate: '', estimatedHours: '' });
  const create = useCreateTask(pid);
  const { user } = useAuthStore();
  const submit = async () => {
    try {
      await create.mutateAsync({ ...f, assignedTo: user?._id, estimatedHours: f.estimatedHours ? Number(f.estimatedHours) : undefined });
      setF({ title: '', category: 'content', priority: 'medium', dueDate: '', estimatedHours: '' });
      onClose();
    } catch (e: any) { alert(e.message); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Create Task">
      <div className="space-y-4">
        <Input label="Title" value={f.title} onChange={v => setF({ ...f, title: v })} required placeholder="e.g., Optimize product page titles" />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Category" value={f.category} onChange={v => setF({ ...f, category: v })} options={[
            { label: 'On-Page', value: 'on_page' }, { label: 'Off-Page', value: 'off_page' }, { label: 'Technical', value: 'technical' },
            { label: 'Content', value: 'content' }, { label: 'Local SEO', value: 'local_seo' }, { label: 'Strategy', value: 'strategy' }, { label: 'Reporting', value: 'reporting' },
          ]} />
          <Select label="Priority" value={f.priority} onChange={v => setF({ ...f, priority: v })} options={[
            { label: 'Critical', value: 'critical' }, { label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' },
          ]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Due Date" type="date" value={f.dueDate} onChange={v => setF({ ...f, dueDate: v })} required />
          <Input label="Est. Hours" type="number" value={f.estimatedHours} onChange={v => setF({ ...f, estimatedHours: v })} placeholder="8" />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={create.isPending} disabled={!f.title || !f.dueDate}>Create</Button></div>
    </Modal>
  );
}

// ─── Audits (URL filters: severity, status, category) ──
function AuditsTab({ pid, sp, upd }: { pid: string; sp: SP; upd: Upd }) {
  const severity = sp.get('severity') || '';
  const status = sp.get('auditStatus') || '';
  const category = sp.get('auditCat') || '';
  const params: Record<string, string> = {};
  if (severity) params.severity = severity;
  if (status) params.status = status;
  if (category) params.category = category;

  const { data, isLoading } = useAudits(pid, params);
  const mut = useUpdateAudit(pid);
  const audits = data?.data || [];

  return (
    <>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select value={severity} onChange={v => upd({ severity: v || null })} placeholder="All severities" options={[
          { label: 'Critical', value: 'critical' }, { label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' },
        ]} />
        <Select value={status} onChange={v => upd({ auditStatus: v || null })} placeholder="All statuses" options={[
          { label: 'Open', value: 'open' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Fixed', value: 'fixed' }, { label: 'Verified', value: 'verified' }, { label: 'Deferred', value: 'deferred' },
        ]} />
        <Select value={category} onChange={v => upd({ auditCat: v || null })} placeholder="All categories" options={[
          { label: 'Crawlability', value: 'crawlability' }, { label: 'Indexation', value: 'indexation' }, { label: 'Page Speed', value: 'page_speed' },
          { label: 'Mobile', value: 'mobile' }, { label: 'Structured Data', value: 'structured_data' }, { label: 'Security', value: 'security' },
          { label: 'Core Web Vitals', value: 'cwv' }, { label: 'Internal Linking', value: 'internal_linking' }, { label: 'Duplicate Content', value: 'duplicate_content' },
        ]} />
        {(severity || status || category) && <button onClick={() => upd({ severity: null, auditStatus: null, auditCat: null })} className="text-xs text-red-500 hover:text-red-600">Clear</button>}
      </div>

      {isLoading ? <TableSkeleton /> : audits.length === 0 ? (
        <EmptyState title="No audit issues" description={severity || status ? 'No issues match the current filters.' : 'All clear!'} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Issue</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Severity</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">URLs</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {audits.map((a: any) => (
                <tr key={a._id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{a.title}</p>{a.impactEstimate && <p className="text-[10px] text-gray-400 mt-0.5">{a.impactEstimate}</p>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{a.category?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3"><SeverityBadge severity={a.severity} /></td>
                  <td className="px-4 py-3 text-xs text-gray-600">{a.affectedUrlCount || 0}</td>
                  <td className="px-4 py-3"><select value={a.status} onChange={e => mut.mutateAsync({ auditId: a._id, data: { status: e.target.value } })} className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white">{['open', 'in_progress', 'fixed', 'verified', 'wont_fix', 'deferred'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}</select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Approvals (URL filters: status, type) ──
function ApprovalsTab({ pid, sp, upd }: { pid: string; sp: SP; upd: Upd }) {
  const statusF = sp.get('approvalStatus') || '';
  const typeF = sp.get('approvalType') || '';
  const params: Record<string, string> = {};
  if (statusF) params.status = statusF;
  if (typeF) params.type = typeF;

  const { data, isLoading } = useApprovals(pid, params);
  const decide = useDecideApproval(pid);
  const approvals = data?.data || [];

  return (
    <>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select value={statusF} onChange={v => upd({ approvalStatus: v || null })} placeholder="All statuses" options={[
          { label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }, { label: 'Revision Requested', value: 'revision_requested' },
        ]} />
        <Select value={typeF} onChange={v => upd({ approvalType: v || null })} placeholder="All types" options={[
          { label: 'Content', value: 'content' }, { label: 'Strategy', value: 'strategy' }, { label: 'Technical', value: 'technical_recommendation' }, { label: 'Client Sign-off', value: 'client_signoff' },
        ]} />
        {(statusF || typeF) && <button onClick={() => upd({ approvalStatus: null, approvalType: null })} className="text-xs text-red-500 hover:text-red-600">Clear</button>}
      </div>

      {isLoading ? <TableSkeleton /> : approvals.length === 0 ? (
        <EmptyState title="No approvals" description={statusF ? 'No approvals match the current filters.' : 'Submit tasks for approval to see them here.'} />
      ) : (
        <div className="space-y-3">
          {approvals.map((a: any) => (
            <div key={a._id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{a.taskId?.title || 'Task'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.type?.replace(/_/g, ' ')} · {a.submittedBy?.name} · {formatDate(a.submittedAt)}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              {a.status === 'pending' && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Button size="sm" onClick={() => decide.mutateAsync({ approvalId: a._id, data: { decision: 'approved' } })}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => { const c = prompt('Reason:'); if (c) decide.mutateAsync({ approvalId: a._id, data: { decision: 'rejected', comments: c } }); }}>Reject</Button>
                  <Button size="sm" variant="ghost" onClick={() => { const c = prompt('Notes:'); if (c) decide.mutateAsync({ approvalId: a._id, data: { decision: 'revision_requested', comments: c } }); }}>Revision</Button>
                </div>
              )}
              {a.decisions?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  {a.decisions.map((d: any, i: number) => <p key={i} className="text-xs text-gray-500"><span className="font-medium capitalize">{d.decision?.replace(/_/g, ' ')}</span>{d.comments && ` — ${d.comments}`}<span className="text-gray-300"> · {formatDate(d.decidedAt)}</span></p>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Reviews (URL filters: type, rating) ──
function ReviewsTab({ pid, sp, upd }: { pid: string; sp: SP; upd: Upd }) {
  const typeF = sp.get('reviewType') || '';
  const ratingF = sp.get('reviewRating') || '';
  const params: Record<string, string> = {};
  if (typeF) params.type = typeF;
  if (ratingF) params.rating = ratingF;

  const { data, isLoading } = useReviews(pid, params);
  const reviews = data?.data || [];
  const rc: Record<string, string> = { pass: 'text-green-600 bg-green-50', pass_with_notes: 'text-yellow-600 bg-yellow-50', needs_revision: 'text-orange-600 bg-orange-50', fail: 'text-red-600 bg-red-50' };

  return (
    <>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select value={typeF} onChange={v => upd({ reviewType: v || null })} placeholder="All types" options={[
          { label: 'Peer', value: 'peer' }, { label: 'Technical', value: 'technical' }, { label: 'Strategic', value: 'strategic' },
        ]} />
        <Select value={ratingF} onChange={v => upd({ reviewRating: v || null })} placeholder="All ratings" options={[
          { label: 'Pass', value: 'pass' }, { label: 'Pass with Notes', value: 'pass_with_notes' }, { label: 'Needs Revision', value: 'needs_revision' }, { label: 'Fail', value: 'fail' },
        ]} />
        {(typeF || ratingF) && <button onClick={() => upd({ reviewType: null, reviewRating: null })} className="text-xs text-red-500 hover:text-red-600">Clear</button>}
      </div>

      {isLoading ? <TableSkeleton /> : reviews.length === 0 ? (
        <EmptyState title="No reviews" description={typeF || ratingF ? 'No reviews match the current filters.' : 'Reviews will appear here.'} />
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div><p className="font-medium text-gray-900">{r.taskId?.title || 'Task'}</p><p className="text-xs text-gray-500 mt-0.5">{r.type} review by {r.reviewerId?.name} · {formatDate(r.reviewedAt)}</p></div>
                <span className={cn('px-2 py-1 rounded text-xs font-medium capitalize', rc[r.rating] || 'bg-gray-100')}>{r.rating?.replace(/_/g, ' ')}</span>
              </div>
              {r.feedback && <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{r.feedback}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}