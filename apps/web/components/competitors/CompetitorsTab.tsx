'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button, Modal, Input, EmptyState, TableSkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

export function CompetitorsTab({ projectId }: { projectId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ backlinks: string; organicTraffic: string; totalKeywords: string; domainRating: string }>({ backlinks: '', organicTraffic: '', totalKeywords: '', domainRating: '' });
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['competitors', projectId],
    queryFn: () => api.getCompetitors(projectId),
  });
  const competitors: any[] = data?.data || [];

  const getLatest = (comp: any) => {
    if (!comp.snapshots?.length) return null;
    return comp.snapshots.sort((a: any, b: any) => b.month.localeCompare(a.month))[0];
  };

  const getForMonth = (comp: any, month: string) => {
    return comp.snapshots?.find((s: any) => s.month === month) || null;
  };

  const allMonths = [...new Set<string>(competitors.flatMap((c: any) => (c.snapshots?.map((s: any) => s.month) || []) as string[]))].sort().reverse();

  const latestMonth = allMonths[0] || new Date().toISOString().slice(0, 7);

  const filtered = competitors.filter((c: any) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.domain?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this competitor? All snapshot history will be deleted.')) return;
    await api.deleteCompetitor(projectId, id);
    qc.invalidateQueries({ queryKey: ['competitors', projectId] });
  };

  const startEdit = (comp: any) => {
    const latest = getLatest(comp);
    setEditingId(comp._id);
    setEditData({
      domainRating: String(latest?.domainRating || ''),
      backlinks: String(latest?.backlinks || ''),
      organicTraffic: String(latest?.organicTraffic || ''),
      totalKeywords: String(latest?.totalKeywords || ''),
    });
  };

  const saveEdit = async (compId: string) => {
    try {
      await api.addCompetitorSnapshot(projectId, compId, {
        month: latestMonth,
        domainRating: parseInt(editData.domainRating) || 0,
        backlinks: parseInt(editData.backlinks) || 0,
        organicTraffic: parseInt(editData.organicTraffic) || 0,
        totalKeywords: parseInt(editData.totalKeywords) || 0,
      });
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['competitors', projectId] });
    } catch (err: any) { alert(err.message); }
  };

  return (
    <>
      {/* Guide Banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex items-start justify-between">
          <p className="text-sm text-blue-700">Track competitor SEO metrics over time — domain rating, backlinks, traffic, and keywords. Compare your progress against the competition month by month.</p>
          <button onClick={() => setShowGuide(!showGuide)} className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap ml-3 underline">{showGuide ? 'Hide guide' : 'How it works'}</button>
        </div>
        {showGuide && (
          <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700 space-y-2">
            <p><strong>Current Data table</strong> — Shows the latest metrics for each competitor. Use <strong>Edit</strong> to correct values for the current month, or <strong>Remove</strong> to delete a competitor entirely.</p>
            <p><strong>+ Add Competitor</strong> — Adds a new competitor with an initial data snapshot for a given month.</p>
            <p><strong>Update Data (bulk)</strong> — Opens a form to enter new metrics for ALL competitors at once for a specific month. Use this at the start of each month to record fresh data. It creates a new snapshot for the selected month — it does NOT overwrite previous months.</p>
            <p><strong>Monthly History</strong> — Browse snapshots by month to see how competitor metrics changed over time. Each month is an independent snapshot.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search competitors..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-56 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          <p className="text-sm text-gray-400">{filtered.length} of {competitors.length}</p>
        </div>
        <div className="flex items-center gap-2">
          {competitors.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setShowUpdate(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Update Data
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Competitor</Button>
        </div>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={6} /> : competitors.length === 0 ? (
        <EmptyState
          title="No competitors tracked"
          description="Add competitors to compare backlinks, traffic, keywords, and domain ratings."
          action={<Button onClick={() => setShowAdd(true)}>Add Competitor</Button>}
        />
      ) : (
        <>
          {/* Current Data Table */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Data {latestMonth && <span className="text-gray-300 normal-case font-normal ml-1">({monthLabel(latestMonth)})</span>}</h3>
            {filtered.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
                <p className="text-sm text-gray-400">No competitors match &quot;{search}&quot;</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Competitor</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Domain Rating</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Backlinks</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Organic Traffic</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Keywords</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((comp: any) => {
                      const latest = getLatest(comp);
                      const isEditing = editingId === comp._id;
                      return (
                        <tr key={comp._id} className="hover:bg-gray-50/80">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{comp.name}</p>
                            <p className="text-[10px] text-gray-400">{comp.domain}</p>
                          </td>
                          {isEditing ? (
                            <>
                              <td className="px-2 py-2 text-right"><input type="number" value={editData.domainRating} onChange={e => setEditData({ ...editData, domainRating: e.target.value })} className="w-20 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-400 outline-none" /></td>
                              <td className="px-2 py-2 text-right"><input type="number" value={editData.backlinks} onChange={e => setEditData({ ...editData, backlinks: e.target.value })} className="w-24 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-400 outline-none" /></td>
                              <td className="px-2 py-2 text-right"><input type="number" value={editData.organicTraffic} onChange={e => setEditData({ ...editData, organicTraffic: e.target.value })} className="w-24 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-400 outline-none" /></td>
                              <td className="px-2 py-2 text-right"><input type="number" value={editData.totalKeywords} onChange={e => setEditData({ ...editData, totalKeywords: e.target.value })} className="w-24 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-brand-400 outline-none" /></td>
                              <td className="px-4 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => saveEdit(comp._id)} className="text-xs text-green-600 hover:text-green-700 font-medium px-1.5 py-0.5 rounded hover:bg-green-50">Save</button>
                                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600 font-medium px-1.5 py-0.5 rounded hover:bg-gray-100">Cancel</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-right"><DRBadge value={latest?.domainRating || 0} /></td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">{latest ? fmtNum(latest.backlinks) : '—'}</td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">{latest ? fmtNum(latest.organicTraffic) : '—'}</td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">{latest ? fmtNum(latest.totalKeywords) : '—'}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => startEdit(comp)} className="text-xs text-brand-600 hover:text-brand-700 font-medium px-1.5 py-0.5 rounded hover:bg-brand-50">Edit</button>
                                  <button onClick={() => handleDelete(comp._id)} className="text-xs text-red-500 hover:text-red-600 font-medium px-1.5 py-0.5 rounded hover:bg-red-50">Remove</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Monthly History */}
          {allMonths.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Monthly History</h3>
              <div className="flex items-center gap-2 mb-3">
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-xs border border-gray-200 rounded-md px-3 py-1.5 bg-white">
                  {allMonths.map((m: string) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Competitor</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">DR</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Backlinks</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Organic Traffic</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Keywords</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {competitors.map((comp: any) => {
                      const snap = getForMonth(comp, selectedMonth);
                      return (
                        <tr key={comp._id} className="hover:bg-gray-50/80">
                          <td className="px-4 py-3 font-medium text-gray-900">{comp.name}</td>
                          <td className="px-4 py-3 text-right">{snap ? <DRBadge value={snap.domainRating} /> : <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{snap ? fmtNum(snap.backlinks) : '—'}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{snap ? fmtNum(snap.organicTraffic) : '—'}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{snap ? fmtNum(snap.totalKeywords) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <AddCompetitorModal open={showAdd} onClose={() => setShowAdd(false)} projectId={projectId} onSuccess={() => qc.invalidateQueries({ queryKey: ['competitors', projectId] })} />
      <BulkUpdateModal open={showUpdate} onClose={() => setShowUpdate(false)} projectId={projectId} competitors={competitors} onSuccess={() => qc.invalidateQueries({ queryKey: ['competitors', projectId] })} />
    </>
  );
}

function DRBadge({ value }: { value: number }) {
  return (
    <span className={cn('inline-flex items-center justify-center w-10 h-6 rounded text-[11px] font-bold', {
      'bg-green-100 text-green-700': value >= 60,
      'bg-yellow-100 text-yellow-700': value >= 30 && value < 60,
      'bg-red-100 text-red-600': value > 0 && value < 30,
      'bg-gray-100 text-gray-400': value === 0,
    })}>
      {value || '—'}
    </span>
  );
}

// ─── Add Competitor Modal ──────────────────────────
function AddCompetitorModal({ open, onClose, projectId, onSuccess }: { open: boolean; onClose: () => void; projectId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', domain: '', backlinks: '', organicTraffic: '', totalKeywords: '', domainRating: '', month: new Date().toISOString().slice(0, 7) });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.createCompetitor(projectId, {
        name: form.name,
        domain: form.domain,
        backlinks: parseInt(form.backlinks) || 0,
        organicTraffic: parseInt(form.organicTraffic) || 0,
        totalKeywords: parseInt(form.totalKeywords) || 0,
        domainRating: parseInt(form.domainRating) || 0,
        month: form.month,
      });
      setForm({ name: '', domain: '', backlinks: '', organicTraffic: '', totalKeywords: '', domainRating: '', month: new Date().toISOString().slice(0, 7) });
      onSuccess();
      onClose();
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Competitor" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Competitor Name" value={form.name} onChange={v => set('name', v)} required placeholder="Acme Corp" />
          <Input label="Domain" value={form.domain} onChange={v => set('domain', v)} required placeholder="acme.com" />
        </div>
        <Input label="Data Month" value={form.month} onChange={v => set('month', v)} placeholder="2026-03" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Domain Rating (0-100)" type="number" value={form.domainRating} onChange={v => set('domainRating', v)} placeholder="45" />
          <Input label="Backlinks" type="number" value={form.backlinks} onChange={v => set('backlinks', v)} placeholder="12000" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Organic Traffic" type="number" value={form.organicTraffic} onChange={v => set('organicTraffic', v)} placeholder="8500" />
          <Input label="Total Keywords" type="number" value={form.totalKeywords} onChange={v => set('totalKeywords', v)} placeholder="3200" />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} disabled={!form.name || !form.domain}>Add Competitor</Button>
      </div>
    </Modal>
  );
}

// ─── Bulk Update Modal ─────────────────────────────
function BulkUpdateModal({ open, onClose, projectId, competitors, onSuccess }: { open: boolean; onClose: () => void; projectId: string; competitors: any[]; onSuccess: () => void }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [entries, setEntries] = useState<Record<string, { backlinks: string; organicTraffic: string; totalKeywords: string; domainRating: string }>>({});
  const [loading, setLoading] = useState(false);

  // Init entries
  if (open && Object.keys(entries).length === 0 && competitors.length > 0) {
    const init: typeof entries = {};
    competitors.forEach(c => {
      const latest = c.snapshots?.sort((a: any, b: any) => b.month.localeCompare(a.month))[0];
      init[c._id] = {
        backlinks: String(latest?.backlinks || ''),
        organicTraffic: String(latest?.organicTraffic || ''),
        totalKeywords: String(latest?.totalKeywords || ''),
        domainRating: String(latest?.domainRating || ''),
      };
    });
    setEntries(init);
  }

  const update = (id: string, field: string, val: string) => {
    setEntries(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.bulkCompetitorSnapshot(projectId, {
        month,
        entries: Object.entries(entries).map(([competitorId, data]) => ({
          competitorId,
          backlinks: parseInt(data.backlinks) || 0,
          organicTraffic: parseInt(data.organicTraffic) || 0,
          totalKeywords: parseInt(data.totalKeywords) || 0,
          domainRating: parseInt(data.domainRating) || 0,
        })),
      });
      onSuccess();
      onClose();
      setEntries({});
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={() => { onClose(); setEntries({}); }} title="Update Competitor Data" size="xl">
      <div className="mb-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
        <p className="text-xs text-amber-700">This creates a <strong>new monthly snapshot</strong> for the selected month. Previous month data is preserved in the history below. Pre-filled values are from the latest snapshot — update them with fresh data.</p>
      </div>
      <div className="space-y-4">
        <Input label="Month" value={month} onChange={setMonth} placeholder="2026-03" />

        <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Competitor</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">DR</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Backlinks</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Organic Traffic</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Keywords</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {competitors.map((comp: any) => (
                <tr key={comp._id}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-gray-900 text-xs">{comp.name}</p>
                    <p className="text-[10px] text-gray-400">{comp.domain}</p>
                  </td>
                  {['domainRating', 'backlinks', 'organicTraffic', 'totalKeywords'].map(field => (
                    <td key={field} className="px-2 py-1">
                      <input type="number" value={entries[comp._id]?.[field as keyof typeof entries[string]] || ''} onChange={e => update(comp._id, field, e.target.value)}
                        className="w-24 mx-auto block text-center text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={() => { onClose(); setEntries({}); }}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading}>Save All</Button>
      </div>
    </Modal>
  );
}
