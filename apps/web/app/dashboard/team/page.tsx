'use client';

import { useWorkload } from '@/hooks/useApi';
import { PageHeader, StatusBadge, TableSkeleton, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function TeamPage() {
  const { data, isLoading } = useWorkload();
  const workload = data?.data || [];

  return (
    <>
      <PageHeader title="Team Workload" subtitle="Active task distribution across team members" />

      {isLoading ? <TableSkeleton rows={4} cols={5} /> : workload.length === 0 ? (
        <EmptyState title="No team members" description="Add team members to track workload." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workload.map((member: any) => (
            <div key={member.user._id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                {member.user.avatarUrl ? (
                  <img src={member.user.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-semibold">
                    {member.user.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{member.user.name}</p>
                  <p className="text-xs text-gray-500">{member.user.email}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-bold text-gray-900">{member.activeTasks}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Active Tasks</p>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {Object.entries(member.byStatus || {}).map(([key, val]: [string, any]) => (
                  <div key={key} className="text-center py-1.5 bg-gray-50 rounded-md">
                    <p className="text-sm font-bold text-gray-900">{val}</p>
                    <p className="text-[9px] text-gray-400 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </div>
                ))}
              </div>

              {/* Tasks List */}
              {member.tasks?.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {member.tasks.map((task: any) => (
                    <div key={task._id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50">
                      <StatusBadge status={task.status} size="xs" />
                      <span className="text-xs text-gray-700 truncate flex-1">{task.title}</span>
                      <span className={cn('text-[10px] font-medium capitalize', {
                        'text-red-500': task.priority === 'critical',
                        'text-orange-500': task.priority === 'high',
                        'text-yellow-600': task.priority === 'medium',
                        'text-blue-400': task.priority === 'low',
                      })}>{task.priority}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
