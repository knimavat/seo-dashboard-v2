'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard/projects');
  }, [isAuthenticated, router]);

  // Google Sign-In callback
  useEffect(() => {
    (window as any).handleCredentialResponse = async (response: any) => {
      try {
        await login(response.credential);
        router.push('/dashboard/projects');
      } catch (err: any) {
        alert(err.message || 'Login failed');
      }
    };

    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.body.appendChild(script);

    return () => { document.body.removeChild(script); };
  }, [login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-xl mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-brand-600">SEO Command Center</h1>
            <p className="text-gray-500 mt-2 text-sm">Sign in with your authorized Google account</p>
          </div>

          {/* Google Sign-In Button */}
          <div className="flex justify-center">
            <div
              id="g_id_onload"
              data-client_id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
              data-callback="handleCredentialResponse"
              data-auto_prompt="false"
            />
            <div
              className="g_id_signin"
              data-type="standard"
              data-size="large"
              data-theme="outline"
              data-text="sign_in_with"
              data-shape="rectangular"
              data-logo_alignment="left"
              data-width="320"
            />
          </div>

          {/* Fallback */}
          <div className="mt-6 text-center text-xs text-gray-400">
            Only pre-approved team members can access this dashboard.
            <br />
            Contact your agency admin for access.
          </div>
        </div>
      </div>
    </div>
  );
}
