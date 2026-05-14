const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    const data = res.status === 204 ? null : await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    return data;
  }

  // --- Auth ---
  async login(email: string, password: string) {
    return this.request<{
      token?: string;
      requires2FA?: boolean;
      tempToken?: string;
      user?: { id: string; email: string; name: string; role: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async verify2FA(tempToken: string, code: string) {
    return this.request<{
      token: string;
      user: { id: string; email: string; name: string; role: string };
    }>('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    });
  }

  async register(email: string, password: string, name: string) {
    return this.request<{
      token: string;
      user: { id: string; email: string; name: string; role: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ success: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async getMe() {
    return this.request<{
      user: { id: string; email: string; name: string; role: string; totpEnabled: boolean };
      profile: any;
    }>('/auth/me');
  }

  async setup2FA() {
    return this.request<{ secret: string; qrCode: string; uri: string }>('/auth/setup-2fa', { method: 'POST' });
  }

  async confirm2FA(code: string) {
    return this.request('/auth/confirm-2fa', { method: 'POST', body: JSON.stringify({ code }) });
  }

  async disable2FA() {
    return this.request('/auth/disable-2fa', { method: 'POST' });
  }

  // --- Tickets ---
  async getTickets(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[]; count: number }>(`/tickets${qs}`);
  }

  async getTicket(id: string) {
    return this.request(`/tickets/${id}`);
  }

  async createTicket(data: any) {
    return this.request('/tickets', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateTicket(id: string, data: any) {
    return this.request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async addComment(ticketId: string, body: string, isInternal = false) {
    return this.request(`/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, isInternal }),
    });
  }

  async getComments(ticketId: string) {
    return this.request<any[]>(`/tickets/${ticketId}/comments`);
  }

  // --- Attachments ---
  async getAttachments(ticketId: string) {
    return this.request<any[]>(`/tickets/${ticketId}/attachments`);
  }

  async uploadAttachment(ticketId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Upload failed');
    }
    return res.json();
  }

  getAttachmentDownloadUrl(ticketId: string, attachmentId: string) {
    return `${API_BASE}/tickets/${ticketId}/attachments/${attachmentId}/download`;
  }

  async deleteAttachment(ticketId: string, attachmentId: string) {
    return this.request(`/tickets/${ticketId}/attachments/${attachmentId}`, { method: 'DELETE' });
  }

  // --- Dashboard ---
  async getDashboard() {
    return this.request<any>('/dashboard');
  }

  // --- Profiles ---
  async getProfiles() {
    return this.request<any[]>('/profiles');
  }

  async getProfile(userId: string) {
    return this.request(`/profiles/${userId}`);
  }

  async updateMyProfile(data: any) {
    return this.request('/profiles/me', { method: 'PATCH', body: JSON.stringify(data) });
  }

  async updateUserRole(userId: string, role: string) {
    return this.request(`/profiles/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
  }

  async updateUser(userId: string, data: any) {
    return this.request(`/profiles/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  // --- CRUD endpoints ---
  async getCategories() { return this.request<any[]>('/categories'); }
  async createCategory(data: any) { return this.request('/categories', { method: 'POST', body: JSON.stringify(data) }); }
  async updateCategory(id: string, data: any) { return this.request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  async deleteCategory(id: string) { return this.request(`/categories/${id}`, { method: 'DELETE' }); }

  async getDepartments() { return this.request<any[]>('/departments'); }
  async createDepartment(data: any) { return this.request('/departments', { method: 'POST', body: JSON.stringify(data) }); }
  async updateDepartment(id: string, data: any) { return this.request(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  async deleteDepartment(id: string) { return this.request(`/departments/${id}`, { method: 'DELETE' }); }

  async getGroups() { return this.request<any[]>('/groups'); }
  async createGroup(data: any) { return this.request('/groups', { method: 'POST', body: JSON.stringify(data) }); }
  async updateGroup(id: string, data: any) { return this.request(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  async deleteGroup(id: string) { return this.request(`/groups/${id}`, { method: 'DELETE' }); }

  async getSLAPolicies() { return this.request<any[]>('/sla-policies'); }
  async createSLAPolicy(data: any) { return this.request('/sla-policies', { method: 'POST', body: JSON.stringify(data) }); }
  async updateSLAPolicy(id: string, data: any) { return this.request(`/sla-policies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  async deleteSLAPolicy(id: string) { return this.request(`/sla-policies/${id}`, { method: 'DELETE' }); }

  async getNotifications() { return this.request<any[]>('/notifications'); }
  async markNotificationRead(id: string) { return this.request(`/notifications/${id}/read`, { method: 'PATCH' }); }

  async getPPRPlans() { return this.request<any[]>('/ppr-plans'); }
  async createPPRPlan(data: any) { return this.request('/ppr-plans', { method: 'POST', body: JSON.stringify(data) }); }
  async updatePPRPlan(id: string, data: any) { return this.request(`/ppr-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  async deletePPRPlan(id: string) { return this.request(`/ppr-plans/${id}`, { method: 'DELETE' }); }

  async getReports() { return this.request<any[]>('/reports'); }
  async createReport(data: any) { return this.request('/reports', { method: 'POST', body: JSON.stringify(data) }); }
  async updateReport(id: string, data: any) { return this.request(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }

  async getPerformanceScores() { return this.request<any[]>('/performance-scores'); }

  async getTicketHistory(ticketId?: string) {
    const path = ticketId ? `/ticket-history?ticketId=${ticketId}` : '/ticket-history';
    return this.request<any[]>(path);
  }

  async getTicketSla(ticketId?: string) {
    const path = ticketId ? `/ticket-sla?ticketId=${ticketId}` : '/ticket-sla';
    return this.request<any[]>(path);
  }

  async getUserRoles() {
    return this.request<any[]>('/user-roles');
  }

  // --- Push Notifications ---
  async getVapidKey() {
    return this.request<{ publicKey: string | null }>('/notifications/vapid-key');
  }

  async subscribePush(subscription: PushSubscription) {
    const json = subscription.toJSON();
    return this.request('/notifications/push-subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });
  }

  async unsubscribePush(endpoint: string) {
    return this.request('/notifications/push-unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
  }

  async markAllNotificationsRead() {
    const notifications = await this.getNotifications();
    const unread = (notifications || []).filter((n: any) => !n.is_read);
    await Promise.all(unread.map((n: any) => this.markNotificationRead(n.id)));
    return { success: true };
  }

  // --- Notification Preferences ---
  async getNotificationPreferences() {
    return this.request<any>('/notifications/preferences');
  }

  async updateNotificationPreferences(prefs: any) {
    return this.request('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  }

  // --- Chat ---
  async getChatRooms() { return this.request<any[]>('/chat/rooms'); }
  async createChatRoom(data: { name?: string; type?: string; memberIds: string[] }) {
    return this.request('/chat/rooms', { method: 'POST', body: JSON.stringify(data) });
  }
  async getChatMessages(roomId: string) { return this.request<any[]>(`/chat/rooms/${roomId}/messages`); }
  async sendChatMessage(roomId: string, body: string) {
    return this.request(`/chat/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
  }
  async uploadChatMessage(roomId: string, file: File | Blob, options: { messageType?: 'file' | 'audio'; body?: string; durationMs?: number; fileName?: string } = {}) {
    const formData = new FormData();
    formData.append('file', file, options.fileName || (file instanceof File ? file.name : 'voice-message.webm'));
    if (options.messageType) formData.append('messageType', options.messageType);
    if (options.body) formData.append('body', options.body);
    if (options.durationMs !== undefined) formData.append('durationMs', String(options.durationMs));

    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}/chat/rooms/${roomId}/messages/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  }
  getChatMessageFileUrl(messageId: string) {
    const token = this.token ? `?token=${encodeURIComponent(this.token)}` : '';
    return `${API_BASE}/chat/messages/${messageId}/file${token}`;
  }
  async deleteChatRoom(roomId: string) { return this.request(`/chat/rooms/${roomId}`, { method: 'DELETE' }); }

  // --- Meetings ---
  async getMeetings() { return this.request<any[]>('/meetings'); }
  async getMeeting(id: string) { return this.request<any>(`/meetings/${id}`); }
  async createMeeting(data: any) {
    return this.request('/meetings', { method: 'POST', body: JSON.stringify(data) });
  }
  async startMeeting(id: string) {
    return this.request(`/meetings/${id}/start`, { method: 'PATCH' });
  }
  async endMeeting(id: string) {
    return this.request(`/meetings/${id}/end`, { method: 'PATCH' });
  }
  async cancelMeeting(id: string) {
    return this.request(`/meetings/${id}/cancel`, { method: 'PATCH' });
  }
  async deleteMeeting(id: string) {
    return this.request(`/meetings/${id}`, { method: 'DELETE' });
  }

  // --- Assets ---
  async getAssets(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[]; total: number }>(`/assets${qs}`);
  }
  async getAsset(id: string) { return this.request(`/assets/${id}`); }
  async createAsset(data: any) { return this.request('/assets', { method: 'POST', body: JSON.stringify(data) }); }
  async updateAsset(id: string, data: any) { return this.request(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  async deleteAsset(id: string) { return this.request(`/assets/${id}`, { method: 'DELETE' }); }

  // --- Knowledge Base ---
  async getKBCategories() { return this.request<any[]>('/kb/categories'); }
  async createKBCategory(data: any) { return this.request('/kb/categories', { method: 'POST', body: JSON.stringify(data) }); }
  async updateKBCategory(id: string, data: any) { return this.request(`/kb/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  async deleteKBCategory(id: string) { return this.request(`/kb/categories/${id}`, { method: 'DELETE' }); }

  async getKBArticles(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/kb/articles${qs}`);
  }
  async getKBArticle(id: string) { return this.request(`/kb/articles/${id}`); }
  async createKBArticle(data: any) { return this.request('/kb/articles', { method: 'POST', body: JSON.stringify(data) }); }
  async updateKBArticle(id: string, data: any) { return this.request(`/kb/articles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  async deleteKBArticle(id: string) { return this.request(`/kb/articles/${id}`, { method: 'DELETE' }); }

  // --- Ticket KB Links ---
  async getTicketKBLinks(ticketId: string) { return this.request<any[]>(`/kb/tickets/${ticketId}/links`); }
  async linkTicketKB(ticketId: string, articleId: string) {
    return this.request(`/kb/tickets/${ticketId}/links`, { method: 'POST', body: JSON.stringify({ articleId }) });
  }
  async unlinkTicketKB(ticketId: string, linkId: string) {
    return this.request(`/kb/tickets/${ticketId}/links/${linkId}`, { method: 'DELETE' });
  }

  // --- Documents ---
  async getReceivedDocuments() { return this.request<any[]>('/documents/received'); }
  async getSentDocuments() { return this.request<any[]>('/documents/sent'); }
  async markDocumentRead(id: string) { return this.request(`/documents/${id}/read`, { method: 'PATCH' }); }
  async deleteDocument(id: string) { return this.request(`/documents/${id}`, { method: 'DELETE' }); }

  async sendDocument(recipientId: string, fileName: string, fileType: string, fileBlob: Blob, message?: string) {
    const formData = new FormData();
    formData.append('file', fileBlob, `${fileName}.${fileType}`);
    formData.append('recipientId', recipientId);
    formData.append('fileName', fileName);
    formData.append('fileType', fileType);
    if (message) formData.append('message', message);

    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}/documents/send`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Send failed');
    }
    return res.json();
  }

  getDocumentDownloadUrl(id: string) {
    return `${API_BASE}/documents/${id}/download`;
  }

  async downloadDocument(id: string) {
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/documents/${id}/download`, { headers });
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  }
}

export const api = new ApiClient();
