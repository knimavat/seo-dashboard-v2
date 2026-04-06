'use client';

import { useState, useMemo } from 'react';
import { useCreateProject } from '@/hooks/useApi';
import { useSaveScope } from '@/hooks/useApi';
import { Button, Modal, Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────

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

const ENGAGEMENT_DURATIONS = [
  { label: '3 Months', value: 3 },
  { label: '6 Months', value: 6 },
  { label: '12 Months', value: 12 },
];

function buildDefaultScopeItems() {
  return SCOPE_ACTIVITIES.map(a => ({ activity: a.type, label: a.label, quantity: a.defaultQty, unit: a.unit, notes: '' }));
}

function buildDefaultHoursItems() {
  return HOURS_TASKS.map(h => ({ task: h.type, label: h.label, team: h.team, hours: 0, notes: '' }));
}

function getMonthStr(startDate: string, offset: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

// ─── Step Indicator ───────────────────────────────

const STEPS = [
  { id: 1, label: 'Project Details' },
  { id: 2, label: 'Scope of Work' },
  { id: 3, label: 'Plan & Goals' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
            current === s.id ? 'bg-brand-600 text-white' :
            current > s.id ? 'bg-brand-100 text-brand-700' :
            'bg-gray-100 text-gray-400'
          )}>
            <span className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
              current === s.id ? 'bg-white/20 text-white' :
              current > s.id ? 'bg-brand-200 text-brand-700' :
              'bg-gray-200 text-gray-400'
            )}>
              {current > s.id ? '✓' : s.id}
            </span>
            {s.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('w-8 h-0.5 mx-1', current > s.id ? 'bg-brand-300' : 'bg-gray-200')} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────

