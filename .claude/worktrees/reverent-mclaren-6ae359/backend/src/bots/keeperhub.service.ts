import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export type KhWorkflowNode = {
  id: string;
  type: string;
  data: any;
  position?: { x: number; y: number };
};

export type KhWorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
};

export type KhWorkflow = {
  id: string;
  name: string;
  description?: string;
  visibility?: 'private' | 'public';
  nodes: KhWorkflowNode[];
  edges: KhWorkflowEdge[];
  createdAt?: string;
  updatedAt?: string;
};

export type KhExecution = {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  runId?: string;
  startedAt?: string;
  completedAt?: string;
  output?: unknown;
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
        'KEEPERHUB_API_KEY not set. KeeperHub calls will fail until configured.',
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
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('KEEPERHUB_API_KEY not configured');
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
        `KeeperHub ${method} ${path} -> ${res.status}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async createWorkflow(definition: {
    name: string;
    description?: string;
    nodes: KhWorkflowNode[];
    edges: KhWorkflowEdge[];
  }): Promise<KhWorkflow> {
    return this.request<KhWorkflow>('POST', '/api/workflows', definition);
  }

  async getWorkflow(workflowId: string): Promise<KhWorkflow> {
    return this.request<KhWorkflow>('GET', `/api/workflows/${workflowId}`);
  }

  async deleteWorkflow(workflowId: string, force = true): Promise<void> {
    const q = force ? '?force=true' : '';
    await this.request<void>('DELETE', `/api/workflows/${workflowId}${q}`);
  }

  async listExecutions(workflowId: string): Promise<KhExecution[]> {
    return this.request<KhExecution[]>(
      'GET',
      `/api/executions?workflowId=${encodeURIComponent(workflowId)}`,
    );
  }
}
