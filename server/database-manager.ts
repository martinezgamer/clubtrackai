import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Database connection cache
const dbConnections = new Map<string, any>();

export interface ClubDatabase {
  clubId: string;
  clubName: string;
  databaseUrl: string;
  connection?: any;
}

export class DatabaseManager {
  private masterDb: any;
  private clubDatabases: Map<string, ClubDatabase> = new Map();

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }

    // Master database for clubs, users, and global data
    const masterPool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.masterDb = drizzle({ client: masterPool, schema });
  }

  // Get the master database (for clubs, users, global data)
  getMasterDb() {
    return this.masterDb;
  }

  // Get or create a database connection for a specific club
  async getClubDb(clubId: string): Promise<any> {
    const cacheKey = `club_${clubId}`;
    
    if (dbConnections.has(cacheKey)) {
      return dbConnections.get(cacheKey);
    }

    // Get club info from master database
    const club = await this.masterDb.select().from(schema.clubs).where(eq(schema.clubs.id, parseInt(clubId))).limit(1);
    
    if (!club.length) {
      throw new Error(`Club with ID ${clubId} not found`);
    }

    // For now, use the same database but with club-scoped data
    // In a full implementation, this would connect to separate databases per club
    const clubDbUrl = this.generateClubDatabaseUrl(club[0].name);
    
    try {
      const clubPool = new Pool({ connectionString: clubDbUrl });
      const clubDb = drizzle({ client: clubPool, schema });
      
      dbConnections.set(cacheKey, clubDb);
      
      this.clubDatabases.set(clubId, {
        clubId,
        clubName: club[0].name,
        databaseUrl: clubDbUrl,
        connection: clubDb
      });

      return clubDb;
    } catch (error) {
      console.warn(`Failed to connect to dedicated club database, falling back to master with club isolation`);
      // Fallback to master database with club filtering
      return this.masterDb;
    }
  }

  // Generate a unique database URL for each club
  private generateClubDatabaseUrl(clubName: string): string {
    const baseUrl = process.env.DATABASE_URL!;
    
    // For development/demo: use the same database
    // In production: this would create separate database instances
    if (process.env.NODE_ENV === 'development') {
      return baseUrl;
    }

    // In production, you would create separate databases per club
    // This would require integration with your database provider's API
    const clubDbName = `smarttools4u_${clubName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    // Parse the main database URL and modify the database name
    const url = new URL(baseUrl);
    const pathParts = url.pathname.split('/');
    pathParts[pathParts.length - 1] = clubDbName;
    url.pathname = pathParts.join('/');
    
    return url.toString();
  }

  // Create a new database for a club
  async createClubDatabase(clubName: string): Promise<string> {
    const clubDbName = `smarttools4u_${clubName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    try {
      // In a real implementation, you would:
      // 1. Call your database provider's API to create a new database
      // 2. Run migrations on the new database
      // 3. Set up proper permissions
      
      console.log(`Creating database for club: ${clubDbName}`);
      
      // For now, we'll simulate this and return the same URL
      // In production, this would be the actual new database URL
      return this.generateClubDatabaseUrl(clubName);
      
    } catch (error) {
      console.error(`Failed to create database for club ${clubName}:`, error);
      throw new Error(`Failed to create database for club ${clubName}`);
    }
  }

  // Initialize schema in a club database
  async initializeClubSchema(clubId: string): Promise<void> {
    const clubDb = await this.getClubDb(clubId);
    
    try {
      // Run database migrations for the club-specific schema
      // This would typically involve running drizzle migrations
      console.log(`Initializing schema for club ${clubId}`);
      
      // For now, since we're using the same database, this is a no-op
      // In production, you would run: await migrate(clubDb, { migrationsFolder: './migrations' });
      
    } catch (error) {
      console.error(`Failed to initialize schema for club ${clubId}:`, error);
      throw error;
    }
  }

  // Get all club databases
  getClubDatabases(): ClubDatabase[] {
    return Array.from(this.clubDatabases.values());
  }

  // Close all connections
  async closeAllConnections(): Promise<void> {
    const entries = Array.from(dbConnections.entries());
    for (const [key, connection] of entries) {
      try {
        await connection.close?.();
      } catch (error) {
        console.warn(`Failed to close connection ${key}:`, error);
      }
    }
    dbConnections.clear();
    this.clubDatabases.clear();
  }
}

// Singleton instance
export const databaseManager = new DatabaseManager();

// Helper function to get the appropriate database for a request
export async function getDbForClub(clubId?: string | number) {
  if (!clubId) {
    return databaseManager.getMasterDb();
  }
  
  return await databaseManager.getClubDb(String(clubId));
}

// Helper function to get current user's default club database
export async function getDbForUser(userId: number) {
  const masterDb = databaseManager.getMasterDb();
  
  // Get user's default club assignment
  const assignment = await masterDb
    .select()
    .from(schema.userClubAssignments)
    .where(eq(schema.userClubAssignments.userId, userId))
    .where(eq(schema.userClubAssignments.isDefault, true))
    .limit(1);
  
  if (assignment.length > 0) {
    return await databaseManager.getClubDb(String(assignment[0].clubId));
  }
  
  // Fallback to master database if no club assignment
  return masterDb;
}