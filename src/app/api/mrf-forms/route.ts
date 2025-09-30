// src/app/api/mrf-forms/route.ts
import { NextRequest, NextResponse } from 'next/server';

export interface MRFForm {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
  lastModified: Date;
  createdBy: string;
  attendeeCount?: number;
  estimatedBudget?: number;
  eventDate?: Date;
  category: string;
  priority: 'high' | 'medium' | 'low';
}

// Sample MRF forms for demo purposes
const sampleMRFForms: MRFForm[] = [
  {
    id: 'MRF_2024_001',
    title: 'Q1 Team Building Event',
    description: 'Quarterly team building activity for Sales team - outdoor activities and team lunch',
    status: 'active',
    lastModified: new Date('2024-12-15T10:30:00Z'),
    createdBy: 'sarah.jones@groupize.com',
    attendeeCount: 25,
    estimatedBudget: 5000,
    eventDate: new Date('2025-01-15T09:00:00Z'),
    category: 'team-building',
    priority: 'medium'
  },
  {
    id: 'MRF_2024_002',
    title: 'Product Launch Meeting',
    description: 'New product announcement and training session for customer success team',
    status: 'active',
    lastModified: new Date('2024-12-20T14:15:00Z'),
    createdBy: 'mike.wilson@groupize.com',
    attendeeCount: 150,
    estimatedBudget: 25000,
    eventDate: new Date('2025-02-01T13:00:00Z'),
    category: 'product-launch',
    priority: 'high'
  },
  {
    id: 'MRF_2024_003',
    title: 'Board Meeting Preparation',
    description: 'Monthly board meeting with external stakeholders and investor presentation',
    status: 'draft',
    lastModified: new Date('2024-12-18T16:45:00Z'),
    createdBy: 'executive.assistant@groupize.com',
    attendeeCount: 12,
    estimatedBudget: 8000,
    eventDate: new Date('2025-01-30T14:00:00Z'),
    category: 'executive',
    priority: 'high'
  },
  {
    id: 'MRF_2024_004',
    title: 'Customer Training Workshop',
    description: 'Technical training for key customers on new platform features',
    status: 'active',
    lastModified: new Date('2024-12-22T11:20:00Z'),
    createdBy: 'training.coordinator@groupize.com',
    attendeeCount: 40,
    estimatedBudget: 12000,
    eventDate: new Date('2025-01-25T10:00:00Z'),
    category: 'training',
    priority: 'medium'
  },
  {
    id: 'MRF_2024_005',
    title: 'Holiday Party Planning',
    description: 'End of year celebration for all employees - venue, catering, and entertainment',
    status: 'active',
    lastModified: new Date('2024-12-10T09:00:00Z'),
    createdBy: 'hr.events@groupize.com',
    attendeeCount: 200,
    estimatedBudget: 35000,
    eventDate: new Date('2024-12-31T18:00:00Z'),
    category: 'celebration',
    priority: 'medium'
  },
  {
    id: 'MRF_2024_006',
    title: 'Client Appreciation Dinner',
    description: 'Exclusive dinner event for top-tier clients and key stakeholders',
    status: 'active',
    lastModified: new Date('2024-12-19T13:30:00Z'),
    createdBy: 'client.relations@groupize.com',
    attendeeCount: 30,
    estimatedBudget: 15000,
    eventDate: new Date('2025-02-14T19:00:00Z'),
    category: 'client-relations',
    priority: 'high'
  },
  {
    id: 'MRF_2024_007',
    title: 'All-Hands Meeting',
    description: 'Company-wide quarterly meeting with CEO presentation and departmental updates',
    status: 'draft',
    lastModified: new Date('2024-12-21T15:10:00Z'),
    createdBy: 'communications@groupize.com',
    attendeeCount: 300,
    estimatedBudget: 20000,
    eventDate: new Date('2025-03-15T14:00:00Z'),
    category: 'company-wide',
    priority: 'high'
  },
  {
    id: 'MRF_2024_008',
    title: 'New Employee Orientation',
    description: 'Onboarding session for new hires - company overview and department introductions',
    status: 'active',
    lastModified: new Date('2024-12-23T08:45:00Z'),
    createdBy: 'hr.onboarding@groupize.com',
    attendeeCount: 15,
    estimatedBudget: 3000,
    eventDate: new Date('2025-01-08T09:00:00Z'),
    category: 'onboarding',
    priority: 'low'
  }
];

/**
 * GET /api/mrf-forms
 * Fetch available MRF forms with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    let filteredForms = [...sampleMRFForms];

    // Filter by status
    if (status && status !== 'all') {
      filteredForms = filteredForms.filter(form => form.status === status);
    }

    // Filter by category
    if (category && category !== 'all') {
      filteredForms = filteredForms.filter(form => form.category === category);
    }

    // Search by title or description
    if (search) {
      const searchLower = search.toLowerCase();
      filteredForms = filteredForms.filter(form => 
        form.title.toLowerCase().includes(searchLower) ||
        form.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort by last modified (most recent first)
    filteredForms.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    // Apply limit
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        filteredForms = filteredForms.slice(0, limitNum);
      }
    }

    // Add metadata
    const metadata = {
      total: sampleMRFForms.length,
      filtered: filteredForms.length,
      categories: [...new Set(sampleMRFForms.map(form => form.category))],
      statuses: [...new Set(sampleMRFForms.map(form => form.status))]
    };

    return NextResponse.json({
      success: true,
      data: filteredForms,
      metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching MRF forms:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch MRF forms',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mrf-forms
 * Create a new MRF form
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { title, description, category } = body;
    if (!title || !description || !category) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: title, description, category' 
        },
        { status: 400 }
      );
    }

    // Generate new MRF form
    const newMRF: MRFForm = {
      id: `MRF_${new Date().getFullYear()}_${String(sampleMRFForms.length + 1).padStart(3, '0')}`,
      title,
      description,
      category,
      status: 'draft',
      lastModified: new Date(),
      createdBy: body.createdBy || 'user@groupize.com',
      attendeeCount: body.attendeeCount,
      estimatedBudget: body.estimatedBudget,
      eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
      priority: body.priority || 'medium'
    };

    // In a real application, save to database
    sampleMRFForms.push(newMRF);

    return NextResponse.json({
      success: true,
      data: newMRF,
      message: 'MRF form created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating MRF form:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create MRF form',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}