'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProjects } from '@/hooks/useApi';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader, Button, StatusBadge, EmptyState, Select, Input, Skeleton } from '@/components/ui';
import { CreateProjectWizard } from '@/components/projects/CreateProjectWizard';
import { formatDate, cn } from '@/lib/utils';

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (search) params.search = search;

  const { data, isLoading } = useProjects(params);
  const projects = data?.data || [];

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length || 0} project${projects.length !== 1 ? 's' : ''}`}
        actions={
          user?.role === 'admin' && (
            <Button onClick={() => setShowCreate(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-64">
          <Input value={search} onChange={setSearch} placeholder="Search projects..." />
        </div>
        <div className="w-40">
          <Select
            value={status}
            onChange={setStatus}
            placeholder="All statuses"
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Paused', value: 'paused' },
              { label: 'Completed', value: 'completed' },
              { label: 'Archived', value: 'archived' },
            ]}
          />
        </div>
      </div>

      {/* Project Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <div className="flex gap-3">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking SEO progress."
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
          action={user?.role === 'admin' && <Button onClick={() => setShowCreate(true)}>Create Project</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project: any) => (
            <Link
              key={project._id}
              href={`/dashboard/projects/${project._id}`}
              className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-brand-200 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
                    {project.projectName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{project.clientName} · {project.domain}</p>
                </div>
                <div className={cn('w-2.5 h-2.5 rounded-full ml-3 mt-1 flex-shrink-0', {
                  'bg-health-green': project.healthStatus === 'green',
                  'bg-health-yellow': project.healthStatus === 'yellow',
                  'bg-health-red': project.healthStatus === 'red',
                })} />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center py-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{project.metadata?.totalTasks || 0}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Tasks</p>
                </div>
                <div className="text-center py-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{project.metadata?.totalKeywords || 0}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Keywords</p>
                </div>
                <div className="text-center py-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{project.metadata?.openAuditIssues || 0}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Issues</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <StatusBadge status={project.status} size="xs" />
                <span className="text-[10px] text-gray-400">
                  {project.metadata?.lastReportDate
                    ? `Report: ${formatDate(project.metadata.lastReportDate)}`
                    : 'No reports yet'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Wizard */}
      <CreateProjectWizard open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
