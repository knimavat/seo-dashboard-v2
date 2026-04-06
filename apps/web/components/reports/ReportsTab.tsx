'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { Button, Modal, Input, StatusBadge, EmptyState, TableSkeleton } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export function ReportsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['reports', projectId],
    queryFn: () => api.getReports(projectId),
  });
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuthStore();
  const reports = data?.data || [];

  const handleDelete = async (reportId: string) => {
    if (!confirm('Delete this report link? Clients will lose access.')) return;
    try {
      await api.deleteReport(projectId, reportId);
      qc.invalidateQueries({ queryKey: ['reports', projectId] });
    } catch (err: any) { alert(err.message); }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">{reports.length} report link{reports.length !== 1 ? 's' : ''}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Reports are live — data updates automatically when you add new analytics, keywords, or tasks.</p>
        </div>
        {user?.role === 'admin' && <Button onClick={() => setShowCreate(true)}>Create Report Link</Button>}
      </div>

      {isLoading ? <TableSkeleton /> : reports.length === 0 ? (
        <EmptyState
          title="No report links"
          description="Create a shareable report link for your client. Reports show live data — no need to regenerate."
          action={user?.role === 'admin' && <Button onClick={() => setShowCreate(true)}>Create Report Link</Button>}
        />
      ) : (
        <div className="space-y-3">
          {reports.map((r: any) => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Created {formatDate(r.createdAt)} · {r.viewCount || 0} views
                    {r.lastViewedAt && <span> · Last viewed {formatDate(r.lastViewedAt)}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} size="xs" />
                  {r.status === 'active' && (
                    <>
                      <a href={`/report/${r.token}`} target="_blank" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                        Open →
                      </a>
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/report/${r.token}`); alert('Link copied!'); }}
                        className="text-xs text-gray-400 hover:text-gray-600" title="Copy link"
                      >📋</button>
                    </>
                  )}
                  <button onClick={() => handleDelete(r._id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateReportModal open={showCreate} onClose={() => setShowCreate(false)} projectId={projectId} onSuccess={() => qc.invalidateQueries({ queryKey: ['reports', projectId] })} />
    </>
  );
}

const REPORT_SECTIONS = [
  { key: 'analytics', label: 'Analytics', description: 'Traffic, conversions, and performance metrics' },
  { key: 'keywords', label: 'Keywords', description: 'Keyword rankings and tracking data' },
  { key: 'tasks', label: 'Tasks', description: 'SEO task progress and status' },
  { key: 'audits', label: 'Audits', description: 'Technical SEO audit findings' },
  { key: 'approvals', label: 'Approvals', description: 'Client approval requests and decisions' },
  { key: 'reviews', label: 'Reviews', description: 'Review management and responses' },
  { key: 'competitors', label: 'Competitors', description: 'Competitor analysis and comparison data' },
  { key: 'scope', label: 'Scope of Work', description: 'Monthly deliverables and activity plan (hours excluded)' },
] as const;

type SectionKey = typeof REPORT_SECTIONS[number]['key'];

function CreateReportModal({ open, onClose, projectId, onSuccess }: { open: boolean; onClose: () => void; projectId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', password: '' });
  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    analytics: true, keywords: true, tasks: true, audits: true, approvals: true, reviews: true, competitors: true, scope: true,
  });
  const [loading, setLoading] = useState(false);

  const toggleSection = (key: SectionKey) => setSections(s => ({ ...s, [key]: !s[key] }));
  const allSelected = REPORT_SECTIONS.every(s => sections[s.key]);
  const toggleAll = () => {
    const next = !allSelected;
    setSections(Object.fromEntries(REPORT_SECTIONS.map(s => [s.key, next])) as Record<SectionKey, boolean>);
  };

  const handleSubmit = async () => {
    if (!REPORT_SECTIONS.some(s => sections[s.key])) {
      alert('Please select at least one section to include in the report.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.generateReport(projectId, {
        name: form.name || undefined,
        password: form.password || undefined,
        sectionVisibility: sections,
      });

      const url = `${window.location.origin}${result.data?.publicUrl}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      alert(`Report link created!\n\n${url}\n\n(Copied to clipboard)`);
      setForm({ name: '', password: '' });
      setSections({ analytics: true, keywords: true, tasks: true, audits: true, approvals: true, reviews: true, competitors: true, scope: true });
      onSuccess();
      onClose();
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Report Link" size="md">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            This creates a shareable link that shows <strong>live project data</strong>. Choose which sections the client can see in the report.
          </p>
        </div>

        <Input label="Report Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g., TechNova Monthly Report" />

        <div>
          <Input label="Password Protection (optional)" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="Leave blank for no password" />
          <p className="text-[10px] text-gray-400 mt-1">If set, viewers must enter this password before seeing the report.</p>
        </div>

        {/* Section Visibility */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Report Sections</label>
            <button onClick={toggleAll} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            {REPORT_SECTIONS.map(s => (
              <label key={s.key} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-100/50">
                <input
                  type="checkbox"
                  checked={sections[s.key]}
                  onChange={() => toggleSection(s.key)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900">{s.label}</span>
                  <p className="text-[10px] text-gray-400">{s.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading}>Create Link</Button>
      </div>
    </Modal>
  );
}