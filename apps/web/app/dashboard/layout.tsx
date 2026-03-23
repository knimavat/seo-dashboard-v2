import { QueryProvider } from '@/providers/query-provider';
import { AuthGuard } from '@/providers/auth-guard';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Sidebar />
          <main className="ml-64 min-h-screen">
            <div className="p-6 lg:p-8 max-w-[1440px]">{children}</div>
          </main>
        </div>
      </AuthGuard>
    </QueryProvider>
  );
}
