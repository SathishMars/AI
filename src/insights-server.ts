import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { typeDefs, resolvers } from '@/app/api/graphql/schema';

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
            debug: (...args) => console.log('[GraphQL Yoga Debug]', ...args),
            info: (...args) => console.log('[GraphQL Yoga Info]', ...args),
            warn: (...args) => console.warn('[GraphQL Yoga Warn]', ...args),
            error: (...args) => console.error('[GraphQL Yoga Error]', ...args),
        },
    });

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
    console.log(`🚀 Standalone GraphQL Yoga Server running on http://localhost:${port}/graphql`);
    console.log(`💓 Health check available at http://localhost:${port}/health`);
}

startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
