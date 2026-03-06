import { MongoClient } from 'mongodb';
import { logger } from './logger';
import { ensureDbIndexes } from './dbIndexes';

if (!process.env.MONGODB_URI) {
  const error = 'MONGODB_URI environment variable is not set. Please add it to .env.local';
  logger.error(error, new Error(error));
  throw new Error(error);
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 45000,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient>;
let indexesEnsuredPromise: Promise<void> | null = null;

async function ensureIndexesOnce(client: MongoClient) {
  if (!indexesEnsuredPromise) {
    indexesEnsuredPromise = ensureDbIndexes(client.db('AdminDB'));
  }

  await indexesEnsuredPromise;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client
      .connect()
      .then(() => {
        logger.info('MongoDB connected in development', 'DB_CONNECTION');
        return client!;
      })
      .catch((error) => {
        logger.error('MongoDB connection failed', error, 'DB_CONNECTION');
        throw error;
      });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, create a new connection
  client = new MongoClient(uri, options);
  clientPromise = client
    .connect()
    .then(() => {
      logger.info('MongoDB connected in production', 'DB_CONNECTION');
      return client!;
    })
    .catch((error) => {
      logger.error('MongoDB connection failed', error, 'DB_CONNECTION');
      throw error;
    });
}

const readyClientPromise = clientPromise.then(async (connectedClient) => {
  await ensureIndexesOnce(connectedClient);
  return connectedClient;
});

export default readyClientPromise;

/**
 * Helper function for getting database connection
 */
export async function connectToDatabase() {
  try {
    const client = await readyClientPromise;
    return {
      client,
      db: client.db('AdminDB'),
    };
  } catch (error) {
    logger.error('Failed to connect to database', error, 'DB_CONNECTION');
    throw error;
  }
}