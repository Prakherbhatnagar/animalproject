import crypto from 'crypto';

/**
 * Computes SHA-256 hash for an image buffer to detect duplicates.
 * @param {Buffer} buffer - The image buffer
 * @returns {string} The hex encoded hash
 */
export const hashImageBuffer = (buffer) => {
  if (!buffer) return null;
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

export default hashImageBuffer;
