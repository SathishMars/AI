// src/app/api/user-session/route.ts

import { NextResponse } from 'next/server';
import { getDemoSessionData } from './session-data';

/**
 * Unified User Session API Endpoint
 * Provides complete user context including user, account, and organization data
 * This replaces the separate /api/user and /api/account endpoints
 */

export async function GET() {
  try {
    // Use shared demo session data helper to avoid duplication
    const data = getDemoSessionData();

    return NextResponse.json({ success: true, data });

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