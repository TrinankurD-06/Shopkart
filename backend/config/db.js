import mongoose from "mongoose";

// Cached across invocations so a warm serverless function reuses its connection
let connection = null;

const connectDB = () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    return Promise.reject(new Error("MONGO_URI is missing in backend/.env"));
  }

  if (!connection) {
    connection = mongoose.connect(uri).then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    });
    // Let the next request retry instead of caching a failed connection
    connection.catch(() => {
      connection = null;
    });
  }

  return connection;
};

export default connectDB;
