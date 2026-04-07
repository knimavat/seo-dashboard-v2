'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { useUpdateUser, useDeleteUser, useTransferOwnership, useProjects } from '@/hooks/useApi';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

interface UserData {
  _id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'specialist';
  assignedProjects: string[];
  status: 'active' | 'deactivated';
}

export function EditUserModal({ open, onClose, user }: { open: boolean; onClose: () => void; user: UserData | null }) {
  const { user: currentUser } = useAuthStore();
  const [role, setRole] = useState<'owner' | 'admin' | 'specialist'>('specialist');
  const [status, setStatus] = useState<'active' | 'deactivated'>('active');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const { data: projectsData } = useProjects();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const transferOwnership = useTransferOwnership();

  const projects = projectsData?.data || [];
  const isOwner = currentUser?.role === 'owner';
  const isSelf = currentUser?._id === user?._id;

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

  const handleDeactivate = async () => {
    if (!user || !confirm(`Deactivate ${user.name}? They will no longer be able to log in.`)) return;
    try {
      await updateUser.mutateAsync({ userId: user._id, data: { status: 'deactivated' } });
      onClose();
    } catch (err: any) { alert(err.message); }
  };

  const handleReactivate = async () => {
    if (!user) return;
    try {
      await updateUser.mutateAsync({ userId: user._id, data: { status: 'active' } });
      onClose();
    } catch (err: any) { alert(err.message); }
  };

  const handleRemove = async () => {
    if (!user || !confirm(`Permanently remove ${user.name} (${user.email})? This cannot be undone.`)) return;
    try {
      await deleteUser.mutateAsync(user._id);
      onClose();
    } catch (err: any) { alert(err.message); }
  };

  const handleTransferOwnership = async () => {
    if (!user) return;
    if (!confirm(`Transfer ownership to ${user.name}?\n\nThis will:\n• Make ${user.name} the Owner\n• Demote you to Admin\n\nYou will need to log in again.`)) return;
    try {
      const res = await transferOwnership.mutateAsync(user._id);
      alert(res.data?.message || 'Ownership transferred. Please log in again.');
      window.location.href = '/';
    } catch (err: any) { alert(err.message); }
  };

  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Team Member" size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-semibold">
            {user.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
            user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          )}>
            {user.status}
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'owner' | 'admin' | 'specialist')}
            disabled={!isOwner && user.role === 'owner'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white disabled:opacity-50"
          >
            <option value="specialist">Specialist</option>
            <option value="admin">Admin</option>
            {isOwner && <option value="owner">Owner</option>}
          </select>
          {!isOwner && user.role === 'owner' && (
            <p className="text-[10px] text-gray-400 mt-1">Only an owner can change another owner&apos;s role.</p>
          )}
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

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        {/* Left: destructive actions (not for self or if non-owner editing owner) */}
        <div className="flex gap-2">
          {!isSelf && (isOwner || user.role !== 'owner') && (
            <>
              {user.status === 'active' ? (
                <Button variant="secondary" onClick={handleDeactivate} className="!text-red-500 !border-red-200 hover:!bg-red-50">
                  Deactivate
                </Button>
              ) : (
                <Button variant="secondary" onClick={handleReactivate} className="!text-green-600 !border-green-200 hover:!bg-green-50">
                  Reactivate
                </Button>
              )}
              {isOwner && (
                <button onClick={handleRemove} className="text-xs text-red-400 hover:text-red-600 font-medium px-2">
                  Remove
                </button>
              )}
              {isOwner && !isSelf && user.role !== 'owner' && (
                <button onClick={handleTransferOwnership} className="text-xs text-amber-500 hover:text-amber-700 font-medium px-2">
                  Transfer Ownership
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={updateUser.isPending}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
