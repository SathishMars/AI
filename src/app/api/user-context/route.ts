// src/app/api/user-context/route.ts
import { NextRequest, NextResponse } from 'next/server';

export interface UserContext {
  id: string;
  profile: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
      description: string;
      value?: string | number | boolean | Date | string[] | object;
      examples?: string[];
      category: 'basic' | 'contact' | 'organizational' | 'preferences' | 'permissions';
    };
  };
  metadata: {
    lastUpdated: string;
    source: string;
    permissions: string[];
  };
}

// Sample user context with comprehensive user variables
const sampleUserContext: UserContext = {
  id: 'user_current_session',
  profile: {
    // Basic Information
    firstName: {
      type: 'string',
      description: 'User first name',
      value: 'John',
      examples: ['John', 'Sarah', 'Michael'],
      category: 'basic'
    },
    lastName: {
      type: 'string',
      description: 'User last name', 
      value: 'Doe',
      examples: ['Doe', 'Smith', 'Johnson'],
      category: 'basic'
    },
    fullName: {
      type: 'string',
      description: 'User full name',
      value: 'John Doe',
      examples: ['John Doe', 'Sarah Smith', 'Michael Johnson'],
      category: 'basic'
    },
    displayName: {
      type: 'string',
      description: 'User display name or preferred name',
      value: 'John D.',
      examples: ['John D.', 'Sarah S.', 'Mike J.'],
      category: 'basic'
    },
    employeeId: {
      type: 'string',
      description: 'Employee ID or badge number',
      value: 'EMP-12345',
      examples: ['EMP-12345', 'BADGE-67890', 'ID-54321'],
      category: 'basic'
    },
    
    // Contact Information
    email: {
      type: 'string',
      description: 'Primary email address',
      value: 'john.doe@company.com',
      examples: ['john.doe@company.com', 'sarah.smith@company.com'],
      category: 'contact'
    },
    alternateEmail: {
      type: 'string',
      description: 'Alternate or personal email',
      value: 'john.personal@email.com',
      examples: ['john.personal@email.com', 'backup@email.com'],
      category: 'contact'
    },
    phone: {
      type: 'string',
      description: 'Primary phone number',
      value: '+1-555-0123',
      examples: ['+1-555-0123', '+1-555-9876', '+44-20-1234-5678'],
      category: 'contact'
    },
    mobilePhone: {
      type: 'string',
      description: 'Mobile phone number',
      value: '+1-555-0124',
      examples: ['+1-555-0124', '+1-555-9877'],
      category: 'contact'
    },
    workLocation: {
      type: 'string',
      description: 'Primary work location',
      value: 'New York Office',
      examples: ['New York Office', 'San Francisco HQ', 'Remote', 'London Office'],
      category: 'contact'
    },
    
    // Organizational Information
    department: {
      type: 'string',
      description: 'Department or division',
      value: 'Engineering',
      examples: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'],
      category: 'organizational'
    },
    title: {
      type: 'string',
      description: 'Job title or position',
      value: 'Senior Software Engineer',
      examples: ['Senior Software Engineer', 'Product Manager', 'Marketing Director'],
      category: 'organizational'
    },
    level: {
      type: 'string',
      description: 'Job level or grade',
      value: 'L5',
      examples: ['L3', 'L4', 'L5', 'L6', 'Manager', 'Director'],
      category: 'organizational'
    },
    manager: {
      type: 'string',
      description: 'Direct manager name',
      value: 'Jane Smith',
      examples: ['Jane Smith', 'Bob Johnson', 'Alice Wilson'],
      category: 'organizational'
    },
    managerEmail: {
      type: 'string',
      description: 'Direct manager email',
      value: 'jane.smith@company.com',
      examples: ['jane.smith@company.com', 'bob.johnson@company.com'],
      category: 'organizational'
    },
    team: {
      type: 'string',
      description: 'Team or squad name',
      value: 'Platform Engineering',
      examples: ['Platform Engineering', 'Frontend Team', 'Data Science'],
      category: 'organizational'
    },
    costCenter: {
      type: 'string',
      description: 'Cost center or budget code',
      value: 'CC-ENG-001',
      examples: ['CC-ENG-001', 'CC-MKT-002', 'CC-HR-003'],
      category: 'organizational'
    },
    region: {
      type: 'string',
      description: 'Geographic region',
      value: 'North America',
      examples: ['North America', 'Europe', 'Asia Pacific', 'Latin America'],
      category: 'organizational'
    },
    country: {
      type: 'string',
      description: 'Country location',
      value: 'United States',
      examples: ['United States', 'United Kingdom', 'Germany', 'Japan'],
      category: 'organizational'
    },
    timeZone: {
      type: 'string',
      description: 'User timezone',
      value: 'America/New_York',
      examples: ['America/New_York', 'Europe/London', 'Asia/Tokyo'],
      category: 'organizational'
    },
    
    // Dates and Duration
    startDate: {
      type: 'date',
      description: 'Employment start date',
      value: '2022-03-15',
      examples: ['2022-03-15', '2021-01-10', '2023-06-01'],
      category: 'basic'
    },
    yearsOfService: {
      type: 'number',
      description: 'Years of service at company',
      value: 2.5,
      examples: ['1.2', '3.5', '5.0'],
      category: 'basic'
    },
    
    // Preferences
    preferredLanguage: {
      type: 'string',
      description: 'Preferred language for communications',
      value: 'en-US',
      examples: ['en-US', 'es-ES', 'fr-FR', 'de-DE'],
      category: 'preferences'
    },
    workingHours: {
      type: 'string',
      description: 'Standard working hours',
      value: '09:00-17:00',
      examples: ['09:00-17:00', '08:00-16:00', '10:00-18:00'],
      category: 'preferences'
    },
    workDays: {
      type: 'array',
      description: 'Standard working days',
      value: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      examples: ['["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'],
      category: 'preferences'
    },
    
    // Permissions and Roles
    roles: {
      type: 'array',
      description: 'User roles and permissions',
      value: ['employee', 'workflow-creator'],
      examples: ['["employee", "manager"]', '["admin", "workflow-creator"]'],
      category: 'permissions'
    },
    securityClearance: {
      type: 'string',
      description: 'Security clearance level',
      value: 'Standard',
      examples: ['Standard', 'Confidential', 'Secret', 'Top Secret'],
      category: 'permissions'
    },
    accessLevel: {
      type: 'string',
      description: 'System access level',
      value: 'User',
      examples: ['User', 'Power User', 'Admin', 'Super Admin'],
      category: 'permissions'
    },
    canApprove: {
      type: 'boolean',
      description: 'Can approve requests',
      value: false,
      examples: ['true', 'false'],
      category: 'permissions'
    },
    maxApprovalAmount: {
      type: 'number',
      description: 'Maximum approval amount (if applicable)',
      value: 1000,
      examples: ['500', '1000', '5000', '10000'],
      category: 'permissions'
    }
  },
  metadata: {
    lastUpdated: '2025-09-30T12:00:00Z',
    source: 'Active Directory',
    permissions: ['read-profile', 'update-preferences']
  }
};

