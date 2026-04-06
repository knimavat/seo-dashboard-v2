'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function fN(n: number): string { if (!n && n !== 0) return '—'; if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'; if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'; return n.toLocaleString(); }
function fDiff(n: number): string { return (n > 0 ? '+' : '') + fN(n); }
function fPct(n: number): string { return (n * 100).toFixed(1) + '%'; }
function fPos(n: number): string { return n > 0 ? n.toFixed(1) : '—'; }
function fTime(s: number): string { if (!s) return '—'; if (s < 60) return `${Math.round(s)}s`; const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${Math.round(s % 60)}s`; }
function ml(m: string): string { if (!m) return '—'; const [y, mo] = m.split('-'); return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mo)-1]} ${y}`; }

export default function PublicReportPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [config, setConfig] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [months, setMonths] = useState<string[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [month, setMonth] = useState('');
  const [compareTo, setCompareTo] = useState('');
  const [ready, setReady] = useState(false); // Only fetch data after months are set
  const fetchId = useRef(0);

  // 1. Init: fetch config + months
  const init = useCallback(async (pwd?: string) => {
    try {
      const h: Record<string, string> = {}; if (pwd) h['x-report-password'] = pwd;
      const [cfgRes, moRes] = await Promise.all([
        fetch(`${API}/public/report/${token}`, { headers: h }),
        fetch(`${API}/public/report/${token}/months`, { headers: h }),
      ]);
      const cfg = await cfgRes.json();
      if (cfg.error === 'password_required') { setNeedsPassword(true); setPageLoading(false); return; }
      if (cfg.error === 'invalid_password') { alert('Wrong password'); return; }
      if (!cfg.success) { setError(cfg.error || 'Unavailable'); setPageLoading(false); return; }
      setConfig(cfg.data); setNeedsPassword(false);
      const mo = await moRes.json();
      const sorted: string[] = (mo.data || []).sort();
      setMonths(sorted);
      // Set default months THEN mark ready
      if (sorted.length >= 2) {
        setMonth(sorted[sorted.length - 1]);
        setCompareTo(sorted[sorted.length - 2]);
      } else if (sorted.length === 1) {
        setMonth(sorted[0]);
        setCompareTo('');
      }
      setPageLoading(false);
      setReady(true);
    } catch { setError('Failed to load'); setPageLoading(false); }
  }, [token]);

  useEffect(() => { init(); }, [init]);

  // 2. Fetch data only after ready + month is set
  const fetchData = useCallback(async () => {
    if (!ready || !month) return;
    const id = ++fetchId.current;
    setDataLoading(true);
    const p = new URLSearchParams();
    p.set('month', month); // Always send explicit month
    if (compareTo) p.set('compareTo', compareTo);
    const h: Record<string, string> = {}; if (password) h['x-report-password'] = password;
    try {
      const res = await fetch(`${API}/public/report/${token}/data?${p}`, { headers: h });
      const json = await res.json();
      if (id === fetchId.current && json.success) setData(json.data);
    } catch {}
    if (id === fetchId.current) setDataLoading(false);
  }, [ready, token, month, compareTo, password]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── States ───
  if (pageLoading) return <FullLoader />;
  if (needsPassword) return <PwdScreen password={password} setPassword={setPassword} onSubmit={() => init(password)} />;
  if (error || !config) return <ErrorScreen error={error} />;

  const { branding, sectionVisibility: vis } = config;
  const pc = branding?.primaryColor || '#1B2A4A';
  const ac = branding?.accentColor || '#2E75B6';
  const a = data?.analytics;
  const kw = data?.keywords;
  const tasks = data?.tasks;
  const audits = data?.audits;
  const comp = data?.competitors;
  const scopeD = data?.scope;
  const hl = data?.highlights;
  const hasCompare = !!a?.compare;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header */}
      <header style={{ background: `linear-gradient(135deg, ${pc}, ${ac})` }} className="text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {branding?.clientLogo && <img src={branding.clientLogo} alt="" className="h-10 bg-white rounded-lg p-1 object-contain" />}
            <div><h1 className="text-xl font-bold">{branding?.clientName}</h1><p className="text-white/60 text-xs mt-0.5">{config.name}</p></div>
          </div>
          <button onClick={() => window.print()} className="print:hidden text-[10px] text-white/50 hover:text-white border border-white/20 px-2 py-1 rounded">Print</button>
        </div>
      </header>

      {/* Date Picker */}
      {months.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 print:hidden">
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 -mt-3 shadow-sm relative z-10 flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-w-[140px]">
                {months.map(m => <option key={m} value={m}>{ml(m)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Compare with</label>
              <select value={compareTo} onChange={e => setCompareTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-w-[140px]">
                <option value="">No comparison</option>
                {months.filter(m => m !== month).map(m => <option key={m} value={m}>{ml(m)}</option>)}
              </select>
            </div>
            {dataLoading && <div className="ml-2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
          </div>
        </div>
      )}

      {/* ─── LOADING OVERLAY ─── */}
      {dataLoading && !data && (
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading report data...</p>
          </div>
        </div>
      )}

      {/* ─── DATA LOADING OVERLAY (subsequent fetches) ─── */}
      <main className={cn("max-w-6xl mx-auto px-6 py-8 space-y-8 transition-opacity", dataLoading && data ? "opacity-50 pointer-events-none" : "opacity-100")}>

        {/* Highlights */}
        {hl?.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
            <p className="text-xs font-semibold text-green-700 uppercase mb-2">Key Highlights — {ml(month)}{compareTo ? ` vs ${ml(compareTo)}` : ''}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {hl.map((h: string, i: number) => <p key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-green-500">✓</span>{h}</p>)}
            </div>
          </div>
        )}

        {/* Project Health */}
        {data?.project && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-3">
            <span className={cn('w-3 h-3 rounded-full', {'bg-green-500': data.project.healthStatus==='green','bg-yellow-500': data.project.healthStatus==='yellow','bg-red-500': data.project.healthStatus==='red'})} />
            <span className="text-sm font-semibold text-gray-700 capitalize">{data.project.healthStatus}</span>
            {data.project.healthNote && <span className="text-xs text-gray-400">— {data.project.healthNote}</span>}
          </div>
        )}

        {/* ─── ANALYTICS ─── */}
        {vis?.analytics && a?.current && (
          <section>
            <ST t={`Analytics — ${ml(data?.selectedMonth)}`} c={ac} i="📊" />

            {/* ── COMPARISON TABLE (the primary view when comparing) ── */}
            {hasCompare && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600">Month-over-Month Comparison</p>
                  <p className="text-[10px] text-gray-400">{ml(data.selectedMonth)} vs {ml(data.compareMonth)}</p>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500">Metric</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold" style={{color: ac}}>{ml(data.selectedMonth)}</th>
                    <th className="text-right px-3 py-2.5 text-xs text-gray-400">{ml(data.compareMonth)}</th>
                    <th className="text-right px-3 py-2.5 text-xs text-gray-500">Difference</th>
                    <th className="text-right px-3 py-2.5 text-xs text-gray-500">% Change</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {METRICS.map(m => {
                      const ch = a.changes?.[m.k];
                      if (!ch) return null;
                      const diff = ch.diff;
                      const pct = ch.pct;
                      const isPos = m.inv ? diff > 0 : diff > 0;
                      const isNeg = m.inv ? diff < 0 : diff < 0;
                      const diffStr = m.k === 'engagementRate' ? `${(diff * 100).toFixed(2)}pp`
                        : m.k === 'averagePosition' ? diff.toFixed(1)
                        : m.k === 'engagementTime' ? (diff > 0 ? '+' : '-') + fTime(Math.abs(diff))
                        : fDiff(diff);
                      return (
                        <tr key={m.k} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-medium text-gray-700">{m.l}</td>
                          <td className="px-3 py-2.5 text-right font-bold" style={{color: ac}}>{m.f(a.current[m.k])}</td>
                          <td className="px-3 py-2.5 text-right text-gray-400">{m.f(a.compare[m.k])}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={cn('font-bold', isPos ? 'text-green-600' : isNeg ? 'text-red-500' : 'text-gray-400')}>
                              {Math.abs(diff) < 0.001 ? '—' : diffStr}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {Math.abs(pct) >= 0.1 ? (
                              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                                {pct > 0 ? '↑' : '↓'}{Math.abs(pct).toFixed(1)}{m.abs ? 'pp' : '%'}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

           {/* Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <KPI l="Total Clicks" v={fN(a.current.clicks)} d={a.changes?.clicks} c={ac} prev={a.compare ? fN(a.compare.clicks) : undefined} />
              <KPI l="Impressions" v={fN(a.current.impressions)} d={a.changes?.impressions} c={ac} prev={a.compare ? fN(a.compare.impressions) : undefined} />
              <KPI l="Organic Traffic" v={fN(a.current.organicTraffic)} d={a.changes?.organicTraffic} c="#2D8B4E" prev={a.compare ? fN(a.compare.organicTraffic) : undefined} />
              <KPI l="Avg Position" v={fPos(a.current.averagePosition)} d={a.changes?.averagePosition} c={ac} inv prev={a.compare ? fPos(a.compare.averagePosition) : undefined} />
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <KPI l="Total Users" v={fN(a.current.totalUsers)} d={a.changes?.totalUsers} c={ac} prev={a.compare ? fN(a.compare.totalUsers) : undefined} />
              <KPI l="New Users" v={fN(a.current.newUsers)} d={a.changes?.newUsers} c="#2D8B4E" prev={a.compare ? fN(a.compare.newUsers) : undefined} />
              <KPI l="Returning" v={fN(a.current.returningUsers)} d={a.changes?.returningUsers} c={ac} prev={a.compare ? fN(a.compare.returningUsers) : undefined} />
              <KPI l="Active Users" v={fN(a.current.activeUsers)} d={a.changes?.activeUsers} c={ac} prev={a.compare ? fN(a.compare.activeUsers) : undefined} />
            </div>
            {/* Row 3 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <KPI l="Page Views" v={fN(a.current.pageViews)} d={a.changes?.pageViews} c={ac} prev={a.compare ? fN(a.compare.pageViews) : undefined} />
              <KPI l="Engagement Rate" v={fPct(a.current.engagementRate)} d={a.changes?.engagementRate} c="#2D8B4E" isAbs prev={a.compare ? fPct(a.compare.engagementRate) : undefined} />
              <KPI l="Engagement Time" v={fTime(a.current.engagementTime)} c={ac} prev={a.compare ? fTime(a.compare.engagementTime) : undefined} />
            </div>

            {/* Trend Charts */}
            {a.trend?.length >= 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <LChart t="Traffic & Users" data={a.trend} lines={[{k:'organicTraffic',l:'Organic',c:'#2D8B4E'},{k:'totalUsers',l:'Users',c:ac},{k:'newUsers',l:'New',c:'#D97706'}]} />
                <LChart t="Search Performance" data={a.trend} lines={[{k:'clicks',l:'Clicks',c:ac},{k:'impressions',l:'Impressions',c:'#8B5CF6'}]} />
                <LChart t="Engagement" data={a.trend} lines={[{k:'pageViews',l:'Page Views',c:'#2D8B4E'},{k:'activeUsers',l:'Active',c:ac}]} />
                <GBar t="User Breakdown" data={a.trend} groups={[{k:'newUsers',l:'New',c:'#2D8B4E'},{k:'returningUsers',l:'Returning',c:ac}]} />
              </div>
            )}
          </section>
        )}

        {vis?.analytics && !a?.current && !dataLoading && (
          <div className="bg-gray-50 rounded-xl border p-6 text-center"><p className="text-sm text-gray-500">No analytics data for {ml(month)}.</p></div>
        )}

        {/* Keywords */}
        {vis?.keywords && kw && (
          <section>
            <ST t="Keyword Rankings" c={ac} i="🔑" />
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-4">
              {Object.entries(kw.summary).map(([k,v]) => <div key={k} className="bg-white rounded-lg border p-2.5 text-center"><p className="text-base font-bold" style={{color:k==='improved'?'#2D8B4E':k==='declined'?'#C0392B':pc}}>{v as number}</p><p className="text-[9px] text-gray-500 uppercase">{k.replace(/([A-Z])/g,' $1')}</p></div>)}
            </div>
            {kw.keywords?.length > 0 && (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 text-xs text-gray-500">Keyword</th><th className="text-right px-3 py-2 text-xs text-gray-500">Rank</th><th className="text-right px-3 py-2 text-xs text-gray-500">Prev</th><th className="text-right px-3 py-2 text-xs text-gray-500">Δ</th><th className="text-right px-3 py-2 text-xs text-gray-500">Vol</th><th className="text-right px-3 py-2 text-xs text-gray-500">KD</th><th className="text-left px-3 py-2 text-xs text-gray-500">Group</th>
                </tr></thead><tbody className="divide-y divide-gray-100">
                  {kw.keywords.slice(0,30).map((k:any,i:number) => (
                    <tr key={i}><td className="px-3 py-2 font-medium text-gray-900">{k.keyword}</td>
                    <td className="px-3 py-2 text-right font-bold" style={{color:k.rank<=3?'#2D8B4E':k.rank<=10?ac:undefined}}>{k.rank||'—'}</td>
                    <td className="px-3 py-2 text-right text-gray-400 text-xs">{k.previousRank||'—'}</td>
                    <td className="px-3 py-2 text-right"><span className={cn('text-xs font-semibold',k.change>0?'text-green-600':k.change<0?'text-red-500':'text-gray-300')}>{k.change>0?`↑${k.change}`:k.change<0?`↓${Math.abs(k.change)}`:'—'}</span></td>
                    <td className="px-3 py-2 text-right text-gray-600 text-xs">{fN(k.volume)}</td>
                    <td className="px-3 py-2 text-right"><span className={cn('text-[10px] font-bold px-1 py-0.5 rounded',k.difficulty>70?'bg-red-100 text-red-600':k.difficulty>40?'bg-yellow-100 text-yellow-600':'bg-green-100 text-green-600')}>{k.difficulty}</span></td>
                    <td className="px-3 py-2 text-xs text-gray-500">{k.group}</td></tr>
                  ))}
                </tbody></table>
              </div>
            )}
          </section>
        )}

        {/* Competitors — Pivot Table: Project vs Competitors */}
        {vis?.competitors && comp?.competitors?.length > 0 && (
          <section>
            <ST t={`Competitive Landscape — ${ml(data?.selectedMonth)}`} c={ac} i="🏆" />
            {(() => {
              const proj = comp.project;
              const comps = comp.competitors.filter((c: any) => c.forMonth);
              const allEntities = [
                { name: proj.name, domain: proj.domain, data: proj.forMonth, compare: proj.forCompareMonth, isProject: true },
                ...comps.map((c: any) => ({ name: c.name, domain: c.domain, data: c.forMonth, compare: c.forCompareMonth, isProject: false })),
              ];
              const metrics = [
                { key: 'domainRating', label: 'Domain Rating', format: (v: number) => v > 0 ? String(v) : '—' },
                { key: 'backlinks', label: 'Backlinks', format: fN },
                { key: 'organicTraffic', label: 'Organic Traffic', format: fN },
                { key: 'totalKeywords', label: 'Total Keywords', format: fN },
              ];

              return (
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase bg-gray-50 sticky left-0 z-10 min-w-[140px]">Metric</th>
                        {allEntities.map((e, i) => (
                          <th key={i} className={cn('text-center px-4 py-3 min-w-[130px]', e.isProject ? 'bg-blue-50' : 'bg-gray-50')}>
                            <p className={cn('text-xs font-bold', e.isProject ? 'text-blue-700' : 'text-gray-700')}>{e.name}</p>
                            <p className="text-[9px] text-gray-400 font-normal mt-0.5">{e.domain}</p>
                            {e.isProject && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold mt-1 inline-block">YOUR SITE</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((m, mi) => {
                        // Find the max value for this metric to highlight the leader
                        const values = allEntities.map(e => e.data?.[m.key] || 0);
                        const maxVal = Math.max(...values);
                        return (
                          <tr key={m.key} className={mi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className={cn('px-4 py-3 font-semibold text-gray-700 text-xs sticky left-0 z-10', mi % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>{m.label}</td>
                            {allEntities.map((e, ei) => {
                              const val = e.data?.[m.key] || 0;
                              const isLeader = val > 0 && val === maxVal;
                              const compVal = e.compare?.[m.key];
                              const hasDiff = compVal !== undefined && compVal !== null && val !== compVal;
                              const diff = val - (compVal || 0);
                              const isUp = m.key === 'domainRating' ? diff > 0 : diff > 0; // All metrics: higher = better

                              return (
                                <td key={ei} className={cn('px-4 py-3 text-center', e.isProject ? 'bg-blue-50/50' : '')}>
                                  <p className={cn('text-sm font-bold', isLeader ? 'text-green-600' : 'text-gray-900')}>
                                    {m.format(val)}
                                    {isLeader && val > 0 && <span className="text-[8px] ml-1">👑</span>}
                                  </p>
                                  {hasDiff && (
                                    <p className={cn('text-[9px] mt-0.5', isUp ? 'text-green-600' : 'text-red-500')}>
                                      {isUp ? '↑' : '↓'}{m.key === 'domainRating' ? Math.abs(diff) : fN(Math.abs(diff))}
                                    </p>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {hasCompare && <p className="px-4 py-2 text-[9px] text-gray-400 border-t">Arrows show change from {ml(data?.compareMonth)}</p>}
                </div>
              );
            })()}
          </section>
        )}

        {/* Tasks */}
        {vis?.tasks && tasks?.tasks?.length > 0 && (
          <section>
            <ST t="Work Completed" c={ac} i="✅" />
            <div className="grid grid-cols-4 gap-2 mb-3">{Object.entries(tasks.summary).map(([k,v]) => <div key={k} className="bg-white rounded-lg border p-2.5 text-center"><p className="text-base font-bold" style={{color:pc}}>{v as number}</p><p className="text-[9px] text-gray-500 uppercase">{k}</p></div>)}</div>
            <div className="space-y-1.5">{tasks.tasks.map((t:any,i:number) => (
              <div key={i} className="bg-white rounded-lg border px-4 py-2.5 flex items-center justify-between">
                <div><p className="text-sm font-medium text-gray-900">{t.title}</p>{t.clientSummary&&<p className="text-xs text-gray-400 mt-0.5">{t.clientSummary}</p>}</div>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium ml-2',t.status==='Completed'?'bg-green-100 text-green-700':t.status==='Blocked'?'bg-red-100 text-red-600':'bg-blue-100 text-blue-700')}>{t.status}</span>
              </div>
            ))}</div>
          </section>
        )}

        {/* Audits */}
        {vis?.audits && audits && (
          <section>
            <ST t="Technical Health" c={ac} i="🔧" />
            <div className="grid grid-cols-5 gap-2">{Object.entries(audits.summary).map(([k,v]) => <div key={k} className="bg-white rounded-lg border p-2.5 text-center"><p className={cn('text-base font-bold',k==='critical'?'text-red-600':k==='resolved'?'text-green-600':'text-gray-900')}>{v as number}</p><p className="text-[9px] text-gray-500 uppercase">{k}</p></div>)}</div>
          </section>
        )}
        {/* Scope of Work */}
        {vis?.scope && scopeD?.months?.length > 0 && (
          <ScopeSection months={scopeD.months} ac={ac} pc={pc} />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-6 text-center border-t mt-6"><p className="text-[10px] text-gray-400">SEO Command Center · {branding?.clientName}</p></footer>
    </div>
  );
}

// ── Metric definitions ──
const METRICS: Array<{k:string;l:string;f:(n:number)=>string;inv?:boolean;abs?:boolean}> = [
  {k:'clicks',l:'Total Clicks',f:fN},
  {k:'impressions',l:'Total Impressions',f:fN},
  {k:'organicTraffic',l:'Organic Traffic',f:fN},
  {k:'pageViews',l:'Page Views',f:fN},
  {k:'totalUsers',l:'Total Users',f:fN},
  {k:'newUsers',l:'New Users',f:fN},
  {k:'returningUsers',l:'Returning Users',f:fN},
  {k:'activeUsers',l:'Active Users',f:fN},
  {k:'engagementRate',l:'Engagement Rate',f:fPct,abs:true},
  {k:'averagePosition',l:'Avg Position',f:fPos,inv:true},
  {k:'engagementTime',l:'Engagement Time',f:fTime},
];

// ── Components ──
function FullLoader() { return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" /><p className="text-sm text-gray-400">Loading report...</p></div></div>; }
function ErrorScreen({error}:{error:string|null}) { return <div className="min-h-screen flex items-center justify-center bg-gray-50"><h2 className="text-lg font-semibold text-gray-900">{error||'Report Unavailable'}</h2></div>; }
function PwdScreen({password,setPassword,onSubmit}:{password:string;setPassword:(s:string)=>void;onSubmit:()=>void}) {
  return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="bg-white rounded-xl shadow-lg p-6 max-w-xs w-full"><h2 className="text-base font-semibold mb-3">Password Required</h2><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSubmit()} className="w-full px-3 py-2 border rounded-lg text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-400" placeholder="Enter password" /><button onClick={onSubmit} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">View</button></div></div>;
}
function ST({t,c,i}:{t:string;c:string;i?:string}) { return <div className="flex items-center gap-2 mb-3 mt-1">{i&&<span>{i}</span>}<div className="w-1 h-5 rounded-full" style={{backgroundColor:c}} /><h2 className="text-base font-bold text-gray-900">{t}</h2></div>; }
function KPI({l,v,d,c,inv,isAbs,prev}:{l:string;v:string;d?:{diff:number;pct:number};c:string;inv?:boolean;isAbs?:boolean;prev?:string}) {
  const hasDiff = d && Math.abs(d.diff) > 0;
  const positive = d ? (inv ? d.diff > 0 : d.diff > 0) : false;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className="text-[10px] text-gray-500 uppercase">{l}</p>
      <p className="text-xl font-bold mt-0.5" style={{color:c}}>{v}</p>
      {hasDiff && (
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <span className={cn('text-[10px] font-bold',positive?'text-green-600':'text-red-500')}>
            {positive?'↑':'↓'}{Math.abs(d!.pct).toFixed(1)}{isAbs?'pp':'%'}
          </span>
          <span className="text-[9px] text-gray-400">({fDiff(d!.diff)})</span>
          {prev && <span className="text-[9px] font-bold text-gray-600">· prev: {prev}</span>}
        </div>
      )}
      {!hasDiff && prev && <p className="text-[9px] font-bold text-gray-600 mt-0.5">prev: {prev}</p>}
    </div>
  );
}

// ── Charts ──
function LChart({t,data,lines}:{t:string;data:any[];lines:Array<{k:string;l:string;c:string}>}) {
  const W=460,H=160,P={t:15,r:15,b:30,l:45},cw=W-P.l-P.r,ch=H-P.t-P.b;
  let mx=0; lines.forEach(l=>data.forEach(d=>{const v=d[l.k]||0;if(v>mx)mx=v;})); mx=mx||1;
  return (
    <div className="bg-white rounded-xl border p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">{t}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0,.5,1].map(f=><g key={f}><line x1={P.l} y1={P.t+ch*(1-f)} x2={P.l+cw} y2={P.t+ch*(1-f)} stroke="#f3f3f3"/><text x={P.l-4} y={P.t+ch*(1-f)+3} textAnchor="end" fontSize="7" fill="#aaa">{fN(Math.round(mx*f))}</text></g>)}
        {data.map((d,i)=><text key={i} x={P.l+(i/(data.length-1))*cw} y={H-6} textAnchor="middle" fontSize="7" fill="#aaa">{ml(d.month)}</text>)}
        {lines.map(l=><polyline key={l.k} points={data.map((d,i)=>`${P.l+(i/(data.length-1))*cw},${P.t+ch-((d[l.k]||0)/mx)*ch}`).join(' ')} fill="none" stroke={l.c} strokeWidth="2" strokeLinejoin="round"/>)}
        {lines.map(l=>data.map((d,i)=><circle key={`${l.k}${i}`} cx={P.l+(i/(data.length-1))*cw} cy={P.t+ch-((d[l.k]||0)/mx)*ch} r="2.5" fill={l.c}/>))}
      </svg>
      <div className="flex justify-center gap-3 mt-1">{lines.map(l=><div key={l.k} className="flex items-center gap-1"><div className="w-2.5 h-[2px] rounded" style={{backgroundColor:l.c}}/><span className="text-[9px] text-gray-500">{l.l}</span></div>)}</div>
    </div>
  );
}

function ScopeSection({ months, ac, pc }: { months: any[]; ac: string; pc: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 mb-3 mt-1 w-full text-left group">
        <span>📋</span>
        <div className="w-1 h-5 rounded-full" style={{ backgroundColor: ac }} />
        <h2 className="text-base font-bold text-gray-900 flex-1">Scope of Work</h2>
        <span className="text-xs text-gray-400 group-hover:text-gray-600 print:hidden">{expanded ? '▲ Collapse' : '▼ Expand'}</span>
      </button>
      {!expanded && (
        <p className="text-xs text-gray-400 mb-2">Click to view the monthly deliverables included in your SEO package.</p>
      )}
      {expanded && months.map((m: any) => (
        <div key={m.month} className="mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{ml(m.month)}</p>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Activity</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Unit</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(m.scopeItems || []).filter((s: any) => s.quantity > 0).map((s: any) => (
                  <tr key={s.activity}>
                    <td className="px-4 py-2 font-medium text-gray-900">{s.label}</td>
                    <td className="px-4 py-2 text-right font-semibold" style={{ color: pc }}>{s.quantity}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{s.unit || '—'}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {expanded && <p className="text-[10px] text-gray-300 italic mt-1">Scope of deliverables only. Team hours allocation is maintained internally.</p>}
    </section>
  );
}

function GBar({t,data,groups}:{t:string;data:any[];groups:Array<{k:string;l:string;c:string}>}) {
  const W=460,H=160,P={t:15,r:15,b:30,l:45},cw=W-P.l-P.r,ch=H-P.t-P.b;
  let mx=0;data.forEach(d=>groups.forEach(g=>{const v=d[g.k]||0;if(v>mx)mx=v;}));mx=mx||1;
  const gw=cw/data.length,bw=Math.min(14,gw*.35),gap=2;
  return (
    <div className="bg-white rounded-xl border p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">{t}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0,.5,1].map(f=><g key={f}><line x1={P.l} y1={P.t+ch*(1-f)} x2={P.l+cw} y2={P.t+ch*(1-f)} stroke="#f3f3f3"/><text x={P.l-4} y={P.t+ch*(1-f)+3} textAnchor="end" fontSize="7" fill="#aaa">{fN(Math.round(mx*f))}</text></g>)}
        {data.map((d,i)=>{const cx=P.l+(i+.5)*gw;return<g key={i}>{groups.map((g,gi)=>{const v=d[g.k]||0,h=(v/mx)*ch,x=cx-((groups.length*bw+(groups.length-1)*gap)/2)+(gi*(bw+gap));return<rect key={g.k} x={x} y={P.t+ch-h} width={bw} height={h} fill={g.c} rx="2"/>;})}<text x={cx} y={H-6} textAnchor="middle" fontSize="7" fill="#aaa">{ml(d.month)}</text></g>;})}
      </svg>
      <div className="flex justify-center gap-3 mt-1">{groups.map(g=><div key={g.k} className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:g.c}}/><span className="text-[9px] text-gray-500">{g.l}</span></div>)}</div>
    </div>
  );
}