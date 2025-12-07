// User Types
export type UserRole = "organization" | "consultant";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationName?: string;
  position?: string;
  createdAt: Date;
  hasKeys: boolean;
}

export interface UserKeys {
  userId: string;
  publicKey: string;
  privateKeyEncrypted: string;
  certificate: string;
  createdAt: Date;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  organizationName?: string;
  position?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// PDF Types
export interface PDFDocument {
  id: string;
  name: string;
  userId: string;
  organizationId?: string;
  content: Buffer;
  signed: boolean;
  signedBy?: string;
  signedAt?: Date;
  createdAt: Date;
}

export interface SignatureInfo {
  valid: boolean;
  signedBy: string;
  signedAt: Date;
  certificate: string;
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  algorithm: string;
}

export interface PDFGenerateRequest {
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface PDFSignRequest {
  pdfBuffer: Buffer;
  password: string;
}

export interface PDFVerifyRequest {
  pdfBuffer: Buffer;
}

// Key Generation Types
export interface KeyPairInfo {
  publicKey: string;
  privateKey: string;
  certificate: string;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  algorithm: string;
}
