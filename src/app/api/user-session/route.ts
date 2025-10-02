// src/app/api/user-session/route.ts

import { NextResponse } from 'next/server';

/**
 * Unified User Session API Endpoint
 * Provides complete user context including user, account, and organization data
 * This replaces the separate /api/user and /api/account endpoints
 */

export async function GET() {
  try {
    // TODO: Extract user ID from JWT token and fetch real data
    // For now, return comprehensive demo data
    
    // Demo Organizations
    const demoOrganizations = [
      {
        id: 'main-org',
        name: 'Main Organization',
        type: 'department' as const,
        description: 'Primary organizational unit',
        settings: {
          workflowDefaults: {},
          permissions: {
            canCreateWorkflows: true,
            canEditSharedWorkflows: true,
            canPublishWorkflows: true,
            canManageUsers: false,
            canViewAnalytics: true,
            canExportData: true
          },
          features: {
            aiGeneration: true,
            advancedRules: true,
            customIntegrations: false,
            analyticsReporting: true,
            ssoIntegration: false,
            auditLogging: true
          }
        },
        metadata: {
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date(),
          createdBy: 'system'
        }
      }
    ];

    // Demo Account with Organizations
    const demoAccount = {
      id: 'groupize-demos',
      name: 'Groupize Demos',
      type: 'demo' as const,
      permissions: ['read', 'write', 'publish'],
      features: {
        workflowBuilder: true,
        aiGeneration: true,
        templateSharing: true
      },
      subscription: {
        plan: 'demo',
        status: 'active' as const
      },
      organizations: demoOrganizations
    };

    // Demo User
    const demoUser = {
      id: 'user-demo-123',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@groupize-demos.com',
        avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=1976d2&color=fff',
        phone: '+1 (555) 123-4567',
        timezone: 'America/New_York',
        locale: 'en-US',
        title: 'Event Manager',
        department: 'Operations'
      },
      preferences: {
        theme: 'light' as const,
        language: 'en',
        notifications: {
          email: true,
          push: true,
          workflowUpdates: true,
          systemAlerts: false
        },
        workflowDefaults: {
          autoSave: true,
          defaultView: 'visual' as const,
          showAdvancedOptions: false
        }
      },
      roles: [
        {
          id: 'role-workflow-editor',
          name: 'Workflow Editor',
          permissions: [
            'workflow.create',
            'workflow.edit',
            'workflow.view',
            'workflow.execute',
            'template.use'
          ],
          level: 'editor' as const,
          scope: 'organization' as const
        },
        {
          id: 'role-event-manager',
          name: 'Event Manager',
          permissions: [
            'event.create',
            'event.manage',
            'approval.request',
            'analytics.view'
          ],
          level: 'editor' as const,
          scope: 'organization' as const
        }
      ],
      status: 'active' as const,
      metadata: {
        createdAt: new Date('2024-01-15T08:00:00Z'),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 127
      }
    };

    // Demo Session
    const demoSession = {
      sessionId: 'session-demo-456',
      token: 'demo-jwt-token-placeholder',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      device: {
        type: 'web' as const,
        browser: 'Chrome',
        os: 'macOS',
        ip: '192.168.1.100'
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        user: demoUser,
        account: demoAccount,
        currentOrganization: demoOrganizations[0], // Default to first organization
        availableOrganizations: demoOrganizations,
        session: demoSession
      }
    });

  } catch (error) {
    console.error('User Session API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve user session information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}