const crypto = require('crypto');

/**
 * Decrypts an AES-256-GCM encrypted message payload in the format `iv:ciphertext:tag` (hex or base64).
 * Decryption occurs server-side on read only for authenticated admin users.
 * Returns placeholder '[Unable to decrypt]' safely on error without crashing.
 *
 * @param {string} payload - Message payload (encrypted or plain).
 * @param {string} [secretKey] - Secret key from process.env.MESSAGE_DECRYPTION_KEY.
 * @returns {string} Decrypted plaintext, original plain string, or '[Unable to decrypt]'.
 */
function decryptMessage(payload, secretKey = process.env.MESSAGE_DECRYPTION_KEY) {
  if (!payload || typeof payload !== 'string') {
    return payload;
  }

  // If message does not contain ':', it is unencrypted plain text
  if (!payload.includes(':')) {
    return payload;
  }

  if (!secretKey) {
    return '[Unable to decrypt]';
  }

  try {
    const parts = payload.split(':');
    if (parts.length !== 3) {
      return payload;
    }

    const [ivStr, ciphertextStr, tagStr] = parts;
    const isHex = (str) => /^[0-9a-fA-F]+$/.test(str);
    const encoding = (isHex(ivStr) && isHex(ciphertextStr) && isHex(tagStr)) ? 'hex' : 'base64';

    const iv = Buffer.from(ivStr, encoding);
    const ciphertext = Buffer.from(ciphertextStr, encoding);
    const authTag = Buffer.from(tagStr, encoding);

    let keyBuffer;
    if (Buffer.isBuffer(secretKey)) {
      keyBuffer = secretKey;
    } else if (typeof secretKey === 'string') {
      if (/^[0-9a-fA-F]{64}$/.test(secretKey)) {
        keyBuffer = Buffer.from(secretKey, 'hex');
      } else if (secretKey.length === 32) {
        keyBuffer = Buffer.from(secretKey, 'utf8');
      } else {
        keyBuffer = crypto.createHash('sha256').update(secretKey).digest();
      }
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return '[Unable to decrypt]';
  }
}

/**
 * Helper utility to encrypt a message payload (format: iv:ciphertext:tag) for testing.
 *
 * @param {string} text - Plaintext message to encrypt.
 * @param {string} [secretKey] - Key from process.env.MESSAGE_DECRYPTION_KEY.
 * @param {string} [encoding='hex'] - Output encoding ('hex' or 'base64').
 * @returns {string} Encrypted payload string `iv:ciphertext:tag`.
 */
function encryptMessage(text, secretKey = process.env.MESSAGE_DECRYPTION_KEY, encoding = 'hex') {
  if (!text || typeof text !== 'string') return text;
  if (!secretKey) throw new Error('MESSAGE_DECRYPTION_KEY environment variable is required to encrypt.');

  let keyBuffer;
  if (/^[0-9a-fA-F]{64}$/.test(secretKey)) {
    keyBuffer = Buffer.from(secretKey, 'hex');
  } else if (secretKey.length === 32) {
    keyBuffer = Buffer.from(secretKey, 'utf8');
  } else {
    keyBuffer = crypto.createHash('sha256').update(secretKey).digest();
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(text, 'utf8', encoding);
  encrypted += cipher.final(encoding);
  const tag = cipher.getAuthTag().toString(encoding);

  return `${iv.toString(encoding)}:${encrypted}:${tag}`;
}

module.exports = { decryptMessage, encryptMessage };
