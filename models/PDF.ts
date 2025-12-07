import mongoose, { Schema, Document } from "mongoose";

export interface IPDF extends Document {
  name: string;
  userId: string;
  content: Buffer;
  signed: boolean;
  signedBy?: string;
  signedAt?: Date;
  createdAt: Date;
}

const PDFSchema = new Schema<IPDF>({
  name: { type: String, required: true },
  userId: { type: String, required: true },
  content: { type: Buffer, required: true },
  signed: { type: Boolean, default: false },
  signedBy: { type: String },
  signedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.PDF || mongoose.model<IPDF>("PDF", PDFSchema);
