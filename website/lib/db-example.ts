import { getDatabase } from './mongodb';

/**
 * Example function to demonstrate how to use the MongoDB connection
 * to connect to different databases
 */

// Example: Connect to a users database
export async function getUsersDatabase() {
  return await getDatabase('users');
}

// Example: Connect to a products database
export async function getProductsDatabase() {
  return await getDatabase('products');
}

// Example: Connect to a logs database
export async function getLogsDatabase() {
  return await getDatabase('logs');
}

// Example: Generic function to get any database
export async function getAnyDatabase(dbName: string) {
  return await getDatabase(dbName);
}

// Example usage in an API route or server function
export async function exampleUsage() {
  try {
    // Get different database instances
    const usersDb = await getUsersDatabase();
    const productsDb = await getProductsDatabase();
    
    // Use the databases
    const usersCollection = usersDb.collection('users');
    const productsCollection = productsDb.collection('products');
    
    // Example operations
    const user = await usersCollection.findOne({ email: 'example@email.com' });
    const products = await productsCollection.find({ category: 'electronics' }).toArray();
    
    return { user, products };
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
} 