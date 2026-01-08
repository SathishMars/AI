import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { typeDefs, resolvers } from '@/app/api/graphql/schema';

async function startServer() {
    const app = express();
    const httpServer = http.createServer(app);

    interface Context {
        requestId: string;
    }

    // Initialize Apollo Server
    const server = new ApolloServer<Context>({
        typeDefs,
        resolvers,
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    });

    // Start Apollo Server
    await server.start();

    // Use Express middleware for Apollo
    app.use(
        '/graphql',
        cors<cors.CorsRequest>({
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true,
        }),
        express.json(),
        expressMiddleware(server, {
            context: async ({ req }: { req: express.Request }) => ({
                requestId: (req.headers["x-request-id"] as string) || crypto.randomUUID(),
            }),
        }),
    );

    // Health check endpoint
    app.get('/health', (req: express.Request, res: express.Response) => {
        res.json({ status: 'ok', service: 'insights-backend' });
    });

    const port = parseInt(process.env.PORT || "4000");

    await new Promise<void>((resolve) => httpServer.listen({ port, host: '0.0.0.0' }, resolve));
    console.log(`🚀 Standalone Apollo Server running on http://localhost:${port}/graphql`);
    console.log(`💓 Health check available at http://localhost:${port}/health`);
}

startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
