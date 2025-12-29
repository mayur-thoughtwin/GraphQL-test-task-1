import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import depthLimit from 'graphql-depth-limit';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { createContext } from './context';
import { getUserFromToken } from './middleware/auth';
import 'dotenv/config';

const PORT = parseInt(process.env.PORT || '4000', 10);

// Query depth limit to prevent deeply nested queries (DoS protection)
const MAX_QUERY_DEPTH = 7;

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    // Validation rules for security
    validationRules: [depthLimit(MAX_QUERY_DEPTH)],
    // Format errors for better client experience
    formatError: (formattedError) => {
      // Log the error for debugging (in production, use proper logging)
      console.error('GraphQL Error:', formattedError);

      // Don't expose internal server errors to clients
      if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return {
          message: 'An internal error occurred',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };
      }

      return formattedError;
    },
    // Apollo Server plugins for performance monitoring
    plugins: [
      {
        async requestDidStart() {
          const start = Date.now();
          return {
            async willSendResponse() {
              const duration = Date.now() - start;
              // Log slow queries (> 1 second)
              if (duration > 1000) {
                console.warn(`Slow query detected: ${duration}ms`);
              }
            },
          };
        },
      },
    ],
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT },
    context: async ({ req }) => {
      const token = req.headers.authorization || '';
      const user = getUserFromToken(token);
      return createContext(user);
    },
  });

  console.log(`🚀 Server ready at ${url}`);
  console.log(`📊 GraphQL Playground available at ${url}`);
  console.log(`🔒 Query depth limit: ${MAX_QUERY_DEPTH} levels`);
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
