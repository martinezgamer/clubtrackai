import { db } from '../db';
import { users, userRoles, clubs, userClubAssignments, type InsertUser, type InsertClub, type InsertUserRole } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export class UserManagementService {
  // Initialize default data
  async initializeDefaults() {
    try {
      // Create default roles if they don't exist
      const existingRoles = await db.select().from(userRoles);
      
      if (existingRoles.length === 0) {
        const defaultRoles = [
          {
            name: 'super_admin',
            displayName: 'Super Admin',
            description: 'Full system access across all clubs',
            permissions: ['*'], // All permissions
          },
          {
            name: 'manager',
            displayName: 'Manager',
            description: 'Manage club operations, staff, and dancers',
            permissions: [
              'contacts.view',
              'contacts.create',
              'contacts.edit',
              'contacts.delete',
              'calendar.view',
              'calendar.create',
              'calendar.edit',
              'forms.view',
              'forms.create',
              'forms.edit',
              'memory.view',
              'memory.create',
              'sales.view',
              'sales.create',
              'chat.access'
            ],
          },
          {
            name: 'front_door',
            displayName: 'Front Door / Greeter',
            description: 'Manage entry, VIP lists, and basic club info',
            permissions: [
              'contacts.view_dancers',
              'calendar.view_today',
              'chat.access_basic'
            ],
          },
          {
            name: 'bartender',
            displayName: 'Bartender / Server',
            description: 'Manage F&B, inventory, and shift info',
            permissions: [
              'sales.view_inventory',
              'sales.create_transaction',
              'calendar.view_own_shifts',
              'chat.access_basic'
            ],
          },
          {
            name: 'dancer',
            displayName: 'Dancer',
            description: 'Access own schedule and club announcements',
            permissions: [
              'calendar.view_own',
              'contacts.view_own',
              'chat.access_basic'
            ],
          }
        ];

        for (const role of defaultRoles) {
          await db.insert(userRoles).values(role);
        }
      }

      // Create Bobby as super admin if he doesn't exist
      const existingBobby = await db.select().from(users).where(eq(users.username, 'bobby'));
      
      if (existingBobby.length === 0) {
        const superAdminRole = await db.select().from(userRoles).where(eq(userRoles.name, 'super_admin'));
        
        if (superAdminRole.length > 0) {
          const hashedPassword = await bcrypt.hash('bobby123', 10); // Default password - Bobby should change this
          
          await db.insert(users).values({
            username: 'bobby',
            password: hashedPassword,
            email: 'bobby@club.com',
            firstName: 'Bobby',
            lastName: 'Club Owner',
            roleId: superAdminRole[0].id,
            isSuperUser: true,
            isActive: true,
          });
        }
      }

      console.log('Default roles and super admin user initialized successfully');
    } catch (error) {
      console.error('Error initializing defaults:', error);
    }
  }

  // Create user with role and club assignments
  async createUser(userData: InsertUser & { clubIds?: number[] }) {
    const { clubIds, ...userInsertData } = userData;
    
    // Hash password
    if (userInsertData.password) {
      userInsertData.password = await bcrypt.hash(userInsertData.password, 10);
    }

    // Create user
    const [newUser] = await db.insert(users).values(userInsertData).returning();

    // Assign clubs if provided
    if (clubIds && clubIds.length > 0) {
      const clubAssignments = clubIds.map((clubId, index) => ({
        userId: newUser.id,
        clubId,
        isDefault: index === 0, // First club is default
      }));
      
      await db.insert(userClubAssignments).values(clubAssignments);
    }

    return newUser;
  }

  // Get users with roles and club assignments
  async getUsersWithDetails() {
    const usersWithDetails = await db.query.users.findMany({
      with: {
        role: true,
        clubAssignments: {
          with: {
            club: true,
          },
        },
      },
    });

    return usersWithDetails;
  }

  // Get user by username with role and club info
  async getUserByUsername(username: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
      with: {
        role: true,
        clubAssignments: {
          with: {
            club: true,
          },
        },
      },
    });

    return user;
  }

  // Verify user credentials
  async verifyUser(username: string, password: string) {
    const user = await this.getUserByUsername(username);
    
    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return user;
  }

  // Create club
  async createClub(clubData: InsertClub) {
    try {
      console.log('Attempting to create club with data:', clubData);
      const [newClub] = await db.insert(clubs).values(clubData).returning();
      console.log('Successfully created club:', newClub);
      return newClub;
    } catch (error) {
      console.error('Database error creating club:', error);
      throw new Error(`Failed to create club: ${error instanceof Error ? error.message : 'Unknown database error'}`);
    }
  }

  // Get all clubs
  async getClubs() {
    return await db.select().from(clubs).where(eq(clubs.isActive, true));
  }

  // Get all roles
  async getRoles() {
    return await db.select().from(userRoles).where(eq(userRoles.isActive, true));
  }

  // Update user status
  async updateUserStatus(userId: number, isActive: boolean) {
    const [updatedUser] = await db.update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // Assign user to club
  async assignUserToClub(userId: number, clubId: number, isDefault = false) {
    // If this is the default club, unset other defaults for this user
    if (isDefault) {
      await db.update(userClubAssignments)
        .set({ isDefault: false })
        .where(eq(userClubAssignments.userId, userId));
    }

    const [assignment] = await db.insert(userClubAssignments)
      .values({ userId, clubId, isDefault })
      .returning();
    
    return assignment;
  }

  // Check if user has permission
  async hasPermission(userId: number, permission: string, clubId?: number) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        role: true,
        clubAssignments: {
          with: {
            club: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return false;
    }

    // Super users have all permissions
    if (user.isSuperUser) {
      return true;
    }

    // Check if role has the permission
    const rolePermissions = user.role?.permissions || [];
    
    // Wildcard permission means all access
    if (rolePermissions.includes('*')) {
      return true;
    }

    // Check specific permission
    if (rolePermissions.includes(permission)) {
      // If club-specific permission is required, check club assignment
      if (clubId) {
        const hasClubAccess = user.clubAssignments?.some(
          assignment => assignment.clubId === clubId
        );
        return hasClubAccess;
      }
      return true;
    }

    return false;
  }

  // Get user's accessible clubs
  async getUserClubs(userId: number) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        clubAssignments: {
          with: {
            club: true,
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    // Super users can access all clubs
    if (user.isSuperUser) {
      return await this.getClubs();
    }

    return user.clubAssignments?.map(assignment => assignment.club) || [];
  }
}

export const userManagementService = new UserManagementService();