/**
 * Database Initialization API Route
 * 
 * POST /api/initialize
 * 
 * This endpoint initializes the database schema with all required collections and indexes.
 * It should be called once during deployment or manual setup, not on every request.
 * 
 * The route bypasses authentication to allow initialization without credentials.
 * In production, ensure this endpoint is only called during deployment/setup phases.
 * 
 * Response:
 * {
 *   success: boolean;
 *   appliedVersions: string[];
 *   skippedVersions: string[];
 *   failedVersions: string[];
 *   errors: string[];
 *   duration: number;
 *   message: string;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabaseSchema } from '@/app/utils/database-initialization';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Database initialization requested');

    const result = await initializeDatabaseSchema();

    if (result.success) {
      console.log('[API] Database initialization completed successfully');
      return NextResponse.json(
        {
          success: true,
          appliedVersions: result.appliedVersions,
          skippedVersions: result.skippedVersions,
          failedVersions: result.failedVersions,
          errors: result.errors,
          duration: result.duration,
          message: `Database initialization completed in ${result.duration}ms. Applied: ${result.appliedVersions.length}, Skipped: ${result.skippedVersions.length}`,
        },
        { status: 200 }
      );
    } else {
      console.warn('[API] Database initialization completed with errors');
      return NextResponse.json(
        {
          success: false,
          appliedVersions: result.appliedVersions,
          skippedVersions: result.skippedVersions,
          failedVersions: result.failedVersions,
          errors: result.errors,
          duration: result.duration,
          message: `Database initialization completed with errors. Errors: ${result.errors.join('; ')}`,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Database initialization failed:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        appliedVersions: [],
        skippedVersions: [],
        failedVersions: [],
        errors: [errorMessage],
        duration: 0,
        message: `Database initialization failed: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Database Initialization API',
      usage: 'POST /api/initialize to initialize the database',
      description:
        'This endpoint initializes the database schema with all required collections and indexes. ' +
        'It should be called once during deployment, not on every request.',
    },
    { status: 200 }
  );
}
