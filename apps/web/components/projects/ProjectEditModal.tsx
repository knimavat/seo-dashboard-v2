    'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button, Modal, Input, Select } from '@/components/ui';

export function ProjectEditModal({ open, onClose, project, onSuccess }: { open: boolean; onClose: () => void; project: any; onSuccess: () => void }) {
  const [form, setForm] = useState({
    clientName: '', clientEmail: '', projectName: '', domain: '', industry: '',
    status: 'active', healthStatus: 'green', healthNote: '',
    primaryColor: '', accentColor: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project && open) {
      setForm({
        clientName: project.clientName || '',
        clientEmail: project.clientEmail || '',
        projectName: project.projectName || '',
        domain: project.domain || '',
        industry: project.industry || '',
        status: project.status || 'active',
        healthStatus: project.healthStatus || 'green',
        healthNote: project.healthNote || '',
        primaryColor: project.branding?.primaryColor || '#1B2A4A',
        accentColor: project.branding?.accentColor || '#2E75B6',
      });
    }
  }, [project, open]);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.updateProject(project._id, {
        clientName: form.clientName,
        clientEmail: form.clientEmail || undefined,
        projectName: form.projectName,
        domain: form.domain,
        industry: form.industry || undefined,
        status: form.status,
        healthStatus: form.healthStatus,
        healthNote: form.healthNote || undefined,
        branding: {
          primaryColor: form.primaryColor || undefined,
          accentColor: form.accentColor || undefined,
        },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Project" size="lg">
      <div className="space-y-4">
        {/* Client Info */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Client Name" value={form.clientName} onChange={v => set('clientName', v)} required />
          <Input label="Client Email" type="email" value={form.clientEmail} onChange={v => set('clientEmail', v)} placeholder="client@company.com" />
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Project Name" value={form.projectName} onChange={v => set('projectName', v)} required />
          <Input label="Domain" value={form.domain} onChange={v => set('domain', v)} required placeholder="https://example.com" />
        </div>

        <Input label="Industry" value={form.industry} onChange={v => set('industry', v)} placeholder="SaaS, E-commerce, Healthcare, etc." />

        {/* Status */}
        <div className="grid grid-cols-2 gap-4">
          <Select label="Project Status" value={form.status} onChange={v => set('status', v)} options={[
            { label: 'Active', value: 'active' },
            { label: 'Paused', value: 'paused' },
            { label: 'Completed', value: 'completed' },
            { label: 'Archived', value: 'archived' },
          ]} />
          <Select label="Health Status" value={form.healthStatus} onChange={v => set('healthStatus', v)} options={[
            { label: '🟢 Green — On Track', value: 'green' },
            { label: '🟡 Yellow — Needs Attention', value: 'yellow' },
            { label: '🔴 Red — At Risk', value: 'red' },
          ]} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Health Note</label>
          <textarea
            value={form.healthNote}
            onChange={e => set('healthNote', e.target.value)}
            rows={2}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            placeholder="Brief note about project health (shown on dashboard)..."
          />
        </div>

        {/* Branding */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Report Branding (used in client-facing reports)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)} className="w-8 h-8 rounded border border-gray-300 cursor-pointer" />
                <input type="text" value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" placeholder="#1B2A4A" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accentColor} onChange={e => set('accentColor', e.target.value)} className="w-8 h-8 rounded border border-gray-300 cursor-pointer" />
                <input type="text" value={form.accentColor} onChange={e => set('accentColor', e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" placeholder="#2E75B6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} disabled={!form.clientName || !form.projectName || !form.domain}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}