export async function GET(request: NextRequest) {
  try {
    // In a real application, you might:
    // 1. Get user ID from authentication token
    // 2. Fetch user data from HR system, Active Directory, etc.
    // 3. Apply privacy filters based on requestor permissions
    // 4. Cache results for performance
    
    const searchParams = request.nextUrl.searchParams;
    const includeValues = searchParams.get('includeValues') !== 'false';
    const category = searchParams.get('category'); // filter by category
    
    const userContext = { ...sampleUserContext };
    
    // Filter by category if specified
    if (category) {
      const filteredProfile: typeof userContext.profile = {};
      Object.entries(userContext.profile).forEach(([key, value]) => {
        if (value.category === category) {
          filteredProfile[key] = value;
        }
      });
      userContext.profile = filteredProfile;
    }
    
    // Optionally remove actual values for privacy
    if (!includeValues) {
      Object.keys(userContext.profile).forEach(key => {
        delete userContext.profile[key].value;
      });
    }
    
    return NextResponse.json({
      success: true,
      data: userContext,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user context:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch user context',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // In a real application, you might:
    // 1. Validate user permissions to update profile
    // 2. Update user preferences in database
    // 3. Sync with HR systems if needed
    // 4. Log audit trail
    
    return NextResponse.json({
      success: true,
      message: 'User preferences updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user context:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user context',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}