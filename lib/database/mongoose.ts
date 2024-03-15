/**
 * Connects to MongoDB database using Mongoose.
 * Caches connection so it is reused.
 * Throws error if MONGO_URI env var is not defined.
 */
import mongoose, { Mongoose } from 'mongoose'

const MONGODB_URL = process.env.MONGO_URI

interface MongooseConnection {
	connection: Mongoose | null
	promise: Promise<Mongoose> | null
}

let cached: MongooseConnection = (global as any).mongoose

if (!cached) {
	cached = (global as any).mongoose = { connection: null, promise: null }
}

export const connectToDatabase = async () => {
	if (cached.connection) return cached.connection

	if (!MONGODB_URL) throw new Error('MONGO_URI is not defined or Missing')

	cached.promise =
		cached.promise ||
		mongoose.connect(MONGODB_URL, {
			dbName: 'pixelmorpher',
			bufferCommands: false,
		})

	cached.connection = await cached.promise

	return cached.connection
}
