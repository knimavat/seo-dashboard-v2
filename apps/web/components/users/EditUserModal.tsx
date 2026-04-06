'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { useUpdateUser, useProjects } from '@/hooks/useApi';

interface UserData {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'specialist';
  assignedProjects: string[];
  status: 'active' | 'deactivated';
}

export function EditUserModal({ open, onClose, user }: { open: boolean; onClose: () => void; user: UserData | null }) {
  const [role, setRole] = useState<'admin' | 'specialist'>('specialist');
  const [status, setStatus] = useState<'active' | 'deactivated'>('active');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const { data: projectsData } = useProjects();
  const updateUser = useUpdateUser();

  const projects = projectsData?.data || [];

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setStatus(user.status);
      setSelectedProjects(user.assignedProjects || []);
    }
  }, [user]);

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    try {
      await updateUser.mutateAsync({ userId: user._id, data: { role, status, assignedProjects: selectedProjects } });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Team Member" size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-semibold">
            {user.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
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
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'deactivated')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
          >
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Assigned Projects</label>
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
        <Button onClick={handleSubmit} loading={updateUser.isPending}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}
