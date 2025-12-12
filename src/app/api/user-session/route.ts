// src/app/api/user-session/route.ts

import { NextResponse } from 'next/server';
import { verifySession } from '@/app/lib/dal';
import { mergeSessionWithBase } from './session-data';

/**
 * Unified User Session API Endpoint
 * Provides complete user context including user, account, and organization data
 * This replaces the separate /api/user and /api/account endpoints
 * 
 * User data comes from the verified JWT token claims, merged with base structure
 */

export async function GET() {
  try {
    const session = await verifySession();
    
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }
    
    const data = mergeSessionWithBase(session);

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('[user-session] Error', error);
    
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