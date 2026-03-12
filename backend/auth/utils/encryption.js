import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

// Generate a valid 32-byte key from whatever string is in .env using SHA-256
const getSecretKey = () => {
    if (!ENCRYPTION_KEY) {
        throw new Error("ENCRYPTION_KEY is not defined in .env");
    }
    return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
};

/**
 * Encrypts sensitive text using AES-256-CBC
 */
export const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getSecretKey();
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
};

/**
 * Decrypts sensitive text using AES-256-CBC
 */
export const decrypt = (text) => {
    if (!text) return null;
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const key = getSecretKey();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};
