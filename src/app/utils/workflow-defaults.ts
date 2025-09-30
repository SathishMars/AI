// src/app/utils/workflow-defaults.ts
import { WorkflowJSON } from '@/app/types/workflow';
import { MRFData } from '@/app/types/workflow-creation';

// Sample MRF data for testing and demos
export const sampleMRFData: MRFData = {
  id: 'mrf-001',
  title: 'Quarterly All-Hands Meeting',
  description: 'Company-wide quarterly meeting to discuss goals and achievements',
  requestedDate: new Date('2024-03-15'),
  attendees: 150,
  location: 'Main Conference Hall',
  budget: 5000,
  category: 'meeting',
  requester: {
    name: 'John Doe',
    email: 'john.doe@company.com',
    department: 'HR'
  },
  approvalRequired: true,
  customFields: {
    specialRequirements: ['AV Equipment', 'Catering', 'Live Streaming'],
    priority: 'high',
    status: 'pending'
  }
};

// Default workflow structure for new workflows
export const createDefaultWorkflow = (): WorkflowJSON => ({
  schemaVersion: '1.0',
  metadata: {
    id: `workflow-${Date.now()}`,
    name: 'New Workflow',
    description: 'A new workflow created with aime assistant',
    version: '1.0.0',
    status: 'draft',
    createdBy: 'aime assistant',
    createdAt: new Date(),
    tags: ['new', 'ai-generated']
  },
  steps: {}
});