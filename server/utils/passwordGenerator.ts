/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}<>?";

/**
 * Generates a cryptographically secure 16-character password using crypto.randomBytes().
 * Guarantees that at least one uppercase, lowercase, number, and special character are included,
 * and then shuffles them using a secure index selector to avoid predictable patterns.
 */
export function generateSecurePassword(length: number = 16): string {
  // 1. Ensure at least one character from each group to satisfy checklists
  const requiredChars = [
    getRandomChar(UPPERCASE),
    getRandomChar(LOWERCASE),
    getRandomChar(NUMBERS),
    getRandomChar(SYMBOLS)
  ];

  // 2. Combine all character sets for the remaining length
  const allChars = UPPERCASE + LOWERCASE + NUMBERS + SYMBOLS;
  const remainingLength = length - requiredChars.length;
  const poolSize = allChars.length;

  const remainingChars: string[] = [];
  
  // Use crypto.randomBytes to pick characters securely
  const randomBytes = crypto.randomBytes(remainingLength);
  for (let i = 0; i < remainingLength; i++) {
    const randomIndex = randomBytes[i] % poolSize;
    remainingChars.push(allChars[randomIndex]);
  }

  // 3. Merge and shuffle the character array cryptographically
  const combinedChars = [...requiredChars, ...remainingChars];
  
  return secureShuffle(combinedChars).join("");
}

/**
 * Returns a secure random character from the provided charset string.
 */
function getRandomChar(charset: string): string {
  const bytes = crypto.randomBytes(1);
  const index = bytes[0] % charset.length;
  return charset[index];
}

/**
 * Shuffles an array of characters cryptographically using the Fisher-Yates algorithm
 * with indices selected via crypto.randomBytes.
 */
function secureShuffle(array: string[]): string[] {
  const shuffled = [...array];
  const length = shuffled.length;
  
  // Create enough random bytes for shuffling
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = length - 1; i > 0; i--) {
    const j = randomBytes[i] % (i + 1);
    
    // Swap elements
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  
  return shuffled;
}
