// INSIGHTS-SPECIFIC: GraphQL API endpoint
import { createYoga } from "graphql-yoga";
import { typeDefs, resolvers } from "./schema";
import { createSchema } from "graphql-yoga";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = createSchema({
    typeDefs,
    resolvers,
});

const yoga = createYoga({
    schema,
    graphqlEndpoint: "/api/graphql",
    fetchAPI: { Response },
    context: async ({ request }: { request: Request }) => {
        return {
            user: null, // later: attach logged-in user id/email
            requestId: request.headers.get("x-request-id") ??
                (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7)),
        };
    },
});

export async function GET(request: Request) {
    return yoga(request);
}

export async function POST(request: Request) {
    return yoga(request);
}

