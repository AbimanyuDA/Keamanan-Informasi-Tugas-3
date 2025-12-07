import { User, UserKeys } from "@/types";
import bcrypt from "bcryptjs";

// In-memory database (for demo purposes)
// In production, use a real database like PostgreSQL, MongoDB, etc.

interface Database {
  users: Map<string, User & { passwordHash: string }>;
  userKeys: Map<string, UserKeys>;
  pdfs: Map<string, any>;
}

const db: Database = {
  users: new Map(),
  userKeys: new Map(),
  pdfs: new Map(),
};

// Initialize with sample data
async function initializeDatabase() {
  // Create sample organization account
  const orgPasswordHash = await bcrypt.hash("password123", 10);
  const orgUser: User & { passwordHash: string } = {
    id: "user-1",
    email: "org@example.com",
    name: "PT Example Organization",
    role: "organization",
    organizationName: "PT Example Organization",
    createdAt: new Date(),
    hasKeys: false,
    passwordHash: orgPasswordHash,
  };
  db.users.set(orgUser.id, orgUser);

  // Create sample consultant account
  const consultantPasswordHash = await bcrypt.hash("password123", 10);
  const consultantUser: User & { passwordHash: string } = {
    id: "user-2",
    email: "consultant@example.com",
    name: "John Consultant",
    role: "consultant",
    createdAt: new Date(),
    hasKeys: false,
    passwordHash: consultantPasswordHash,
  };
  db.users.set(consultantUser.id, consultantUser);
}

// Initialize on module load
initializeDatabase();

// User operations
export const userDb = {
  async create(userData: {
    email: string;
    password: string;
    name: string;
    role: "organization" | "consultant";
    organizationName?: string;
  }): Promise<User> {
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const user: User & { passwordHash: string } = {
      id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      organizationName: userData.organizationName,
      createdAt: new Date(),
      hasKeys: false,
      passwordHash,
    };

    db.users.set(id, user);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async findByEmail(
    email: string
  ): Promise<(User & { passwordHash: string }) | null> {
    for (const user of db.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  },

  async findById(id: string): Promise<User | null> {
    const user = db.users.get(id);
    if (!user) return null;

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async updateHasKeys(userId: string, hasKeys: boolean): Promise<void> {
    const user = db.users.get(userId);
    if (user) {
      user.hasKeys = hasKeys;
      db.users.set(userId, user);
    }
  },

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
};

// User keys operations
export const userKeysDb = {
  async create(keysData: {
    userId: string;
    publicKey: string;
    privateKeyEncrypted: string;
    certificate: string;
  }): Promise<UserKeys> {
    const keys: UserKeys = {
      ...keysData,
      createdAt: new Date(),
    };

    db.userKeys.set(keysData.userId, keys);
    await userDb.updateHasKeys(keysData.userId, true);

    return keys;
  },

  async findByUserId(userId: string): Promise<UserKeys | null> {
    return db.userKeys.get(userId) || null;
  },

  async update(userId: string, keysData: Partial<UserKeys>): Promise<void> {
    const existing = db.userKeys.get(userId);
    if (existing) {
      db.userKeys.set(userId, { ...existing, ...keysData });
    }
  },

  async delete(userId: string): Promise<void> {
    db.userKeys.delete(userId);
    await userDb.updateHasKeys(userId, false);
  },
};

// PDF operations
export const pdfDb = {
  async create(pdfData: {
    name: string;
    userId: string;
    content: Buffer;
    signed: boolean;
    signedBy?: string;
    signedAt?: Date;
  }): Promise<any> {
    const id = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pdf = {
      id,
      ...pdfData,
      createdAt: new Date(),
    };

    db.pdfs.set(id, pdf);
    return pdf;
  },

  async findById(id: string): Promise<any | null> {
    return db.pdfs.get(id) || null;
  },

  async findByUserId(userId: string): Promise<any[]> {
    const pdfs: any[] = [];
    for (const pdf of db.pdfs.values()) {
      if (pdf.userId === userId) {
        pdfs.push(pdf);
      }
    }
    return pdfs;
  },

  async update(id: string, data: Partial<any>): Promise<void> {
    const existing = db.pdfs.get(id);
    if (existing) {
      db.pdfs.set(id, { ...existing, ...data });
    }
  },
};

// Export database for testing/debugging
export const getDatabase = () => db;
