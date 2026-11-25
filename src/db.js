import { MongoClient } from 'mongodb';

let dbPromise;

export function getDb() {
  dbPromise ??= connect();
  return dbPromise;
}

async function connect() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db();
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  return db;
}

export async function collections() {
  const db = await getDb();
  return {
    users: db.collection('users'),
    sessions: db.collection('sessions'),
    games: db.collection('games'),
  };
}
