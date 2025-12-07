import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: "organization" | "consultant";
  organizationName?: string;
  position?: string; // jabatan
  createdAt: Date;
  hasKeys: boolean;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["organization", "consultant"], required: true },
  organizationName: { type: String },
  position: { type: String },
  createdAt: { type: Date, default: Date.now },
  hasKeys: { type: Boolean, default: false },
});

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
