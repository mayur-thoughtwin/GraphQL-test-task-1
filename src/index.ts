import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import depthLimit from 'graphql-depth-limit';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { createContext } from './context';
import { getUserFromToken } from './middleware/auth';
import 'dotenv/config';

const PORT = parseInt(process.env.PORT || '4000', 10);

const MAX_QUERY_DEPTH = 10;

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    csrfPrevention: false,
    validationRules: [depthLimit(MAX_QUERY_DEPTH)],
    formatError: (formattedError) => {
      console.error('GraphQL Error:', formattedError);

      if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return {
          message: 'An internal error occurred',
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };
      }

      return formattedError;
    },
    plugins: [
      {
        async requestDidStart() {
          const start = Date.now();
          return {
            async willSendResponse() {
              const duration = Date.now() - start;
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
