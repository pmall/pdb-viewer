import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to initialize the database client.')
}

const queryClient = postgres(databaseUrl)

export const db = drizzle(queryClient)
