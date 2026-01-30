import { NextRequest, NextResponse } from 'next/server';

// Increase timeout for AI queries (can take several minutes)
export const maxDuration = 300; // 5 minutes

const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:4000/graphql';

export async function POST(request: NextRequest) {
  try {
    console.log('[Next.js GraphQL Proxy] Received request');
    
    // Get the request body
    const body = await request.text();
    console.log('[Next.js GraphQL Proxy] Request body length:', body.length);
    
    // Forward the request to the GraphQL server
    const startTime = Date.now();
    const graphqlResponse = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()),
      },
      body: body,
    });
    
    const duration = Date.now() - startTime;
    console.log(`[Next.js GraphQL Proxy] GraphQL server responded in ${duration}ms with status ${graphqlResponse.status}`);
    
    // Check if the response is ok
    if (!graphqlResponse.ok) {
      const errorText = await graphqlResponse.text();
      console.error('[Next.js GraphQL Proxy] GraphQL server error:', graphqlResponse.status, errorText.substring(0, 500));
      return NextResponse.json(
        {
          errors: [{
            message: `GraphQL server error: ${graphqlResponse.status}`,
            extensions: {
              code: 'GRAPHQL_SERVER_ERROR',
              status: graphqlResponse.status,
              details: errorText.substring(0, 500)
            }
          }]
        },
        { status: graphqlResponse.status }
      );
    }
    
    // Get the response body - handle large responses
    let responseText: string;
    try {
      responseText = await graphqlResponse.text();
      console.log(`[Next.js GraphQL Proxy] Response body length: ${responseText.length} bytes`);
    } catch (readError: any) {
      console.error('[Next.js GraphQL Proxy] Failed to read response body:', readError);
      return NextResponse.json(
        {
          errors: [{
            message: 'Failed to read response from GraphQL server',
            extensions: {
              code: 'RESPONSE_READ_ERROR',
              originalError: readError?.message || String(readError)
            }
          }]
        },
        { status: 500 }
      );
    }
    
    // Parse to check for GraphQL errors
    let responseJson: any;
    try {
      responseJson = JSON.parse(responseText);
      console.log(`[Next.js GraphQL Proxy] Parsed JSON successfully, hasData: ${!!responseJson.data}, hasErrors: ${!!responseJson.errors}`);
    } catch (parseError: any) {
      console.error('[Next.js GraphQL Proxy] Failed to parse GraphQL response as JSON:', parseError);
      console.error('[Next.js GraphQL Proxy] Response preview (first 1000 chars):', responseText.substring(0, 1000));
      return NextResponse.json(
        {
          errors: [{
            message: 'Invalid JSON response from GraphQL server',
            extensions: {
              code: 'INVALID_RESPONSE',
              details: responseText.substring(0, 500)
            }
          }]
        },
        { status: 500 }
      );
    }
    
    // Check for GraphQL errors in the response
    if (responseJson.errors && responseJson.errors.length > 0) {
      console.error('[Next.js GraphQL Proxy] GraphQL errors in response:', responseJson.errors);
    }
    
    console.log('[Next.js GraphQL Proxy] Successfully proxied response, returning to client');
    
    // Return the response with the same content type
    try {
      const finalResponse = NextResponse.json(responseJson, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('[Next.js GraphQL Proxy] Response created successfully');
      return finalResponse;
    } catch (responseError: any) {
      console.error('[Next.js GraphQL Proxy] Failed to create NextResponse:', responseError);
      console.error('[Next.js GraphQL Proxy] Response error stack:', responseError?.stack);
      return NextResponse.json(
        {
          errors: [{
            message: 'Failed to create response',
            extensions: {
              code: 'RESPONSE_CREATION_ERROR',
              originalError: responseError?.message || String(responseError)
            }
          }]
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('[Next.js GraphQL Proxy] Error proxying request:', error);
    console.error('[Next.js GraphQL Proxy] Error stack:', error?.stack);
    
    return NextResponse.json(
      {
        errors: [{
          message: 'Failed to proxy request to GraphQL server',
          extensions: {
            code: 'PROXY_ERROR',
            originalError: error?.message || String(error)
          }
        }]
      },
      { status: 500 }
    );
  }
}
