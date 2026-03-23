'use client';

import Link from 'next/link';
import { usePortfolio } from '@/hooks/useApi';
import { PageHeader, TableSkeleton, EmptyState } from '@/components/ui';
import { cn, getHealthColor } from '@/lib/utils';

export default function PortfolioPage() {
  const { data, isLoading } = usePortfolio();
  const projects = data?.data || [];

  return (
    <>
      <PageHeader title="Portfolio" subtitle="Cross-project overview of all active clients" />

      {isLoading ? <TableSkeleton rows={6} cols={7} /> : projects.length === 0 ? (
        <EmptyState title="No active projects" description="Create a project to see portfolio metrics." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Project</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Health</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tasks</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Top 10 KW</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total KW</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p: any) => {
                const pct = p.tasksTotal > 0 ? Math.round((p.tasksCompleted / p.tasksTotal) * 100) : 0;
                return (
                  <tr key={p._id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/projects/${p._id}`} className="hover:text-brand-600 transition-colors">
                        <p className="font-medium text-gray-900">{p.projectName}</p>
                        <p className="text-[10px] text-gray-400">{p.clientName} · {p.domain}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('w-3 h-3 rounded-full inline-block', {
                        'bg-health-green': p.healthStatus === 'green',
                        'bg-health-yellow': p.healthStatus === 'yellow',
                        'bg-health-red': p.healthStatus === 'red',
                      })} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs">{p.tasksCompleted}/{p.tasksTotal}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-brand-600">{p.keywordsInTop10}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.keywordsTotal}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-brand-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
