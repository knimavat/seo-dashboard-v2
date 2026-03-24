'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useKeywords } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { Button, Modal, Input, Select, EmptyState, TableSkeleton } from '@/components/ui';
import { formatNumber, cn } from '@/lib/utils';

export function KeywordsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  const tier = sp.get('tier') || '';
  const group = sp.get('group') || '';
  const intent = sp.get('intent') || '';
  const search = sp.get('kq') || '';

  const upd = (u: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(u).forEach(([k, v]) => { if (!v) p.delete(k); else p.set(k, v); });
    router.replace(`?${p.toString()}`, { scroll: false });
  };

  const params: Record<string, string> = { limit: '100' };
  if (tier) params.priorityTier = tier;
  if (group) params.group = group;
  if (intent) params.intent = intent;
  if (search) params.search = search;

  const { data, isLoading, refetch } = useKeywords(projectId, params);
  const keywords = data?.data || [];
  const summary = data?.summary;

  const groups = [...new Set<string>(keywords.map((k: any) => k.group).filter((g: unknown): g is string => typeof g === 'string'))];
  const hasFilters = tier || group || intent || search;

  return (
    <>
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <SC l="Total" v={summary.total} c="text-gray-900" /><SC l="Top 3" v={summary.top3} c="text-green-600" /><SC l="Top 10" v={summary.top10} c="text-brand-600" /><SC l="Improved" v={summary.improved} c="text-green-600" /><SC l="Declined" v={summary.declined} c="text-red-500" /><SC l="Unranked" v={summary.notRanking} c="text-gray-400" />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-44"><Input value={search} onChange={v => upd({ kq: v || null })} placeholder="Search keywords..." /></div>
          <Select value={tier} onChange={v => upd({ tier: v || null })} placeholder="All tiers" options={[{ label: 'Tier 1', value: 'tier1' }, { label: 'Tier 2', value: 'tier2' }, { label: 'Tier 3', value: 'tier3' }]} />
          <Select value={intent} onChange={v => upd({ intent: v || null })} placeholder="All intents" options={[{ label: 'Informational', value: 'informational' }, { label: 'Commercial', value: 'commercial' }, { label: 'Transactional', value: 'transactional' }, { label: 'Navigational', value: 'navigational' }]} />
          {groups.length > 0 && <Select value={group} onChange={v => upd({ group: v || null })} placeholder="All groups" options={groups.map(g => ({ label: g, value: g }))} />}
          {hasFilters && <button onClick={() => upd({ tier: null, group: null, intent: null, kq: null })} className="text-xs text-red-500 hover:text-red-600">Clear</button>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowSnapshot(true)} disabled={keywords.length === 0}>Update Rankings</Button>
          <Button size="sm" variant="secondary" onClick={() => setShowImport(true)}>Import CSV</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>+ Add</Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? <TableSkeleton rows={10} cols={7} /> : keywords.length === 0 ? (
        <EmptyState title="No keywords" description={hasFilters ? 'No keywords match filters.' : 'Add keywords or import CSV.'} action={!hasFilters && <div className="flex gap-2"><Button onClick={() => setShowAdd(true)}>Add</Button><Button variant="secondary" onClick={() => setShowImport(true)}>Import</Button></div>} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Keyword</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Rank</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Prev</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Δ</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Volume</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">KD</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Intent</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Group</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tier</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Trend</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {keywords.map((kw: any) => {
                const ch = (kw.previous?.rank || 0) - (kw.current?.rank || 0);
                return (
                  <tr key={kw._id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{kw.keyword}</p><p className="text-[10px] text-gray-400 truncate max-w-[200px]">{kw.targetUrl}</p></td>
                    <td className="px-3 py-3 text-right"><span className={cn('font-bold', kw.current?.rank <= 3 ? 'text-green-600' : kw.current?.rank <= 10 ? 'text-brand-600' : 'text-gray-900')}>{kw.current?.rank || '—'}</span></td>
                    <td className="px-3 py-3 text-right text-gray-400 text-xs">{kw.previous?.rank || '—'}</td>
                    <td className="px-3 py-3 text-right"><span className={cn('text-xs font-semibold', ch > 0 ? 'text-green-600' : ch < 0 ? 'text-red-500' : 'text-gray-300')}>{ch > 0 ? `↑${ch}` : ch < 0 ? `↓${Math.abs(ch)}` : '—'}</span></td>
                    <td className="px-3 py-3 text-right text-gray-600">{formatNumber(kw.current?.searchVolume || 0)}</td>
                    <td className="px-3 py-3 text-right"><div className="flex items-center justify-end gap-1.5"><div className="w-10 bg-gray-200 rounded-full h-1.5"><div className={cn('h-1.5 rounded-full', kw.current?.difficulty > 70 ? 'bg-red-400' : kw.current?.difficulty > 40 ? 'bg-yellow-400' : 'bg-green-400')} style={{ width: `${kw.current?.difficulty || 0}%` }} /></div><span className="text-[10px] text-gray-500">{kw.current?.difficulty || 0}</span></div></td>
                    <td className="px-3 py-3"><span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium capitalize', { 'bg-blue-50 text-blue-600': kw.searchIntent === 'informational', 'bg-purple-50 text-purple-600': kw.searchIntent === 'navigational', 'bg-amber-50 text-amber-600': kw.searchIntent === 'commercial', 'bg-green-50 text-green-600': kw.searchIntent === 'transactional' })}>{kw.searchIntent}</span></td>
                    <td className="px-3 py-3 text-xs text-gray-500">{kw.group}</td>
                    <td className="px-3 py-3"><span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', { 'bg-red-50 text-red-600': kw.priorityTier === 'tier1', 'bg-yellow-50 text-yellow-600': kw.priorityTier === 'tier2', 'bg-gray-100 text-gray-500': kw.priorityTier === 'tier3' })}>{kw.priorityTier?.replace('tier', 'T')}</span></td>
                    <td className="px-3 py-3"><Spark data={kw.snapshots?.slice(-7).map((s: any) => s.rank) || []} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddModal open={showAdd} onClose={() => setShowAdd(false)} pid={projectId} done={refetch} />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} pid={projectId} done={refetch} />
      <SnapshotModal open={showSnapshot} onClose={() => setShowSnapshot(false)} pid={projectId} keywords={keywords} done={refetch} />
    </>
  );
}

function SC({ l, v, c }: { l: string; v: number; c: string }) {
  return <div className="bg-white rounded-lg border border-gray-200 p-3 text-center"><p className={cn('text-lg font-bold', c)}>{v}</p><p className="text-[10px] text-gray-500 uppercase">{l}</p></div>;
}

function Spark({ data }: { data: number[] }) {
  const d = data.filter(v => v > 0);
  if (d.length < 2) return <span className="text-xs text-gray-300">—</span>;
  const max = Math.max(...d), min = Math.min(...d), range = max - min || 1;
  const w = 60, h = 20;
  const pts = d.map((v, i) => `${(i / (d.length - 1)) * w},${((v - min) / range) * h}`).join(' ');
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={d[d.length - 1] < d[0] ? '#2D8B4E' : '#C0392B'} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}

// ─── Add Keyword Modal ──
function AddModal({ open, onClose, pid, done }: { open: boolean; onClose: () => void; pid: string; done: () => void }) {
  const [f, setF] = useState({ keyword: '', searchIntent: 'informational', targetUrl: '', group: '', priorityTier: 'tier2', rank: '', searchVolume: '', difficulty: '', cpc: '' });
  const [loading, setLoading] = useState(false);
  const s = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const submit = async () => {
    setLoading(true);
    try { await api.createKeyword(pid, { keyword: f.keyword, searchIntent: f.searchIntent, targetUrl: f.targetUrl, group: f.group, priorityTier: f.priorityTier, current: { rank: +f.rank || 0, searchVolume: +f.searchVolume || 0, difficulty: +f.difficulty || 0, cpc: +f.cpc || 0 } }); setF({ keyword: '', searchIntent: 'informational', targetUrl: '', group: '', priorityTier: 'tier2', rank: '', searchVolume: '', difficulty: '', cpc: '' }); done(); onClose(); } catch (e: any) { alert(e.message); }
    setLoading(false);
  };
  return (
    <Modal open={open} onClose={onClose} title="Add Keyword" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4"><Input label="Keyword" value={f.keyword} onChange={v => s('keyword', v)} required placeholder="cloud ERP software" /><Input label="Target URL" value={f.targetUrl} onChange={v => s('targetUrl', v)} required placeholder="https://..." /></div>
        <div className="grid grid-cols-3 gap-4">
          <Select label="Intent" value={f.searchIntent} onChange={v => s('searchIntent', v)} options={[{ label: 'Informational', value: 'informational' }, { label: 'Commercial', value: 'commercial' }, { label: 'Transactional', value: 'transactional' }, { label: 'Navigational', value: 'navigational' }]} />
          <Input label="Group" value={f.group} onChange={v => s('group', v)} required placeholder="Product - ERP" />
          <Select label="Tier" value={f.priorityTier} onChange={v => s('priorityTier', v)} options={[{ label: 'Tier 1', value: 'tier1' }, { label: 'Tier 2', value: 'tier2' }, { label: 'Tier 3', value: 'tier3' }]} />
        </div>
        <div className="border-t pt-3"><p className="text-xs font-medium text-gray-500 mb-2">Ranking Data</p>
          <div className="grid grid-cols-4 gap-4"><Input label="Rank" type="number" value={f.rank} onChange={v => s('rank', v)} placeholder="0" /><Input label="Volume" type="number" value={f.searchVolume} onChange={v => s('searchVolume', v)} placeholder="2400" /><Input label="KD" type="number" value={f.difficulty} onChange={v => s('difficulty', v)} placeholder="65" /><Input label="CPC" type="number" value={f.cpc} onChange={v => s('cpc', v)} placeholder="5.20" /></div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={loading} disabled={!f.keyword || !f.targetUrl || !f.group}>Add</Button></div>
    </Modal>
  );
}

// ─── Import CSV Modal ──
function ImportModal({ open, onClose, pid, done }: { open: boolean; onClose: () => void; pid: string; done: () => void }) {
  const [csv, setCsv] = useState(''); const [loading, setLoading] = useState(false); const [result, setResult] = useState(''); const ref = useRef<HTMLInputElement>(null);
  const parse = (t: string) => { const ls = t.trim().split('\n'); if (ls.length < 2) return []; const h = ls[0].split(',').map(x => x.trim().toLowerCase().replace(/['"]/g, '')); return ls.slice(1).map(l => { const v = l.split(',').map(x => x.trim().replace(/['"]/g, '')); const r: any = {}; h.forEach((k, i) => r[k] = v[i] || ''); return r; }).filter(r => r.keyword); };
  const upload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setCsv(ev.target?.result as string); r.readAsText(f); };
  const submit = async () => { setLoading(true); try { const rows = parse(csv); const kws = rows.map(r => ({ keyword: r.keyword, searchIntent: ['informational','commercial','transactional','navigational'].includes(r.intent||r.search_intent) ? (r.intent||r.search_intent) : 'informational', targetUrl: r.url||r.target_url||'https://example.com', group: r.group||'Ungrouped', priorityTier: ['tier1','tier2','tier3'].includes(r.tier||r.priority_tier) ? (r.tier||r.priority_tier) : 'tier2', current: { rank: +r.rank||0, searchVolume: +(r.volume||r.sv)||0, difficulty: +(r.difficulty||r.kd)||0, cpc: +r.cpc||0 } })); const res = await api.bulkCreateKeywords(pid, kws); setResult(`Imported ${res.data?.inserted||0} of ${kws.length}`); done(); } catch (e: any) { alert(e.message); } setLoading(false); };
  const close = () => { setCsv(''); setResult(''); onClose(); };
  return (
    <Modal open={open} onClose={close} title="Import CSV" size="lg">
      {result ? <div className="text-center py-8"><p className="text-green-600 font-medium">{result}</p><Button className="mt-4" onClick={close}>Done</Button></div> : <>
        <input type="file" accept=".csv" ref={ref} onChange={upload} className="hidden" />
        <button onClick={() => ref.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-400"><p className="text-sm font-medium text-gray-700">Upload CSV</p><p className="text-xs text-gray-400 mt-1">or paste below</p></button>
        <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={5} className="mt-3 block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono outline-none focus:border-brand-400" placeholder="keyword,url,group,tier,intent,rank,volume,difficulty,cpc" />
        <p className="text-[10px] text-gray-400 mt-2">Columns: keyword (required), url, group, tier, intent, rank, volume, difficulty, cpc</p>
        {csv && <p className="text-xs text-gray-600 mt-2">{parse(csv).length} rows detected</p>}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t"><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={submit} loading={loading} disabled={!csv.trim()}>Import</Button></div>
      </>}
    </Modal>
  );
}

// ─── Update Rankings Modal ──
function SnapshotModal({ open, onClose, pid, keywords, done }: { open: boolean; onClose: () => void; pid: string; keywords: any[]; done: () => void }) {
  const [ranks, setRanks] = useState<Record<string, { rank: string; volume: string; difficulty: string }>>({});
  const [loading, setLoading] = useState(false);
  const [paste, setPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  if (open && !Object.keys(ranks).length && keywords.length) {
    const init: typeof ranks = {};
    keywords.forEach(k => init[k._id] = { rank: String(k.current?.rank || 0), volume: String(k.current?.searchVolume || 0), difficulty: String(k.current?.difficulty || 0) });
    setRanks(init);
  }

  const applyPaste = () => {
    const updated = { ...ranks };
    pasteText.trim().split('\n').forEach(l => {
      const [kw, r, v, d] = l.split(/[,\t]/).map(x => x.trim());
      const match = keywords.find((k: any) => k.keyword.toLowerCase() === kw?.toLowerCase());
      if (match && updated[match._id]) { updated[match._id].rank = r || updated[match._id].rank; if (v) updated[match._id].volume = v; if (d) updated[match._id].difficulty = d; }
    });
    setRanks(updated); setPaste(false); setPasteText('');
  };

  const submit = async () => {
    setLoading(true);
    try {
      const snaps = Object.entries(ranks).map(([id, d]) => ({ keywordId: id, rank: +d.rank || 0, searchVolume: +d.volume || 0, difficulty: +d.difficulty || 0, cpc: 0 }));
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/projects/${pid}/keywords/snapshot`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({ snapshots: snaps }) });
      done(); onClose(); setRanks({});
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={() => { onClose(); setRanks({}); }} title="Update Rankings" size="xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4"><p className="text-xs text-blue-700">Current values become "previous". Your new values become "current". This creates a trend point.</p></div>
      <div className="flex justify-end mb-2"><Button size="sm" variant="ghost" onClick={() => setPaste(!paste)}>{paste ? 'Manual Entry' : 'Paste from Sheet'}</Button></div>
      {paste ? <>
        <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={6} className="w-full border rounded-lg px-3 py-2 text-xs font-mono" placeholder="keyword  rank  volume  difficulty" />
        <Button size="sm" className="mt-2" onClick={applyPaste} disabled={!pasteText.trim()}>Apply</Button>
      </> : (
        <div className="border rounded-lg overflow-auto max-h-[400px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10"><tr className="border-b">
              <th className="text-left px-4 py-2 text-xs text-gray-500">Keyword</th><th className="text-center px-3 py-2 text-xs text-gray-400">Current</th><th className="text-center px-3 py-2 text-xs text-gray-400">→</th><th className="text-center px-3 py-2 text-xs font-semibold text-brand-600">New Rank</th><th className="text-center px-3 py-2 text-xs font-semibold text-brand-600">Volume</th><th className="text-center px-3 py-2 text-xs font-semibold text-brand-600">KD</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">{keywords.map((k: any) => (
              <tr key={k._id}><td className="px-4 py-2 text-xs font-medium">{k.keyword}</td><td className="px-3 py-2 text-center text-xs text-gray-400">{k.current?.rank || '—'}</td><td className="text-center text-gray-300">→</td>
              <td className="px-2 py-1"><input type="number" value={ranks[k._id]?.rank || ''} onChange={e => setRanks(p => ({ ...p, [k._id]: { ...p[k._id], rank: e.target.value } }))} className="w-16 mx-auto block text-center text-xs border rounded px-2 py-1" /></td>
              <td className="px-2 py-1"><input type="number" value={ranks[k._id]?.volume || ''} onChange={e => setRanks(p => ({ ...p, [k._id]: { ...p[k._id], volume: e.target.value } }))} className="w-20 mx-auto block text-center text-xs border rounded px-2 py-1" /></td>
              <td className="px-2 py-1"><input type="number" value={ranks[k._id]?.difficulty || ''} onChange={e => setRanks(p => ({ ...p, [k._id]: { ...p[k._id], difficulty: e.target.value } }))} className="w-16 mx-auto block text-center text-xs border rounded px-2 py-1" /></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t"><Button variant="secondary" onClick={() => { onClose(); setRanks({}); }}>Cancel</Button><Button onClick={submit} loading={loading}>Save</Button></div>
    </Modal>
  );
}