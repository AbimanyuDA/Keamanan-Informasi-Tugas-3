import forge from "node-forge";
import { KeyPairInfo, CertificateInfo } from "@/types";

/**
 * Generate RSA 2048-bit key pair and self-signed X.509 certificate
 */
export async function generateKeyPairAndCertificate(userInfo: {
  commonName: string;
  organizationName?: string;
  email: string;
}): Promise<KeyPairInfo> {
  return new Promise((resolve, reject) => {
    try {
      // Generate RSA key pair (2048 bits)
      const keys = forge.pki.rsa.generateKeyPair(2048);

      // Create certificate
      const cert = forge.pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = "01" + Math.floor(Math.random() * 1000000).toString();

      // Set validity period (1 year)
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(
        cert.validity.notBefore.getFullYear() + 1
      );

      // Set certificate attributes
      const attrs = [
        { name: "commonName", value: userInfo.commonName },
        { name: "countryName", value: "ID" },
        { shortName: "ST", value: "Indonesia" },
        { name: "localityName", value: "Jakarta" },
        {
          name: "organizationName",
          value: userInfo.organizationName || "Self-Signed",
        },
        { shortName: "OU", value: "Digital Signature" },
        { name: "emailAddress", value: userInfo.email },
      ];

      cert.setSubject(attrs);
      cert.setIssuer(attrs); // Self-signed

      // Add extensions
      cert.setExtensions([
        {
          name: "basicConstraints",
          cA: false,
        },
        {
          name: "keyUsage",
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
        },
        {
          name: "extKeyUsage",
          serverAuth: false,
          clientAuth: false,
          codeSigning: false,
          emailProtection: true,
        },
      ]);

      // Self-sign certificate
      cert.sign(keys.privateKey, forge.md.sha256.create());

      // Convert to PEM format
      const publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);
      const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
      const certificatePem = forge.pki.certificateToPem(cert);

      resolve({
        publicKey: publicKeyPem,
        privateKey: privateKeyPem,
        certificate: certificatePem,
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Encrypt private key using AES-256-GCM with password
 */
export function encryptPrivateKey(
  privateKeyPem: string,
  password: string
): string {
  try {
    // Derive key from password using PBKDF2
    const salt = forge.random.getBytesSync(32);
    const derivedKey = forge.pkcs5.pbkdf2(password, salt, 100000, 32);

    // Generate IV for AES-GCM
    const iv = forge.random.getBytesSync(12);

    // Encrypt using AES-256-GCM
    const cipher = forge.cipher.createCipher("AES-GCM", derivedKey);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(privateKeyPem, "utf8"));
    cipher.finish();

    const encrypted = cipher.output.bytes();
    const tag = (cipher.mode as any).tag.bytes();

    // Combine salt + iv + tag + encrypted data
    const combined = salt + iv + tag + encrypted;

    // Return as base64
    return forge.util.encode64(combined);
  } catch (error) {
    throw new Error(
      "Failed to encrypt private key: " + (error as Error).message
    );
  }
}

/**
 * Decrypt private key using password
 */
export function decryptPrivateKey(
  encryptedData: string,
  password: string
): string {
  try {
    // Decode from base64
    const combined = forge.util.decode64(encryptedData);

    // Extract components
    const salt = combined.slice(0, 32);
    const iv = combined.slice(32, 44);
    const tag = combined.slice(44, 60);
    const encrypted = combined.slice(60);

    // Derive key from password
    const derivedKey = forge.pkcs5.pbkdf2(password, salt, 100000, 32);

    // Decrypt using AES-256-GCM
    const decipher = forge.cipher.createDecipher("AES-GCM", derivedKey);
    decipher.start({
      iv: iv,
      tag: forge.util.createBuffer(tag),
    });
    decipher.update(forge.util.createBuffer(encrypted));

    const success = decipher.finish();
    if (!success) {
      throw new Error(
        "Authentication failed - incorrect password or corrupted data"
      );
    }

    return decipher.output.toString();
  } catch (error) {
    throw new Error(
      "Failed to decrypt private key: " + (error as Error).message
    );
  }
}

/**
 * Parse certificate and extract information
 */
export function parseCertificate(certificatePem: string): CertificateInfo {
  try {
    const cert = forge.pki.certificateFromPem(certificatePem);

    const getAttributeValue = (attrs: any[], name: string): string => {
      const attr = attrs.find((a) => a.name === name || a.shortName === name);
      return attr ? attr.value : "";
    };

    return {
      subject: cert.subject.attributes
        .map((a) => `${a.shortName || a.name}=${a.value}`)
        .join(", "),
      issuer: cert.issuer.attributes
        .map((a) => `${a.shortName || a.name}=${a.value}`)
        .join(", "),
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      serialNumber: cert.serialNumber,
      algorithm: "RSA with SHA-256",
    };
  } catch (error) {
    throw new Error("Failed to parse certificate: " + (error as Error).message);
  }
}

/**
 * Verify if certificate is still valid
 */
export function isCertificateValid(certificatePem: string): boolean {
  try {
    const cert = forge.pki.certificateFromPem(certificatePem);
    const now = new Date();
    return now >= cert.validity.notBefore && now <= cert.validity.notAfter;
  } catch (error) {
    return false;
  }
}
