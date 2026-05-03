import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export type KhWorkflow = {
  id: string;
  name: string;
  description?: string;
  visibility?: 'private' | 'public';
  nodes: any[];
  edges: any[];
  createdAt?: string;
  updatedAt?: string;
};

@Injectable()
export class KeeperhubService {
  private readonly logger = new Logger(KeeperhubService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor() {
    this.baseUrl = (
      process.env.KEEPERHUB_BASE_URL || 'https://api.keeperhub.com'
    ).replace(/\/$/, '');
    this.apiKey = process.env.KEEPERHUB_API_KEY;
    if (!this.apiKey) {
      this.logger.warn(
        'KEEPERHUB_API_KEY not set. Bot creation will return 503 until configured.',
      );
    }
  }

  get appUrl(): string {
    return (
      process.env.KEEPERHUB_APP_URL || 'https://app.keeperhub.com'
    ).replace(/\/$/, '');
  }

  editorUrl(workflowId: string): string {
    return `${this.appUrl}/workflows/${workflowId}`;
  }

  webhookUrl(workflowId: string): string {
    return `${this.baseUrl}/api/workflows/${workflowId}/webhook`;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'KEEPERHUB_API_KEY not configured. Set it in backend/.env to create bots.',
      );
    }
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(
        `KeeperHub ${method} ${path} failed: ${res.status} ${text.slice(0, 200)}`,
      );
      throw new ServiceUnavailableException(
        `KeeperHub ${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async createWorkflow(input: {
    name: string;
    description?: string;
  }): Promise<KhWorkflow> {
    return this.request<KhWorkflow>('POST', '/api/workflows/create', {
      name: input.name,
      description: input.description,
      nodes: [],
      edges: [],
    });
  }

  async getWorkflow(workflowId: string): Promise<KhWorkflow> {
    return this.request<KhWorkflow>('GET', `/api/workflows/${workflowId}`);
  }

  async deleteWorkflow(workflowId: string, force = true): Promise<void> {
    const q = force ? '?force=true' : '';
    await this.request<void>('DELETE', `/api/workflows/${workflowId}${q}`);
  }

  async triggerWebhook(
    workflowId: string,
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; status: number; body: unknown }> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('KEEPERHUB_API_KEY not configured');
    }
    const url = `${this.baseUrl}/api/workflows/${workflowId}/webhook`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => '');
    }
    if (!res.ok) {
      this.logger.warn(
        `KH webhook ${workflowId} -> ${res.status} ${JSON.stringify(body).slice(0, 200)}`,
      );
    }
    return { ok: res.ok, status: res.status, body };
  }

  async updateWorkflow(
    workflowId: string,
    patch: {
      name?: string;
      description?: string;
      nodes?: unknown[];
      edges?: unknown[];
      enabled?: boolean;
    },
  ): Promise<KhWorkflow> {
    return this.request<KhWorkflow>(
      'PATCH',
      `/api/workflows/${workflowId}`,
      patch,
    );
  }
}
