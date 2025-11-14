import { NextResponse } from 'next/server';
import { env } from '@/app/lib/env';

/**
 * Health check endpoint for Docker container monitoring
 * Returns 200 OK if the application is running
 */
export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv
    },
    { status: 200 }
  );
}
