import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function getHealthColor(status: string) {
  switch (status) {
    case 'green': return 'text-health-green bg-green-50 border-green-200';
    case 'yellow': return 'text-health-yellow bg-amber-50 border-amber-200';
    case 'red': return 'text-health-red bg-red-50 border-red-200';
    default: return 'text-gray-500 bg-gray-50 border-gray-200';
  }
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    in_review: 'bg-purple-100 text-purple-700',
    approved: 'bg-emerald-100 text-emerald-700',
    published: 'bg-green-100 text-green-800',
    blocked: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-200 text-gray-500',
    open: 'bg-orange-100 text-orange-700',
    fixed: 'bg-green-100 text-green-700',
    verified: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getSeverityColor(severity: string) {
  const colors: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-blue-400 text-white',
    informational: 'bg-gray-400 text-white',
  };
  return colors[severity] || 'bg-gray-400 text-white';
}
