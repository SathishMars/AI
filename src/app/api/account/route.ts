// src/app/api/account/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Account Resolution API
 * 
 * GET /api/account - Get current user's account information
 * 
 * This endpoint resolves the current user's account based on authentication.
 * For now, it returns a default account until JWT integration is complete.
 */

export async function GET(request: NextRequest) {
  try {
    // TODO: In the future, extract account from JWT token
    // const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // const account = decoded.account;
    
    // For now, return default account for development
    const account = {
      id: 'groupize-demos',
      name: 'Groupize Demos',
      type: 'demo',
      permissions: ['read', 'write', 'publish'],
      features: {
        workflowBuilder: true,
        aiGeneration: true,
        templateSharing: true
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        account
      }
    });

  } catch (error) {
    console.error('Failed to resolve account:', error);

    return NextResponse.json(
      { 
        error: 'Failed to resolve account',
        code: 'ACCOUNT_RESOLUTION_ERROR'
      },
      { status: 500 }
    );
  }
}