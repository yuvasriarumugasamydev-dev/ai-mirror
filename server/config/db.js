import mongoose from 'mongoose';

export const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_mirror';
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`[MongoDB Connected]: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    console.log('[Notice]: Server will continue with resilient memory cache fallback if MongoDB is unreachable.');
    return false;
  }
};
