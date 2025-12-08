import mongoose, { Schema, Document } from "mongoose";

export interface IUserKeys extends Document {
  userId: string;
  publicKey: string;
  privateKeyEncrypted: string;
  certificate: string;
  createdAt: Date;
}

const UserKeysSchema = new Schema<IUserKeys>({
  userId: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true },
  privateKeyEncrypted: { type: String, required: true },
  certificate: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.UserKeys ||
  mongoose.model<IUserKeys>("UserKeys", UserKeysSchema);
