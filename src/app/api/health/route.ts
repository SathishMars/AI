import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Docker container monitoring
 * Returns 200 OK if the application is running
 */
export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    },
    { status: 200 }
  );
}
