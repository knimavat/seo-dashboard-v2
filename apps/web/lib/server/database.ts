import mongoose from 'mongoose';
import { getEnv } from './env';

declare global {
  var __mongoose_conn: Promise<typeof mongoose> | undefined;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (global.__mongoose_conn) {
    return global.__mongoose_conn;
  }

  const env = getEnv();
  global.__mongoose_conn = mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  });

  return global.__mongoose_conn;
}

export async function ensureDB() {
  await connectDB();
}
