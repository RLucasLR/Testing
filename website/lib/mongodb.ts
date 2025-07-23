import { MongoClient, Db } from 'mongodb';

// Global variable to store the MongoDB client connection
let client: MongoClient | null = null;

/**
 * Get or create a MongoDB client connection
 * @returns Promise<MongoClient>
 */
async function getClient(): Promise<MongoClient> {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    try {
      await client.connect();
      console.log('Connected to MongoDB Atlas');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  return client;
}

/**
 * Get a database instance by name
 * @param dbName - The name of the database to connect to
 * @returns Promise<Db>
 */
export async function getDatabase(dbName: string): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}

/**
 * Close the MongoDB client connection
 * This should be called when the application shuts down
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    console.log('MongoDB connection closed');
  }
}

/**
 * Get the current MongoDB client instance
 * @returns Promise<MongoClient | null>
 */
export async function getClientInstance(): Promise<MongoClient | null> {
  if (!client) {
    return await getClient();
  }
  return client;
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
}); 