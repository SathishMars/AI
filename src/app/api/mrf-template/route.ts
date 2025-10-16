// src/app/api/mrf-template/route.ts
import { NextRequest, NextResponse } from 'next/server';

export interface MRFTemplate {
  id: string;
  name: string;
  version: string;
  fields: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
      description: string;
      required: boolean;
      examples?: string[];
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        options?: string[];
      };
    };
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    category: string;
    tags: string[];
  };
}

// Sample MRF template with comprehensive fields
const sampleMRFTemplate: MRFTemplate = {
  id: 'mrf_standard_v2',
  name: 'Standard Meeting Request Form',
  version: '2.1.0',
  fields: {
    // Basic Information
    title: {
      type: 'string',
      description: 'Meeting title or subject',
      required: true,
      examples: ['Team Weekly Standup', 'Q4 Planning Session', 'Client Presentation']
    },
    description: {
      type: 'string',
      description: 'Detailed meeting description and agenda',
      required: false,
      examples: ['Review project progress and plan next steps']
    },
    purpose: {
      type: 'string',
      description: 'Meeting purpose or objective',
      required: true,
      validation: {
        options: ['planning', 'review', 'training', 'presentation', 'brainstorming', 'decision-making', 'status-update']
      },
      examples: ['planning', 'review', 'training']
    },
    
    // Timing
    requestedDate: {
      type: 'date',
      description: 'Preferred meeting date',
      required: true,
      examples: ['2025-10-15', '2025-11-01']
    },
    requestedTime: {
      type: 'string',
      description: 'Preferred meeting start time',
      required: true,
      examples: ['09:00', '14:30', '10:00']
    },
    duration: {
      type: 'number',
      description: 'Meeting duration in minutes',
      required: true,
      validation: { min: 15, max: 480 },
      examples: ['60', '90', '30']
    },
    timezone: {
      type: 'string',
      description: 'Meeting timezone',
      required: false,
      examples: ['UTC', 'EST', 'PST', 'GMT']
    },
    
    // Participants
    attendees: {
      type: 'array',
      description: 'List of required attendees (email addresses)',
      required: true,
      examples: ['["user@company.com", "manager@company.com"]']
    },
    optionalAttendees: {
      type: 'array',
      description: 'List of optional attendees',
      required: false,
      examples: ['["stakeholder@company.com"]']
    },
    maxAttendees: {
      type: 'number',
      description: 'Maximum number of attendees',
      required: false,
      validation: { min: 1, max: 100 },
      examples: ['10', '25', '50']
    },
    
    // Location & Resources
    location: {
      type: 'string',
      description: 'Meeting location or virtual meeting link',
      required: true,
      examples: ['Conference Room A', 'Virtual - Teams', 'Building 1, Floor 3']
    },
    roomCapacity: {
      type: 'number',
      description: 'Required room capacity',
      required: false,
      validation: { min: 1, max: 200 },
      examples: ['8', '12', '20']
    },
    equipment: {
      type: 'array',
      description: 'Required equipment or resources',
      required: false,
      examples: ['["projector", "whiteboard", "video-conference"]']
    },
    
    // Budget & Approval
    estimatedCost: {
      type: 'number',
      description: 'Estimated meeting cost (for external venues, catering, etc.)',
      required: false,
      validation: { min: 0, max: 10000 },
      examples: ['0', '150', '500']
    },
    budgetCode: {
      type: 'string',
      description: 'Budget code or cost center',
      required: false,
      examples: ['DEPT-2025-001', 'PROJECT-ABC-123']
    },
    requiresApproval: {
      type: 'boolean',
      description: 'Whether meeting requires manager approval',
      required: false,
      examples: ['true', 'false']
    },
    
    // Additional Details
    priority: {
      type: 'string',
      description: 'Meeting priority level',
      required: false,
      validation: {
        options: ['low', 'normal', 'high', 'urgent']
      },
      examples: ['normal', 'high', 'urgent']
    },
    recurring: {
      type: 'boolean',
      description: 'Is this a recurring meeting',
      required: false,
      examples: ['false', 'true']
    },
    recurrencePattern: {
      type: 'string',
      description: 'Recurrence pattern (if recurring)',
      required: false,
      validation: {
        options: ['daily', 'weekly', 'monthly', 'quarterly']
      },
      examples: ['weekly', 'monthly']
    },
    
    // Metadata
    department: {
      type: 'string',
      description: 'Requesting department',
      required: true,
      examples: ['Engineering', 'Marketing', 'Sales', 'HR']
    },
    projectCode: {
      type: 'string',
      description: 'Associated project code',
      required: false,
      examples: ['PROJ-2025-001', 'INITIATIVE-Q4']
    },
    externalGuests: {
      type: 'boolean',
      description: 'Will there be external guests',
      required: false,
      examples: ['false', 'true']
    },
    securityLevel: {
      type: 'string',
      description: 'Meeting security/confidentiality level',
      required: false,
      validation: {
        options: ['public', 'internal', 'confidential', 'restricted']
      },
      examples: ['internal', 'confidential']
    }
  },
  metadata: {
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-09-30T00:00:00Z',
    category: 'meeting-request',
    tags: ['standard', 'meeting', 'request', 'form', 'template']
  }
};

export async function GET(request: NextRequest) {
  try {
    // In a real application, you might:
    // 1. Fetch template from database based on user/organization
    // 2. Apply user-specific customizations
    // 3. Check user permissions
    
  const searchParams = request.nextUrl.searchParams;
  const includeExamples = searchParams.get('includeExamples') !== 'false';
    
    // For now, return the sample template
    const template = { ...sampleMRFTemplate };
    
    // Optionally remove examples to reduce payload size
    if (!includeExamples) {
      Object.keys(template.fields).forEach(key => {
        delete template.fields[key].examples;
      });
    }
    
    return NextResponse.json({
      success: true,
      data: template,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching MRF template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch MRF template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
  await request.json();
    
  // In a real application, you might:
    // 1. Validate the MRF submission
    // 2. Save to database
    // 3. Trigger workflow processes
    // 4. Send notifications
    
    return NextResponse.json({
      success: true,
      message: 'MRF template updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating MRF template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update MRF template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}