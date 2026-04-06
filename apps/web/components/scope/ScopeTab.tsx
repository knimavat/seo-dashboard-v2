'use client';

import { useState, useMemo, useEffect } from 'react';
import { useScope, useSaveScope, useRenameScopeMonth, useDeleteScopeMonth } from '@/hooks/useApi';
import { Button, Modal, Input, EmptyState, TableSkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

// ─── Predefined Constants ──────────────────────────

const SCOPE_ACTIVITIES = [
  { type: 'technical_seo', label: 'Technical SEO', unit: 'months', defaultQty: 1 },
  { type: 'competitors_analysis', label: 'Competitors Analysis', unit: 'competitors', defaultQty: 5 },
  { type: 'keywords_analysis', label: 'Keywords Analysis of Competitors', unit: 'keywords', defaultQty: 200 },
  { type: 'on_page_optimisation', label: 'On Page Optimisation', unit: 'pages', defaultQty: 50 },
  { type: 'off_page_seo', label: 'Off Page SEO & Link Building', unit: 'backlinks', defaultQty: 10 },
  { type: 'schema_structured_data', label: 'Schema & Structured Data', unit: 'pages', defaultQty: 10 },
  { type: 'ai_seo', label: 'AI SEO (AEO/GEO) Optimisation', unit: '', defaultQty: 0 },
  { type: 'google_bing_profile', label: 'Google & Bing Profile Optimisation', unit: '', defaultQty: 0 },
  { type: 'content_expansion', label: 'Content Expansion (New Pages/Blogs)', unit: 'pages', defaultQty: 0 },
  { type: 'monitoring_reporting', label: 'Monitoring & Reporting', unit: 'month', defaultQty: 1 },
];

const HOURS_TASKS = [
  { type: 'technical_seo_review', label: 'Technical SEO Review', team: 'seo' as const },
  { type: 'competitors_research', label: 'Competitors Research', team: 'seo' as const },
  { type: 'keyword_research', label: 'Keyword Research', team: 'seo' as const },
  { type: 'ai_prompt_search', label: 'AI Prompt Search', team: 'seo' as const },
  { type: 'content_writing', label: 'Content Writing/Optimization', team: 'content' as const },
  { type: 'content_peer_review', label: 'Content Peer Review', team: 'content' as const },
  { type: 'google_bing_management', label: 'Google/Bing Profile Management', team: 'seo' as const },
  { type: 'ga4_gsc_monitoring', label: 'GA4 + GSC Monitoring', team: 'seo' as const },
  { type: 'monthly_report', label: 'Monthly Report & Roadmap', team: 'seo' as const },
  { type: 'buffer_time', label: 'Buffer Time', team: 'seo' as const },
];

function monthLabel(m: string): string {
  const [y, mo] = m.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

function buildDefaultScopeItems() {
  return SCOPE_ACTIVITIES.map(a => ({
    activity: a.type,
    label: a.label,
    quantity: a.defaultQty,
    unit: a.unit,
    notes: '',
  }));
}

function buildDefaultHoursItems() {
  return HOURS_TASKS.map(h => ({
    task: h.type,
    label: h.label,
    team: h.team,
    hours: 0,
    notes: '',
  }));
}

// ─── Main Component ────────────────────────────────

export function ScopeTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useScope(projectId);
  const saveScope = useSaveScope(projectId);
  const renameScopeMonth = useRenameScopeMonth(projectId);
  const deleteScopeMonth = useDeleteScopeMonth(projectId);

  const months: any[] = data?.data?.months || [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [showEditMonth, setShowEditMonth] = useState(false);
  const [showCopyMonth, setShowCopyMonth] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Editing state
  const [editingScope, setEditingScope] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [scopeDraft, setScopeDraft] = useState<any[]>([]);
  const [hoursDraft, setHoursDraft] = useState<any[]>([]);
  const [extraTimeDraft, setExtraTimeDraft] = useState(0);

  const currentMonth = months[selectedIdx] || null;

  // Auto-calculated summaries for the hours draft
  const hoursSummary = useMemo(() => {
    const items = editingHours ? hoursDraft : (currentMonth?.hoursAllocation || []);
    const extra = editingHours ? extraTimeDraft : (currentMonth?.summary?.extraTime || 0);
    const seo = items.filter((h: any) => h.team === 'seo').reduce((s: number, h: any) => s + (Number(h.hours) || 0), 0);
    const content = items.filter((h: any) => h.team === 'content').reduce((s: number, h: any) => s + (Number(h.hours) || 0), 0);
    return { seoTeamHours: seo, contentTeamHours: content, extraTime: extra, totalHours: seo + content + extra };
  }, [editingHours, hoursDraft, extraTimeDraft, currentMonth]);

  const startEditScope = () => {
    setScopeDraft(JSON.parse(JSON.stringify(currentMonth?.scopeItems || buildDefaultScopeItems())));
    setEditingScope(true);
  };

  const startEditHours = () => {
    setHoursDraft(JSON.parse(JSON.stringify(currentMonth?.hoursAllocation || buildDefaultHoursItems())));
    setExtraTimeDraft(currentMonth?.summary?.extraTime || 0);
    setEditingHours(true);
  };

  const saveAll = async (scopeItems: any[], hoursAllocation: any[], extraTime: number) => {
    if (!currentMonth) return;
    try {
      await saveScope.mutateAsync({
        month: currentMonth.month,
        scopeItems,
        hoursAllocation,
        extraTime,
      });
      setEditingScope(false);
      setEditingHours(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleSaveScope = () => {
    saveAll(scopeDraft, currentMonth?.hoursAllocation || [], currentMonth?.summary?.extraTime || 0);
  };

  const handleSaveHours = () => {
    saveAll(currentMonth?.scopeItems || [], hoursDraft, extraTimeDraft);
  };

  const handleDeleteMonth = async () => {
    if (!currentMonth || !confirm(`Delete scope for ${monthLabel(currentMonth.month)}? This cannot be undone.`)) return;
    try {
      await deleteScopeMonth.mutateAsync(currentMonth.month);
      setSelectedIdx(Math.max(0, selectedIdx - 1));
      setEditingScope(false);
      setEditingHours(false);
    } catch (e: any) { alert(e.message); }
  };

  return (
    <>
      {/* Guide Banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex items-start justify-between">
          <p className="text-sm text-blue-700">Define your monthly SEO scope of work and team hours allocation. Plan deliverables, track team capacity, and set client expectations month by month.</p>
          <button onClick={() => setShowGuide(!showGuide)} className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap ml-3 underline">{showGuide ? 'Hide guide' : 'How it works'}</button>
        </div>
        {showGuide && (
          <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700 space-y-2">
            <p><strong>Scope of Work</strong> — Define what activities you will perform each month and the target quantities (e.g., 5 competitors, 200 keywords, 50 pages).</p>
            <p><strong>Hours Allocation</strong> — Allocate team hours per task category. Hours are split between SEO team and Content team, with totals auto-calculated.</p>
            <p><strong>Month tabs</strong> — Each month is independent. Add months to plan a 3, 6, or 12-month engagement. You can edit or delete any month.</p>
          </div>
        )}
      </div>

      {isLoading ? <TableSkeleton rows={8} cols={4} /> : (
        <>
          {/* Month Selector */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {months.map((m: any, i: number) => (
              <button
                key={m.month}
                onClick={() => { setSelectedIdx(i); setEditingScope(false); setEditingHours(false); }}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  i === selectedIdx
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'
                )}
              >
                <span className="text-[10px] text-opacity-70 block leading-tight">{`Month ${i + 1}`}</span>
                {monthLabel(m.month)}
              </button>
            ))}
            <Button size="sm" variant="secondary" onClick={() => setShowAddMonth(true)}>+ Add Month</Button>
          </div>

          {months.length === 0 ? (
            <EmptyState
              title="No scope defined yet"
              description="Add your first month to start planning the SEO scope of work and team hours."
              action={<Button onClick={() => setShowAddMonth(true)}>Add First Month</Button>}
            />
          ) : currentMonth && (
            <>
              {/* Scope of Work Table */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scope of Work — {monthLabel(currentMonth.month)}</h3>
                  {!editingScope && <button onClick={startEditScope} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</button>}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[40%]">Activity</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[15%]">Quantity</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[15%]">Unit</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[30%]">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(editingScope ? scopeDraft : currentMonth.scopeItems || []).map((item: any, i: number) => (
                        <tr key={item.activity} className="hover:bg-gray-50/80">
                          <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
                          <td className="px-4 py-3 text-right">
                            {editingScope ? (
                              <input
                                type="number"
                                value={scopeDraft[i]?.quantity ?? 0}
                                onChange={e => { const d = [...scopeDraft]; d[i] = { ...d[i], quantity: Number(e.target.value) || 0 }; setScopeDraft(d); }}
                                className="w-20 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-400 outline-none"
                              />
                            ) : (
                              <span className={cn('font-semibold', item.quantity > 0 ? 'text-gray-900' : 'text-gray-300')}>{item.quantity || '—'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{item.unit || '—'}</td>
                          <td className="px-4 py-3">
                            {editingScope ? (
                              <input
                                type="text"
                                value={scopeDraft[i]?.notes ?? ''}
                                onChange={e => { const d = [...scopeDraft]; d[i] = { ...d[i], notes: e.target.value }; setScopeDraft(d); }}
                                placeholder="Optional notes..."
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-400 outline-none"
                              />
                            ) : (
                              <span className="text-gray-500 text-xs">{item.notes || '—'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {editingScope && (
                  <div className="flex justify-end gap-2 mt-3">
                    <Button size="sm" variant="secondary" onClick={() => setEditingScope(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveScope} loading={saveScope.isPending}>Save Scope</Button>
                  </div>
                )}
              </div>

              {/* Hours Allocation Table */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hours Allocation — {monthLabel(currentMonth.month)}</h3>
                  {!editingHours && <button onClick={startEditHours} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Edit</button>}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[40%]">Task</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[15%]">Team</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[15%]">Hours</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[30%]">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(editingHours ? hoursDraft : currentMonth.hoursAllocation || []).map((item: any, i: number) => (
                        <tr key={item.task} className="hover:bg-gray-50/80">
                          <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                              item.team === 'seo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            )}>
                              {item.team}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {editingHours ? (
                              <input
                                type="number"
                                value={hoursDraft[i]?.hours ?? 0}
                                onChange={e => { const d = [...hoursDraft]; d[i] = { ...d[i], hours: Number(e.target.value) || 0 }; setHoursDraft(d); }}
                                className="w-20 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-400 outline-none"
                              />
                            ) : (
                              <span className={cn('font-semibold', item.hours > 0 ? 'text-gray-900' : 'text-gray-300')}>{item.hours || '—'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingHours ? (
                              <input
                                type="text"
                                value={hoursDraft[i]?.notes ?? ''}
                                onChange={e => { const d = [...hoursDraft]; d[i] = { ...d[i], notes: e.target.value }; setHoursDraft(d); }}
                                placeholder="Optional notes..."
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-400 outline-none"
                              />
                            ) : (
                              <span className="text-gray-500 text-xs">{item.notes || '—'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Summary Footer */}
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr className="border-b border-gray-100">
                        <td className="px-4 py-2 font-semibold text-gray-700" colSpan={2}>SEO Team Total</td>
                        <td className="px-4 py-2 text-right font-bold text-blue-700">{hoursSummary.seoTeamHours}h</td>
                        <td />
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="px-4 py-2 font-semibold text-gray-700" colSpan={2}>Content Team Total</td>
                        <td className="px-4 py-2 text-right font-bold text-purple-700">{hoursSummary.contentTeamHours}h</td>
                        <td />
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="px-4 py-2 font-semibold text-gray-700" colSpan={2}>Extra Time</td>
                        <td className="px-4 py-2 text-right">
                          {editingHours ? (
                            <input
                              type="number"
                              value={extraTimeDraft}
                              onChange={e => setExtraTimeDraft(Number(e.target.value) || 0)}
                              className="w-20 text-right text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-400 outline-none"
                            />
                          ) : (
                            <span className="font-bold text-gray-600">{hoursSummary.extraTime}h</span>
                          )}
                        </td>
                        <td />
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-bold text-gray-900 text-base" colSpan={2}>Grand Total</td>
                        <td className="px-4 py-3 text-right font-bold text-brand-700 text-base">{hoursSummary.totalHours}h</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {editingHours && (
                  <div className="flex justify-end gap-2 mt-3">
                    <Button size="sm" variant="secondary" onClick={() => setEditingHours(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveHours} loading={saveScope.isPending}>Save Hours</Button>
                  </div>
                )}
              </div>

              {/* Month Actions */}
              <div className="flex items-center justify-center gap-4 pt-2 pb-4">
                <button onClick={() => setShowEditMonth(true)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Edit Month
                </button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setShowCopyMonth(true)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Copy to New Month
                </button>
                <span className="text-gray-300">|</span>
                <button onClick={handleDeleteMonth} className="text-xs text-red-400 hover:text-red-600 font-medium">
                  Delete {monthLabel(currentMonth.month)}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Add Month Modal */}
      <AddMonthModal
        open={showAddMonth}
        onClose={() => setShowAddMonth(false)}
        projectId={projectId}
        existingMonths={months.map((m: any) => m.month)}
        onSuccess={(newIdx: number) => { setSelectedIdx(newIdx); setShowAddMonth(false); }}
      />

      {/* Edit Month Modal */}
      {currentMonth && (
        <EditMonthModal
          open={showEditMonth}
          onClose={() => setShowEditMonth(false)}
          projectId={projectId}
          currentMonth={currentMonth.month}
          existingMonths={months.map((m: any) => m.month)}
          onSuccess={(newMonth: string) => {
            const allMonths = months.map((m: any) => m.month === currentMonth.month ? newMonth : m.month).sort();
            setSelectedIdx(allMonths.indexOf(newMonth));
            setShowEditMonth(false);
          }}
        />
      )}

      {/* Copy Month Modal */}
      {currentMonth && (
        <CopyMonthModal
          open={showCopyMonth}
          onClose={() => setShowCopyMonth(false)}
          projectId={projectId}
          sourceMonth={currentMonth}
          existingMonths={months.map((m: any) => m.month)}
          onSuccess={(newIdx: number) => { setSelectedIdx(newIdx); setShowCopyMonth(false); }}
        />
      )}
    </>
  );
}

// ─── Add Month Modal ───────────────────────────────

function AddMonthModal({ open, onClose, projectId, existingMonths, onSuccess }: {
  open: boolean; onClose: () => void; projectId: string; existingMonths: string[]; onSuccess: (idx: number) => void;
}) {
  const saveScope = useSaveScope(projectId);
  const [month, setMonth] = useState('');

  // Default to next month after the last existing one
  const getDefaultMonth = () => {
    if (existingMonths.length === 0) return new Date().toISOString().slice(0, 7);
    const last = existingMonths[existingMonths.length - 1];
    const [y, m] = last.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    return next;
  };

  useEffect(() => {
    if (open && !month) setMonth(getDefaultMonth());
  }, [open]);

  const handleSubmit = async () => {
    if (existingMonths.includes(month)) {
      alert(`Scope for ${monthLabel(month)} already exists. Select a different month.`);
      return;
    }
    try {
      await saveScope.mutateAsync({
        month,
        scopeItems: buildDefaultScopeItems(),
        hoursAllocation: buildDefaultHoursItems(),
        extraTime: 0,
      });
      const allMonths = [...existingMonths, month].sort();
      const newIdx = allMonths.indexOf(month);
      setMonth('');
      onSuccess(newIdx);
    } catch (e: any) { alert(e.message); }
  };

  return (
    <Modal open={open} onClose={() => { setMonth(''); onClose(); }} title="Add Month to Scope">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-700">This creates a new month with default scope items and zero hours. You can edit everything after adding.</p>
        </div>
        <Input
          label="Month"
          value={month}
          onChange={setMonth}
          placeholder="YYYY-MM (e.g., 2026-04)"
        />
        {existingMonths.includes(month) && (
          <p className="text-xs text-red-500">This month already exists in the scope.</p>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={() => { setMonth(''); onClose(); }}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saveScope.isPending} disabled={!month || existingMonths.includes(month)}>Add Month</Button>
      </div>
    </Modal>
  );
}

// ─── Edit Month Modal ──────────────────────────────

function EditMonthModal({ open, onClose, projectId, currentMonth, existingMonths, onSuccess }: {
  open: boolean; onClose: () => void; projectId: string; currentMonth: string; existingMonths: string[]; onSuccess: (newMonth: string) => void;
}) {
  const renameScopeMonth = useRenameScopeMonth(projectId);
  const [newMonth, setNewMonth] = useState(currentMonth);

  useEffect(() => {
    if (open) setNewMonth(currentMonth);
  }, [open, currentMonth]);

  const isDuplicate = newMonth !== currentMonth && existingMonths.includes(newMonth);
  const isValid = /^\d{4}-\d{2}$/.test(newMonth) && newMonth !== currentMonth && !isDuplicate;

  const handleSubmit = async () => {
    try {
      await renameScopeMonth.mutateAsync({ month: currentMonth, newMonth });
      onSuccess(newMonth);
    } catch (e: any) { alert(e.message); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Month">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Change the month for the current scope from <strong>{monthLabel(currentMonth)}</strong>.</p>
        <Input
          label="New Month"
          value={newMonth}
          onChange={setNewMonth}
          placeholder="YYYY-MM (e.g., 2026-05)"
        />
        {isDuplicate && <p className="text-xs text-red-500">This month already exists in the scope.</p>}
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={renameScopeMonth.isPending} disabled={!isValid}>Rename Month</Button>
      </div>
    </Modal>
  );
}

// ─── Copy Month Modal ──────────────────────────────

function CopyMonthModal({ open, onClose, projectId, sourceMonth, existingMonths, onSuccess }: {
  open: boolean; onClose: () => void; projectId: string; sourceMonth: any; existingMonths: string[]; onSuccess: (idx: number) => void;
}) {
  const saveScope = useSaveScope(projectId);
  const [targetMonth, setTargetMonth] = useState('');

  // Default to next month after source
  const getDefaultTarget = () => {
    const [y, m] = sourceMonth.month.split('-').map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (open) setTargetMonth(getDefaultTarget());
  }, [open, sourceMonth.month]);

  const isDuplicate = existingMonths.includes(targetMonth);
  const isValid = /^\d{4}-\d{2}$/.test(targetMonth) && !isDuplicate;

  const handleSubmit = async () => {
    try {
      await saveScope.mutateAsync({
        month: targetMonth,
        scopeItems: JSON.parse(JSON.stringify(sourceMonth.scopeItems || buildDefaultScopeItems())),
        hoursAllocation: JSON.parse(JSON.stringify(sourceMonth.hoursAllocation || buildDefaultHoursItems())),
        extraTime: sourceMonth.summary?.extraTime || 0,
      });
      const allMonths = [...existingMonths, targetMonth].sort();
      const newIdx = allMonths.indexOf(targetMonth);
      setTargetMonth('');
      onSuccess(newIdx);
    } catch (e: any) { alert(e.message); }
  };

  return (
    <Modal open={open} onClose={() => { setTargetMonth(''); onClose(); }} title="Copy Scope to New Month">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-700">This copies all scope items, hours allocation, and extra time from <strong>{monthLabel(sourceMonth.month)}</strong> to a new month.</p>
        </div>
        <Input
          label="Target Month"
          value={targetMonth}
          onChange={setTargetMonth}
          placeholder="YYYY-MM (e.g., 2026-05)"
        />
        {isDuplicate && <p className="text-xs text-red-500">This month already exists in the scope.</p>}
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={() => { setTargetMonth(''); onClose(); }}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saveScope.isPending} disabled={!isValid}>Copy Scope</Button>
      </div>
    </Modal>
  );
}
