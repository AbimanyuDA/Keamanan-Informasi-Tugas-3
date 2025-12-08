import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import UserModel, { IUser } from "@/models/User";
import UserKeysModel, { IUserKeys } from "@/models/UserKeys";
import PDFModel, { IPDF } from "@/models/PDF";

export const userDb = {
  async updateProfile(
    userId: string,
    data: { name?: string; organizationName?: string; position?: string }
  ): Promise<(IUser & { id: string }) | null> {
    await dbConnect();
    const userDoc = await UserModel.findByIdAndUpdate(
      userId,
      {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.organizationName !== undefined
          ? { organizationName: data.organizationName }
          : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
      },
      { new: true }
    );
    if (!userDoc) return null;
    const { passwordHash: _, ...user } = userDoc.toObject();
    return { ...user, id: userDoc._id.toString() };
  },
  async create(userData: {
    email: string;
    password: string;
    name: string;
    role: "organization" | "consultant";
    organizationName?: string;
    position?: string;
  }): Promise<Omit<IUser, "passwordHash"> & { id: string }> {
    await dbConnect();
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const userDoc = await UserModel.create({
      email: userData.email,
      passwordHash,
      name: userData.name,
      role: userData.role,
      organizationName: userData.organizationName,
      position: userData.position,
      createdAt: new Date(),
      hasKeys: false,
    });
    const { passwordHash: _, ...user } = userDoc.toObject();
    return { ...user, id: userDoc._id.toString() };
  },

  async findByEmail(email: string): Promise<(IUser & { id: string }) | null> {
    await dbConnect();
    const userDoc = await UserModel.findOne({ email });
    if (!userDoc) return null;
    const { passwordHash: _, ...user } = userDoc.toObject();
    return { ...user, id: userDoc._id.toString() };
  },

  async findById(id: string): Promise<(IUser & { id: string }) | null> {
    await dbConnect();
    const userDoc = await UserModel.findById(id);
    if (!userDoc) return null;
    const { passwordHash: _, ...user } = userDoc.toObject();
    return { ...user, id: userDoc._id.toString() };
  },

  async updateHasKeys(userId: string, hasKeys: boolean): Promise<void> {
    await dbConnect();
    await UserModel.findByIdAndUpdate(userId, { hasKeys });
  },

  async verifyPassword(
    email: string,
    password: string
  ): Promise<(IUser & { id: string }) | null> {
    await dbConnect();
    const userDoc = await UserModel.findOne({ email });
    if (!userDoc) return null;
    const isValid = await bcrypt.compare(password, userDoc.passwordHash);
    if (!isValid) return null;
    const { passwordHash: _, ...user } = userDoc.toObject();
    return { ...user, id: userDoc._id.toString() };
  },
};

export const userKeysDb = {
  async create(keysData: {
    userId: string;
    publicKey: string;
    privateKeyEncrypted: string;
    certificate: string;
  }): Promise<IUserKeys> {
    await dbConnect();
    const keys = await UserKeysModel.create({
      ...keysData,
      createdAt: new Date(),
    });
    await userDb.updateHasKeys(keysData.userId, true);
    return keys.toObject();
  },

  async findByUserId(userId: string): Promise<IUserKeys | null> {
    await dbConnect();
    const keys = await UserKeysModel.findOne({ userId });
    return keys ? keys.toObject() : null;
  },

  async update(userId: string, keysData: Partial<IUserKeys>): Promise<void> {
    await dbConnect();
    await UserKeysModel.findOneAndUpdate({ userId }, keysData);
  },

  async delete(userId: string): Promise<void> {
    await dbConnect();
    await UserKeysModel.deleteOne({ userId });
    await userDb.updateHasKeys(userId, false);
  },
};

export const pdfDb = {
  async create(pdfData: {
    name: string;
    userId: string;
    content: Buffer;
    signed: boolean;
    signedBy?: string;
    signedAt?: Date;
  }): Promise<IPDF> {
    await dbConnect();
    const pdf = await PDFModel.create({
      ...pdfData,
      createdAt: new Date(),
    });
    return pdf.toObject();
  },

  async findById(id: string): Promise<IPDF | null> {
    await dbConnect();
    const pdf = await PDFModel.findById(id);
    return pdf ? pdf.toObject() : null;
  },

  async findByUserId(userId: string): Promise<IPDF[]> {
    await dbConnect();
    const pdfs = await PDFModel.find({ userId });
    return pdfs.map((pdf) => pdf.toObject());
  },

  async update(id: string, data: Partial<IPDF>): Promise<void> {
    await dbConnect();
    await PDFModel.findByIdAndUpdate(id, data);
  },
};

export const getDatabase = () => ({});
