'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Modal, Input, EmptyState, TableSkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

// ─── Formatters ────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(2) + '%';
}

function fmtTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtPos(n: number): string {
  return n > 0 ? n.toFixed(1) : '—';
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

// ═══════════════════════════════════════════════════
export function AnalyticsTab({ projectId }: { projectId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editMonth, setEditMonth] = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', projectId],
    queryFn: () => api.getAnalytics(projectId),
  });
  const entries = data?.data || [];

  const handleDelete = async (month: string) => {
    if (!confirm(`Delete analytics for ${monthLabel(month)}?`)) return;
    await api.deleteAnalytics(projectId, month);
    qc.invalidateQueries({ queryKey: ['analytics', projectId] });
  };

  const metrics = [
    { key: 'clicks', label: 'Clicks', fmt: fmtNum },
    { key: 'impressions', label: 'Impressions', fmt: fmtNum },
    { key: 'organicTraffic', label: 'Organic Traffic', fmt: fmtNum },
    { key: 'engagementRate', label: 'Engagement Rate', fmt: fmtPct },
    { key: 'pageViews', label: 'Page Views', fmt: fmtNum },
    { key: 'averagePosition', label: 'Avg Position', fmt: fmtPos },
    { key: 'totalUsers', label: 'Total Users', fmt: fmtNum },
    { key: 'newUsers', label: 'New Users', fmt: fmtNum },
    { key: 'returningUsers', label: 'Returning Users', fmt: fmtNum },
    { key: 'activeUsers', label: 'Active Users', fmt: fmtNum },
    { key: 'engagementTime', label: 'Engagement Time', fmt: fmtTime },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{entries.length} month{entries.length !== 1 ? 's' : ''} of data</p>
        <Button size="sm" onClick={() => { setEditMonth(null); setShowAdd(true); }}>+ Add Monthly Data</Button>
      </div>

      {isLoading ? <TableSkeleton rows={6} cols={12} /> : entries.length === 0 ? (
        <EmptyState
          title="No analytics data yet"
          description="Add monthly analytics data to track website performance over time."
          action={<Button onClick={() => setShowAdd(true)}>Add Monthly Data</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Month</th>
                {metrics.map(m => (
                  <th key={m.key} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{m.label}</th>
                ))}
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry: any, idx: number) => {
                const prev = entries[idx + 1]; // Previous month (entries sorted desc)
                return (
                  <tr key={entry._id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-semibold text-gray-900 sticky left-0 bg-white z-10">
                      {monthLabel(entry.month)}
                    </td>
                    {metrics.map(m => {
                      const val = entry[m.key];
                      const prevVal = prev?.[m.key];
                      let changeDir = 0;
                      if (prevVal !== undefined && prevVal !== 0) {
                        if (m.key === 'averagePosition') {
                          changeDir = val < prevVal ? 1 : val > prevVal ? -1 : 0; // Lower is better
                        } else {
                          changeDir = val > prevVal ? 1 : val < prevVal ? -1 : 0;
                        }
                      }
                      return (
                        <td key={m.key} className="px-4 py-3 text-right">
                          <span className="font-medium text-gray-900">{m.fmt(val)}</span>
                          {changeDir !== 0 && (
                            <span className={cn('ml-1 text-[10px]', changeDir > 0 ? 'text-green-600' : 'text-red-500')}>
                              {changeDir > 0 ? '↑' : '↓'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditMonth(entry); setShowAdd(true); }} className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1">Edit</button>
                        <button onClick={() => handleDelete(entry.month)} className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1">Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AnalyticsFormModal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditMonth(null); }}
        projectId={projectId}
        existing={editMonth}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['analytics', projectId] })}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════
// FORM MODAL
// ═══════════════════════════════════════════════════
function AnalyticsFormModal({ open, onClose, projectId, existing, onSuccess }: {
  open: boolean; onClose: () => void; projectId: string; existing: any; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    month: '', clicks: '', impressions: '', organicTraffic: '',
    engagementRate: '', pageViews: '', averagePosition: '',
    totalUsers: '', newUsers: '', returningUsers: '', activeUsers: '',
    engagementTimeMin: '', engagementTimeSec: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Populate when editing
  useState(() => {
    if (existing && open) {
      const engMin = Math.floor((existing.engagementTime || 0) / 60);
      const engSec = Math.round((existing.engagementTime || 0) % 60);
      setForm({
        month: existing.month || '',
        clicks: String(existing.clicks || ''),
        impressions: String(existing.impressions || ''),
        organicTraffic: String(existing.organicTraffic || ''),
        engagementRate: String(existing.engagementRate ? (existing.engagementRate * 100).toFixed(2) : ''),
        pageViews: String(existing.pageViews || ''),
        averagePosition: String(existing.averagePosition || ''),
        totalUsers: String(existing.totalUsers || ''),
        newUsers: String(existing.newUsers || ''),
        returningUsers: String(existing.returningUsers || ''),
        activeUsers: String(existing.activeUsers || ''),
        engagementTimeMin: String(engMin || ''),
        engagementTimeSec: String(engSec || ''),
        notes: existing.notes || '',
      });
    } else if (!existing && open) {
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setForm(f => ({
        ...f,
        month: `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`,
      }));
    }
  });

  // Re-populate when existing changes
  if (existing && form.month !== existing.month) {
    const engMin = Math.floor((existing.engagementTime || 0) / 60);
    const engSec = Math.round((existing.engagementTime || 0) % 60);
    setForm({
      month: existing.month || '',
      clicks: String(existing.clicks || ''),
      impressions: String(existing.impressions || ''),
      organicTraffic: String(existing.organicTraffic || ''),
      engagementRate: String(existing.engagementRate ? (existing.engagementRate * 100).toFixed(2) : ''),
      pageViews: String(existing.pageViews || ''),
      averagePosition: String(existing.averagePosition || ''),
      totalUsers: String(existing.totalUsers || ''),
      newUsers: String(existing.newUsers || ''),
      returningUsers: String(existing.returningUsers || ''),
      activeUsers: String(existing.activeUsers || ''),
      engagementTimeMin: String(engMin || ''),
      engagementTimeSec: String(engSec || ''),
      notes: existing.notes || '',
    });
  }

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const engagementTime = (parseInt(form.engagementTimeMin) || 0) * 60 + (parseInt(form.engagementTimeSec) || 0);
      await api.saveAnalytics(projectId, {
        month: form.month,
        clicks: parseInt(form.clicks) || 0,
        impressions: parseInt(form.impressions) || 0,
        organicTraffic: parseInt(form.organicTraffic) || 0,
        engagementRate: (parseFloat(form.engagementRate) || 0) / 100, // Convert % to decimal
        pageViews: parseInt(form.pageViews) || 0,
        averagePosition: parseFloat(form.averagePosition) || 0,
        totalUsers: parseInt(form.totalUsers) || 0,
        newUsers: parseInt(form.newUsers) || 0,
        returningUsers: parseInt(form.returningUsers) || 0,
        activeUsers: parseInt(form.activeUsers) || 0,
        engagementTime,
        notes: form.notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={existing ? `Edit Analytics — ${monthLabel(form.month)}` : 'Add Monthly Analytics'} size="lg">
      <div className="space-y-4">
        <Input label="Month (YYYY-MM)" value={form.month} onChange={v => set('month', v)} required placeholder="2026-03" />

        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Search Console Metrics</p>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Total Clicks" type="number" value={form.clicks} onChange={v => set('clicks', v)} placeholder="12,450" />
            <Input label="Total Impressions" type="number" value={form.impressions} onChange={v => set('impressions', v)} placeholder="284,000" />
            <Input label="Average Position" type="number" value={form.averagePosition} onChange={v => set('averagePosition', v)} placeholder="14.3" />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Traffic & Users</p>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Organic Traffic" type="number" value={form.organicTraffic} onChange={v => set('organicTraffic', v)} placeholder="8,200" />
            <Input label="Total Users" type="number" value={form.totalUsers} onChange={v => set('totalUsers', v)} placeholder="10,500" />
            <Input label="New Users" type="number" value={form.newUsers} onChange={v => set('newUsers', v)} placeholder="7,200" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <Input label="Returning Users" type="number" value={form.returningUsers} onChange={v => set('returningUsers', v)} placeholder="3,300" />
            <Input label="Active Users" type="number" value={form.activeUsers} onChange={v => set('activeUsers', v)} placeholder="4,100" />
            <Input label="Page Views" type="number" value={form.pageViews} onChange={v => set('pageViews', v)} placeholder="24,600" />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Engagement</p>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Engagement Rate (%)" type="number" value={form.engagementRate} onChange={v => set('engagementRate', v)} placeholder="65.32" />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Eng. Time (min)" type="number" value={form.engagementTimeMin} onChange={v => set('engagementTimeMin', v)} placeholder="2" />
              <Input label="(sec)" type="number" value={form.engagementTimeSec} onChange={v => set('engagementTimeSec', v)} placeholder="45" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            placeholder="Any notes about this month's data..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} disabled={!form.month}>
          {existing ? 'Update' : 'Save'} Analytics
        </Button>
      </div>
    </Modal>
  );
}
