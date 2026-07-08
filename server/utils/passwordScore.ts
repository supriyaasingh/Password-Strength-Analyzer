/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { COMMON_PASSWORDS, hasSequentialNumbers, hasSequentialPattern, hasKeyboardPattern } from "./commonPasswords.js";

/**
 * Calculates the theoretical Shannon entropy of a password.
 * Entropy (H) = Length (L) * log2(Pool Size (R))
 * 
 * @param password The raw password string
 * @returns The entropy value in bits
 */
export function calculateEntropy(password: string): number {
  if (!password) return 0;
  
  let poolSize = 0;
  
  // 1. Lowercase letters (a-z) - 26 chars
  if (/[a-z]/.test(password)) poolSize += 26;
  
  // 2. Uppercase letters (A-Z) - 26 chars
  if (/[A-Z]/.test(password)) poolSize += 26;
  
  // 3. Numbers (0-9) - 10 chars
  if (/[0-9]/.test(password)) poolSize += 10;
  
  // 4. Special characters (symbols) - ~33 chars
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    poolSize += 33;
  }

  // Handle case where custom characters not in categories are typed
  if (poolSize === 0) {
    poolSize = 10; // default fallback pool size
  }

  // Calculate Shannon entropy
  const entropy = password.length * Math.log2(poolSize);
  return Math.round(entropy);
}

export interface PasswordAnalysis {
  score: number;
  strength: "Very Weak" | "Weak" | "Medium" | "Strong" | "Very Strong";
  entropy: number;
  suggestions: string[];
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    notCommon: boolean;
    noSequential: boolean;
    noRepeated: boolean;
  };
}

/**
 * Evaluates the strength score and suggestions for a password.
 * 
 * @param password The password to analyze
 * @param isReused Whether the password is found in the database reuse history
 * @returns An object containing score, strength category, entropy, suggestions, and check lists
 */
export function analyzePassword(password: string, isReused: boolean = false): PasswordAnalysis {
  const suggestions: string[] = [];
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
    notCommon: true,
    noSequential: true,
    noRepeated: true
  };

  if (!password) {
    return {
      score: 0,
      strength: "Very Weak",
      entropy: 0,
      suggestions: ["Please enter a password."],
      checks: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        notCommon: false,
        noSequential: false,
        noRepeated: false
      }
    };
  }

  let score = 0;

  // 1. Length contribution (Max 35 points)
  const len = password.length;
  if (len >= 16) {
    score += 35;
  } else if (len >= 12) {
    score += 30;
  } else if (len >= 8) {
    score += 20;
  } else if (len >= 6) {
    score += 10;
  } else {
    score += 5;
  }

  // 2. Character types contribution (Max 35 points)
  let typesCount = 0;
  if (checks.lowercase) {
    score += 5;
    typesCount++;
  } else {
    suggestions.push("Add lowercase letters (a-z)");
  }

  if (checks.uppercase) {
    score += 10;
    typesCount++;
  } else {
    suggestions.push("Add uppercase letters (A-Z)");
  }

  if (checks.number) {
    score += 10;
    typesCount++;
  } else {
    suggestions.push("Use numbers (0-9)");
  }

  if (checks.special) {
    score += 10;
    typesCount++;
  } else {
    suggestions.push("Add symbols (e.g., !, @, #, $, %)");
  }

  // Multi-variety bonus
  if (typesCount === 3) score += 5;
  if (typesCount === 4) score += 10;

  // 3. Entropy contribution (Max 30 points)
  const entropy = calculateEntropy(password);
  if (entropy >= 80) {
    score += 30;
  } else if (entropy >= 60) {
    score += 20;
  } else if (entropy >= 40) {
    score += 10;
  } else if (entropy >= 25) {
    score += 5;
  }

  // Base suggestions for length
  if (len < 8) {
    suggestions.push("Increase password length to at least 8 characters");
  } else if (len < 16) {
    suggestions.push("Increase password length to 16+ characters for maximum security");
  }

  // Cap initial score to 100 before penalties
  score = Math.min(100, score);

  // --- PENALTIES ---

  // A. Common password penalty
  const lowercasePass = password.toLowerCase();
  const isExactCommon = COMMON_PASSWORDS.includes(lowercasePass);
  const containsCommon = COMMON_PASSWORDS.some(common => common.length >= 4 && lowercasePass.includes(common));

  if (isExactCommon) {
    score -= 80;
    checks.notCommon = false;
    suggestions.push("Avoid using highly common default passwords");
  } else if (containsCommon) {
    score -= 25;
    checks.notCommon = false;
    suggestions.push("Avoid embedding common dictionary words in your password");
  }

  // B. Sequential numbers/patterns penalty
  const hasSeqPattern = hasSequentialPattern(password);
  const hasKeyboard = hasKeyboardPattern(password);
  if (hasSeqPattern || hasKeyboard) {
    score -= 15;
    checks.noSequential = false;
    if (hasSeqPattern) suggestions.push("Avoid alphabetical or numerical sequences (e.g., 'abc', '123')");
    if (hasKeyboard) suggestions.push("Avoid standard keyboard patterns (e.g., 'qwerty')");
  }

  // C. Repeated character penalty
  // Check if same character repeated consecutively 3+ times (e.g., "aaa")
  let hasConsecutiveRepeats = false;
  for (let i = 0; i < password.length - 2; i++) {
    if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
      hasConsecutiveRepeats = true;
      break;
    }
  }

  // Check unique character ratio
  const uniqueChars = new Set(password).size;
  const uniqueRatio = uniqueChars / password.length;
  
  if (hasConsecutiveRepeats || (password.length >= 5 && uniqueRatio < 0.55)) {
    score -= 15;
    checks.noRepeated = false;
    suggestions.push("Avoid repeating characters or using a low variety of characters");
  }

  // D. Reuse penalty (if marked as reused)
  if (isReused) {
    score -= 20;
    suggestions.push("Avoid using passwords you have already used here before");
  }

  // Ensure score stays in 0-100 range
  score = Math.max(0, Math.min(100, score));

  // Determine strength label classification
  let strength: "Very Weak" | "Weak" | "Medium" | "Strong" | "Very Strong";
  if (score <= 20) {
    strength = "Very Weak";
  } else if (score <= 40) {
    strength = "Weak";
  } else if (score <= 60) {
    strength = "Medium";
  } else if (score <= 80) {
    strength = "Strong";
  } else {
    strength = "Very Strong";
  }

  return {
    score,
    strength,
    entropy,
    suggestions,
    checks
  };
}
