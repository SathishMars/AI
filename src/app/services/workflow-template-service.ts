// src/app/services/workflow-template-service.ts
import { 
  WorkflowTemplate, 
  CreateWorkflowTemplateInput,
  UpdateWorkflowTemplateInput,
  TemplateResolutionResult,
  TemplateListResponse,
  TemplateQueryFilters
} from '@/app/types/workflow-template';

/**
 * Service for interacting with workflow template API endpoints
 * Provides a clean interface for UI components to interact with the database
 */
export class WorkflowTemplateService {
  private baseUrl: string;
  private defaultAccount: string;

  constructor(
    baseUrl: string = '/api/workflow-templates',
    defaultAccount: string = 'default-account'
  ) {
    this.baseUrl = baseUrl;
    this.defaultAccount = defaultAccount;
  }

  /**
   * Set the account context for all operations
   */
  setAccount(account: string) {
    this.defaultAccount = account;
  }

  /**
   * Get common headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-account': this.defaultAccount,
    };
  }

  /**
   * Handle API response and throw errors for non-ok responses
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * List workflow templates with optional filtering and pagination
   */
  async listTemplates(
    filters: TemplateQueryFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<TemplateListResponse> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [key, String(value)])
      )
    });

    const response = await fetch(`${this.baseUrl}?${queryParams}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<TemplateListResponse>(response);
  }

  /**
   * Get a specific workflow template by name
   */
  async getTemplate(name: string): Promise<TemplateResolutionResult> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<TemplateResolutionResult>(response);
  }

  /**
   * Create a new workflow template
   */
  async createTemplate(input: Omit<CreateWorkflowTemplateInput, 'account'>): Promise<WorkflowTemplate> {
    const templateInput: CreateWorkflowTemplateInput = {
      ...input,
      account: this.defaultAccount,
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(templateInput),
    });

    const result = await this.handleResponse<{ data: WorkflowTemplate }>(response);
    return result.data;
  }

  /**
   * Update an existing workflow template
   */
  async updateTemplate(
    name: string,
    version: string,
    updates: UpdateWorkflowTemplateInput
  ): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        account: this.defaultAccount,
        version,
        updates,
        action: 'update',
      }),
    });

    const result = await this.handleResponse<{ data: WorkflowTemplate }>(response);
    return result.data;
  }

  /**
   * Publish a workflow template
   */
  async publishTemplate(name: string, version: string): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        account: this.defaultAccount,
        version,
        action: 'publish',
      }),
    });

    const result = await this.handleResponse<{ data: WorkflowTemplate }>(response);
    return result.data;
  }

  /**
   * Create a draft from a published template
   */
  async createDraftFromPublished(
    name: string,
    publishedVersion: string,
    author: string
  ): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        account: this.defaultAccount,
        publishedVersion,
        author,
      }),
    });

    const result = await this.handleResponse<{ data: WorkflowTemplate }>(response);
    return result.data;
  }

  /**
   * Delete a workflow template
   */
  async deleteTemplate(name: string, version: string): Promise<boolean> {
    const response = await fetch(
      `${this.baseUrl}/${encodeURIComponent(name)}?version=${encodeURIComponent(version)}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    const result = await this.handleResponse<{ success: boolean }>(response);
    return result.success;
  }

  /**
   * Get available template names for quick selection
   */
  async getTemplateNames(status?: 'draft' | 'published'): Promise<string[]> {
    const filters: TemplateQueryFilters = status ? { status } : {};
    const response = await this.listTemplates(filters, 1, 100);
    
    // Extract unique template names
    const names = new Set<string>();
    response.templates.forEach(template => names.add(template.name));
    return Array.from(names).sort();
  }
}

// Export a default instance
export const workflowTemplateService = new WorkflowTemplateService();

// Export helper function to create service with custom account
export function createWorkflowTemplateService(account: string): WorkflowTemplateService {
  const service = new WorkflowTemplateService();
  service.setAccount(account);
  return service;
}