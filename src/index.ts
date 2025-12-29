import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { createContext } from './context';
import { getUserFromToken } from './middleware/auth';
import 'dotenv/config';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
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
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