export function CreateProjectWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createProject = useCreateProject();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Project Details
  const [details, setDetails] = useState({
    clientName: '', projectName: '', domain: '', industry: '', startDate: '',
  });

  // Step 2: Scope
  const [scopeItems, setScopeItems] = useState(buildDefaultScopeItems());
  const [hoursItems, setHoursItems] = useState(buildDefaultHoursItems());
  const [extraTime, setExtraTime] = useState(0);

  // Step 3: Plan
  const [plan, setPlan] = useState({
    duration: 6,
    goals: ['', '', ''],
    notes: '',
    applyToAllMonths: true,
  });

  const hoursSummary = useMemo(() => {
    const seo = hoursItems.filter(h => h.team === 'seo').reduce((s, h) => s + (Number(h.hours) || 0), 0);
    const content = hoursItems.filter(h => h.team === 'content').reduce((s, h) => s + (Number(h.hours) || 0), 0);
    return { seoTeamHours: seo, contentTeamHours: content, extraTime, totalHours: seo + content + extraTime };
  }, [hoursItems, extraTime]);

  const canProceed1 = details.clientName && details.projectName && details.domain && details.startDate;

  const reset = () => {
    setStep(1);
    setDetails({ clientName: '', projectName: '', domain: '', industry: '', startDate: '' });
    setScopeItems(buildDefaultScopeItems());
    setHoursItems(buildDefaultHoursItems());
    setExtraTime(0);
    setPlan({ duration: 6, goals: ['', '', ''], notes: '', applyToAllMonths: true });
    setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Create the project
      const result = await createProject.mutateAsync({
        clientName: details.clientName,
        projectName: details.projectName,
        domain: details.domain,
        industry: details.industry || undefined,
        startDate: details.startDate,
      });

      const projectId = result?.data?._id;
      if (!projectId) throw new Error('Project creation failed');

      // 2. Save scope for each month in the plan duration
      const months = plan.applyToAllMonths ? plan.duration : 1;
      for (let i = 0; i < months; i++) {
        const monthStr = getMonthStr(details.startDate, i);
        await fetch('/api/v1/projects/' + projectId + '/scope', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({
            month: monthStr,
            scopeItems,
            hoursAllocation: hoursItems,
            extraTime,
          }),
        });
      }

      // 3. Save plan metadata as a project update
      const goalsFiltered = plan.goals.filter(g => g.trim());
      if (goalsFiltered.length > 0 || plan.notes) {
        await fetch('/api/v1/projects/' + projectId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({
            settings: {
              engagementDuration: plan.duration,
              goals: goalsFiltered,
              planNotes: plan.notes,
            },
          }),
        });
      }

      reset();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={handleClose} title="New Project" size="xl">
      <StepIndicator current={step} />

      {/* ─── Step 1: Project Details ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700">Start by entering the client and project details. You can update these later from project settings.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Client Name" value={details.clientName} onChange={v => setDetails(d => ({ ...d, clientName: v }))} required placeholder="Acme Corp" />
            <Input label="Project Name" value={details.projectName} onChange={v => setDetails(d => ({ ...d, projectName: v }))} required placeholder="Acme SEO Campaign" />
          </div>
          <Input label="Domain" value={details.domain} onChange={v => setDetails(d => ({ ...d, domain: v }))} required placeholder="https://acme.com" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Industry" value={details.industry} onChange={v => setDetails(d => ({ ...d, industry: v }))} placeholder="SaaS, E-commerce, etc." />
            <Input label="Start Date" type="date" value={details.startDate} onChange={v => setDetails(d => ({ ...d, startDate: v }))} required />
          </div>
        </div>
      )}

      {/* ─── Step 2: Scope of Work ─── */}
      {step === 2 && (
        <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700">Define the monthly deliverables and team hours. This scope will be applied to the months in your plan. You can customize each month later.</p>
          </div>

          {/* Scope Table */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deliverables</h4>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-[40%]">Activity</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-[15%]">Qty</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-[12%]">Unit</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-[33%]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scopeItems.map((item, i) => (
                    <tr key={item.activity}>
                      <td className="px-3 py-2 text-gray-900 text-xs font-medium">{item.label}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" value={item.quantity} onChange={e => { const d = [...scopeItems]; d[i] = { ...d[i], quantity: Number(e.target.value) || 0 }; setScopeItems(d); }} className="w-16 text-right text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-brand-400 outline-none" />
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-[10px]">{item.unit || '—'}</td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.notes} onChange={e => { const d = [...scopeItems]; d[i] = { ...d[i], notes: e.target.value }; setScopeItems(d); }} placeholder="..." className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-brand-400 outline-none" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hours Table */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Hours Allocation</h4>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-[40%]">Task</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-[15%]">Team</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-[15%]">Hours</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-[30%]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hoursItems.map((item, i) => (
                    <tr key={item.task}>
                      <td className="px-3 py-2 text-gray-900 text-xs font-medium">{item.label}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn('inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', item.team === 'seo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>{item.team}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" value={item.hours} onChange={e => { const d = [...hoursItems]; d[i] = { ...d[i], hours: Number(e.target.value) || 0 }; setHoursItems(d); }} className="w-16 text-right text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-brand-400 outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.notes} onChange={e => { const d = [...hoursItems]; d[i] = { ...d[i], notes: e.target.value }; setHoursItems(d); }} placeholder="..." className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-brand-400 outline-none" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 text-xs">
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-1.5 font-semibold text-gray-600" colSpan={2}>SEO Team</td>
                    <td className="px-3 py-1.5 text-right font-bold text-blue-700">{hoursSummary.seoTeamHours}h</td>
                    <td />
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-1.5 font-semibold text-gray-600" colSpan={2}>Content Team</td>
                    <td className="px-3 py-1.5 text-right font-bold text-purple-700">{hoursSummary.contentTeamHours}h</td>
                    <td />
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-1.5 font-semibold text-gray-600" colSpan={2}>Extra Time</td>
                    <td className="px-3 py-1.5 text-right">
                      <input type="number" value={extraTime} onChange={e => setExtraTime(Number(e.target.value) || 0)} className="w-16 text-right text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-brand-400 outline-none" />
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold text-gray-900" colSpan={2}>Total</td>
                    <td className="px-3 py-2 text-right font-bold text-brand-700">{hoursSummary.totalHours}h</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 3: Plan & Goals ─── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700">Set the engagement duration and goals. The scope from Step 2 will be copied to each month automatically.</p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Engagement Duration</label>
            <div className="flex gap-3">
              {ENGAGEMENT_DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setPlan(p => ({ ...p, duration: d.value }))}
                  className={cn(
                    'flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                    plan.duration === d.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month Preview */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Months covered</label>
            <div className="flex flex-wrap gap-1.5">
              {details.startDate && Array.from({ length: plan.duration }, (_, i) => getMonthStr(details.startDate, i)).map(m => (
                <span key={m} className="px-2 py-1 bg-brand-50 text-brand-700 rounded text-[10px] font-medium">{monthLabel(m)}</span>
              ))}
            </div>
          </div>

          {/* Apply scope toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={plan.applyToAllMonths} onChange={e => setPlan(p => ({ ...p, applyToAllMonths: e.target.checked }))} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-gray-700">Apply scope & hours to all {plan.duration} months</span>
            <span className="text-[10px] text-gray-400">(you can customize each month later)</span>
          </label>

          {/* Goals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SEO Goals</label>
            <div className="space-y-2">
              {plan.goals.map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                  <input
                    type="text"
                    value={g}
                    onChange={e => { const goals = [...plan.goals]; goals[i] = e.target.value; setPlan(p => ({ ...p, goals })); }}
                    placeholder={i === 0 ? 'e.g., Increase organic traffic by 40%' : i === 1 ? 'e.g., Rank top 10 for 50 target keywords' : 'e.g., Improve domain rating to 45+'}
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                </div>
              ))}
              {plan.goals.length < 6 && (
                <button onClick={() => setPlan(p => ({ ...p, goals: [...p.goals, ''] }))} className="text-xs text-brand-600 hover:text-brand-700 font-medium ml-6">+ Add goal</button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Notes</label>
            <textarea
              value={plan.notes}
              onChange={e => setPlan(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Any additional context, constraints, or deliverables..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
            />
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Project Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{plan.duration}</p>
                <p className="text-[10px] text-gray-500 uppercase">Months</p>
              </div>
              <div>
                <p className="text-lg font-bold text-brand-700">{hoursSummary.totalHours}h</p>
                <p className="text-[10px] text-gray-500 uppercase">Hours/Month</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{hoursSummary.totalHours * (plan.applyToAllMonths ? plan.duration : 1)}h</p>
                <p className="text-[10px] text-gray-500 uppercase">Total Hours</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{scopeItems.filter(s => s.quantity > 0).length}</p>
                <p className="text-[10px] text-gray-500 uppercase">Activities</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Navigation Footer ─── */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <div>
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !canProceed1}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleFinish} loading={saving}>
              Create Project
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
