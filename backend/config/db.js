import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/animalrescue';

    // Set up strict connection event listeners
    mongoose.connection.on('connected', () => {
      console.log(`[MongoDB] Connected Successfully: ${mongoose.connection.host}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB] Connection Error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected! Connection lost.');
    });

    console.log(`[MongoDB] Starting connection to ${URI}...`);
    
    // Attempt the connection without blindly assuming success
    await mongoose.connect(URI);

  } catch (error) {
    console.error(`[MongoDB] Fatal Initialization Error: ${error.message}`);
    // Optional: process.exit(1); depending on whether you want the server to fail immediately
  }
};

export default connectDB;
