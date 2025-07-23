# MongoDB Connection Utility

This utility provides a flexible way to connect to MongoDB Atlas and access any database within your cluster.

## Setup

1. **Install MongoDB driver** (already done):
   ```bash
   npm install mongodb
   ```

2. **Set up environment variable**:
   Create a `.env.local` file in your project root and add:
   ```
   MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/
   ```

   Replace with your actual MongoDB Atlas connection string.

## Usage

### Basic Usage

```typescript
import { getDatabase } from '@/lib/mongodb';

// Connect to any database
const db = await getDatabase('your-database-name');
const collection = db.collection('your-collection-name');

// Perform operations
const documents = await collection.find({}).toArray();
```

### Multiple Databases

```typescript
import { getDatabase } from '@/lib/mongodb';

// Connect to different databases
const usersDb = await getDatabase('users');
const productsDb = await getDatabase('products');
const logsDb = await getDatabase('logs');

// Use collections from different databases
const usersCollection = usersDb.collection('users');
const productsCollection = productsDb.collection('products');
```

### API Route Example

```typescript
// app/api/users/route.ts
import { getDatabase } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await getDatabase('users');
    const collection = db.collection('users');
    
    const users = await collection.find({}).toArray();
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
```

## Features

- **Connection Pooling**: Efficiently manages database connections
- **Error Handling**: Proper error handling and logging
- **Graceful Shutdown**: Automatically closes connections on app shutdown
- **TypeScript Support**: Full TypeScript support with proper types
- **Flexible**: Connect to any database by name

## Available Functions

- `getDatabase(dbName: string)`: Get a database instance by name
- `closeConnection()`: Manually close the MongoDB connection
- `getClientInstance()`: Get the current MongoDB client instance

## Environment Variables

- `MONGODB_URI`: Your MongoDB Atlas connection string

## Error Handling

The utility includes comprehensive error handling:
- Validates environment variables
- Handles connection failures
- Provides detailed error messages
- Graceful shutdown on process termination 