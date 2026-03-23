const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('auth_token', token);
      else localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });

    if (res.status === 401) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        this.setToken(data.data.token);
        headers['Authorization'] = `Bearer ${this.token}`;
        const retry = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
        if (!retry.ok) throw new Error('Request failed after token refresh');
        return retry.json();
      }
      this.setToken(null);
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${res.status}`);
    }
    if (res.status === 204) return {} as T;
    return res.json();
  }

  // Auth
  async loginWithGoogle(credential: string) { return this.request<any>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }); }
  async getMe() { return this.request<any>('/auth/me'); }
  async logout() { const r = this.request<any>('/auth/logout', { method: 'POST' }); this.setToken(null); return r; }

  // Projects
  async getProjects(params?: Record<string, string>) { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return this.request<any>(`/projects${qs}`); }
  async getProject(id: string) { return this.request<any>(`/projects/${id}`); }
  async createProject(data: any) { return this.request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }); }
  async updateProject(id: string, data: any) { return this.request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }

  // Tasks
  async getTasks(projectId: string, params?: Record<string, string>) { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return this.request<any>(`/projects/${projectId}/tasks${qs}`); }
  async createTask(projectId: string, data: any) { return this.request<any>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }); }
  async updateTask(projectId: string, taskId: string, data: any) { return this.request<any>(`/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }); }

  // Keywords
  async getKeywords(projectId: string, params?: Record<string, string>) { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return this.request<any>(`/projects/${projectId}/keywords${qs}`); }
  async createKeyword(projectId: string, data: any) { return this.request<any>(`/projects/${projectId}/keywords`, { method: 'POST', body: JSON.stringify(data) }); }
  async bulkCreateKeywords(projectId: string, keywords: any[]) { return this.request<any>(`/projects/${projectId}/keywords/bulk`, { method: 'POST', body: JSON.stringify({ keywords }) }); }

  // Audits
  async getAudits(projectId: string, params?: Record<string, string>) { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return this.request<any>(`/projects/${projectId}/audits${qs}`); }
  async createAudit(projectId: string, data: any) { return this.request<any>(`/projects/${projectId}/audits`, { method: 'POST', body: JSON.stringify(data) }); }
  async updateAudit(projectId: string, auditId: string, data: any) { return this.request<any>(`/projects/${projectId}/audits/${auditId}`, { method: 'PATCH', body: JSON.stringify(data) }); }

  // Approvals
  async getApprovals(projectId: string, params?: Record<string, string>) { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return this.request<any>(`/projects/${projectId}/approvals${qs}`); }
  async createApproval(projectId: string, data: any) { return this.request<any>(`/projects/${projectId}/approvals`, { method: 'POST', body: JSON.stringify(data) }); }
  async decideApproval(projectId: string, approvalId: string, data: any) { return this.request<any>(`/projects/${projectId}/approvals/${approvalId}/decide`, { method: 'PATCH', body: JSON.stringify(data) }); }

  // Reviews
  async getReviews(projectId: string, params?: Record<string, string>) { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return this.request<any>(`/projects/${projectId}/reviews${qs}`); }
  async createReview(projectId: string, data: any) { return this.request<any>(`/projects/${projectId}/reviews`, { method: 'POST', body: JSON.stringify(data) }); }

  // Reports (link management)
  async getReports(projectId: string) { return this.request<any>(`/projects/${projectId}/reports`); }
  async generateReport(projectId: string, data: any) { return this.request<any>(`/projects/${projectId}/reports/generate`, { method: 'POST', body: JSON.stringify(data) }); }
  async deleteReport(projectId: string, reportId: string) { return this.request<any>(`/projects/${projectId}/reports/${reportId}`, { method: 'DELETE' }); }
  async revokeReport(projectId: string, reportId: string) { return this.request<any>(`/projects/${projectId}/reports/${reportId}/revoke`, { method: 'PATCH' }); }

  // Analytics
  async getAnalytics(projectId: string, params?: Record<string, string>) { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return this.request<any>(`/projects/${projectId}/analytics${qs}`); }
  async saveAnalytics(projectId: string, data: any) { return this.request<any>(`/projects/${projectId}/analytics`, { method: 'POST', body: JSON.stringify(data) }); }
  async deleteAnalytics(projectId: string, month: string) { return this.request<any>(`/projects/${projectId}/analytics/${month}`, { method: 'DELETE' }); }

  // Competitors
  async getCompetitors(projectId: string) { return this.request<any>(`/projects/${projectId}/competitors`); }
  async createCompetitor(projectId: string, data: any) { return this.request<any>(`/projects/${projectId}/competitors`, { method: 'POST', body: JSON.stringify(data) }); }
  async addCompetitorSnapshot(projectId: string, competitorId: string, data: any) { return this.request<any>(`/projects/${projectId}/competitors/${competitorId}/snapshot`, { method: 'POST', body: JSON.stringify(data) }); }
  async bulkCompetitorSnapshot(projectId: string, data: any) { return this.request<any>(`/projects/${projectId}/competitors/bulk-snapshot`, { method: 'POST', body: JSON.stringify(data) }); }
  async deleteCompetitor(projectId: string, competitorId: string) { return this.request<any>(`/projects/${projectId}/competitors/${competitorId}`, { method: 'DELETE' }); }

  // Dashboard
  async getPortfolio() { return this.request<any>('/dashboard/portfolio'); }
  async getProjectDashboard(projectId: string, params?: Record<string, string>) { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return this.request<any>(`/dashboard/project/${projectId}${qs}`); }
  async getWorkload() { return this.request<any>('/dashboard/workload'); }

  // Public report (no auth needed — used by report page)
  async getPublicReport(token: string, password?: string) {
    const headers: Record<string, string> = {};
    if (password) headers['x-report-password'] = password;
    return this.request<any>(`/public/report/${token}`, { headers });
  }
}

export const api = new ApiClient();