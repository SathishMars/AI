import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { typeDefs, resolvers } from '@/app/api/graphql/schema';
import { logger } from '@/app/lib/logger';

async function startServer() {
    const app = express();

    // Create GraphQL schema
    const schema = makeExecutableSchema({
        typeDefs,
        resolvers,
    });

    // Initialize GraphQL Yoga
    const yoga = createYoga({
        schema,
        context: async ({ request }) => {
            const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
            return {
                requestId: requestId as string,
            };
        },
        logging: {
            debug: (...args) => logger.debugGraphQL('[GraphQL Yoga Debug]', ...args),
            info: (...args) => logger.info('[GraphQL Yoga Info]', ...args),
            warn: (...args) => logger.warn('[GraphQL Yoga Warn]', ...args),
            error: (...args) => logger.error('[GraphQL Yoga Error]', ...args),
        },
        // Add error handling for serialization issues
        maskedErrors: false, // Show full error details for debugging
    });
    
    // Wrap Yoga's requestListener to catch serialization errors
    const originalRequestListener = yoga.requestListener;
    yoga.requestListener = async (req: any, res: any) => {
        try {
            await originalRequestListener(req, res);
        } catch (error: any) {
            logger.error('[GraphQL Yoga] Request listener error:', error);
            logger.debugGraphQL('[GraphQL Yoga] Error stack:', error?.stack);
            if (!res.headersSent) {
                res.status(500).json({
                    errors: [{
                        message: 'Internal server error during response serialization',
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            originalError: error?.message || String(error)
                        }
                    }]
                });
            }
        }
    };

    // CORS middleware
    app.use(
        cors<cors.CorsRequest>({
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true,
        })
    );

    // Parse JSON body
    app.use(express.json());

    // GraphQL endpoint - use Yoga's requestListener directly
    app.use('/graphql', yoga.requestListener);

    // Health check endpoint
    app.get('/health', (req: express.Request, res: express.Response) => {
        res.json({ status: 'ok', service: 'insights-backend' });
    });

    const port = parseInt(process.env.PORT || "4000");
    const httpServer = http.createServer(app);

    await new Promise<void>((resolve) => httpServer.listen({ port, host: '0.0.0.0' }, resolve));
    logger.info(`🚀 Standalone GraphQL Yoga Server running on http://localhost:${port}/graphql`);
    logger.info(`💓 Health check available at http://localhost:${port}/health`);
}

startServer().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});
