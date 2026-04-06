'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { useAddUser, useProjects } from '@/hooks/useApi';

export function AddUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'specialist'>('specialist');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const { data: projectsData } = useProjects();
  const addUser = useAddUser();

  const projects = projectsData?.data || [];

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!email.trim() || !name.trim()) return;
    try {
      await addUser.mutateAsync({ email: email.trim().toLowerCase(), name: name.trim(), role, assignedProjects: selectedProjects });
      setEmail('');
      setName('');
      setRole('specialist');
      setSelectedProjects([]);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to add user');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Team Member" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'specialist')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
          >
            <option value="specialist">Specialist</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Assign to Projects</label>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-400">No projects available</p>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {projects.map((p: any) => (
                <label key={p._id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProjects.includes(p._id)}
                    onChange={() => toggleProject(p._id)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.projectName}</p>
                    <p className="text-xs text-gray-500 truncate">{p.domain}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={addUser.isPending} disabled={!email.trim() || !name.trim()}>
          Add Member
        </Button>
      </div>
    </Modal>
  );
}
