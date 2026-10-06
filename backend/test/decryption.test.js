const test = require('node:test');
const assert = require('node:assert/strict');
const { decryptMessage, encryptMessage } = require('../utils/decryption');

const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 32-byte key in hex

test('encrypts and decrypts AES-256-GCM message payloads correctly', () => {
  const originalMessage = 'URGENT: Flooding at Velachery Main Road. Medical assistance needed.';
  const encryptedPayload = encryptMessage(originalMessage, testKey, 'hex');

  assert.ok(encryptedPayload.includes(':'), 'Encrypted payload should contain colon separators iv:ciphertext:tag');
  assert.equal(encryptedPayload.split(':').length, 3, 'Encrypted payload must have 3 parts (iv, ciphertext, tag)');

  const decrypted = decryptMessage(encryptedPayload, testKey);
  assert.equal(decrypted, originalMessage, 'Decrypted plaintext must match the original text');
});

test('returns plaintext unencrypted messages untouched', () => {
  const plainText = 'Standard unencrypted emergency description';
  const result = decryptMessage(plainText, testKey);
  assert.equal(result, plainText);
});

test('returns [Unable to decrypt] placeholder safely on invalid payload or key mismatch without throwing', () => {
  const badPayload = '1234567890abcdef:invalidciphertext:1234567890abcdef';
  const result = decryptMessage(badPayload, testKey);
  assert.equal(result, '[Unable to decrypt]');
});

test('handles missing secret key gracefully', () => {
  const encryptedPayload = encryptMessage('Test message', testKey);
  const result = decryptMessage(encryptedPayload, '');
  assert.equal(result, '[Unable to decrypt]');
});
