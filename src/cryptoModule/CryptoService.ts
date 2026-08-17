import crypto from 'node:crypto';

const algorithm = 'aes-256-gcm';

export class CryptoService {
  // valida e inicializa la clave de encriptación — se lee en cada llamada,
  // no al importar el archivo, para evitar problemas de orden de carga con dotenv
  private static getKey(): Buffer {
    const secret_key = process.env.ENCRYPTION_KEY;
    if (!secret_key || secret_key.length !== 64) {
      throw new Error('ENCRYPTION_KEY debe ser una cadena hexadecimal de 64 caracteres (32 bytes)');
    }
    return Buffer.from(secret_key, 'hex');
  }

  static encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, this.getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  static decrypt(encryptedPayload: string): string {
    if (!encryptedPayload) return encryptedPayload;
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      return encryptedPayload;
    }
    const [ivHex, authTagHex, encryptedText] = parts;
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(algorithm, this.getKey(), iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      throw new Error('Error al descifrar los datos: clave inválida o contenido alterado');
    }
  }

  static encryptObject<T>(data: T): string {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString);
  }

  static decryptObject<T>(encryptedPayload: string): T {
    const decryptedString = this.decrypt(encryptedPayload);
    return JSON.parse(decryptedString) as T;
  }

  static generateRandomKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}