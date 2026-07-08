/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A comprehensive list of common passwords, keyboard patterns, dictionary terms, and sequential strings.
// This is used both for the live checklist and the scoring deduction.
export const COMMON_PASSWORDS = [
  "password",
  "123456",
  "admin",
  "qwerty",
  "welcome",
  "letmein",
  "abc123",
  "12345678",
  "123456789",
  "12345",
  "1234567",
  "password123",
  "security",
  "sunshine",
  "monkey",
  "princess",
  "iloveyou",
  "secret",
  "login",
  "dragon",
  "football",
  "shadow",
  "mustang",
  "superman",
  "charlie",
  "baseball",
  "michael",
  "master",
  "killer",
  "hunter",
  "batman",
  "trustnoone",
  "guest",
  "default",
  "root"
];

// Standard QWERTY keyboard sequences to check for patterns
export const KEYBOARD_PATTERNS = [
  "qwerty", "asdfgh", "zxcvbn", "qwert", "asdf", "zxcv",
  "yuiop", "hjkl", "bnm", "12345", "54321", "67890",
  "poiuy", "lkjhg", "mnbvc"
];

// Check if a password contains sequential numbers or letters (e.g., "123", "abc", "def")
export function hasSequentialPattern(password: string): boolean {
  const lowercasePass = password.toLowerCase();
  
  // Checking for sequential characters like 'abc' or '123'
  for (let i = 0; i < lowercasePass.length - 2; i++) {
    const code1 = lowercasePass.charCodeAt(i);
    const code2 = lowercasePass.charCodeAt(i + 1);
    const code3 = lowercasePass.charCodeAt(i + 2);
    
    // Check ascending sequence (e.g., 1-2-3 or a-b-c)
    if (code2 === code1 + 1 && code3 === code2 + 1) {
      // Ensure we are in a valid character range (letters or digits)
      const isDigit = code1 >= 48 && code1 <= 57;
      const isLetter = code1 >= 97 && code1 <= 122;
      if (isDigit || isLetter) return true;
    }
    
    // Check descending sequence (e.g., 3-2-1 or c-b-a)
    if (code2 === code1 - 1 && code3 === code2 - 1) {
      const isDigit = code1 >= 48 && code1 <= 57;
      const isLetter = code1 >= 97 && code1 <= 122;
      if (isDigit || isLetter) return true;
    }
  }
  
  return false;
}

// Check for simple keyboard patterns
export function hasKeyboardPattern(password: string): boolean {
  const lowercasePass = password.toLowerCase();
  for (const pattern of KEYBOARD_PATTERNS) {
    if (lowercasePass.includes(pattern)) {
      return true;
    }
  }
  return false;
}

// Check for sequential numbers specifically (e.g., "1234")
export function hasSequentialNumbers(password: string): boolean {
  for (let i = 0; i < password.length - 2; i++) {
    const char1 = password[i];
    const char2 = password[i + 1];
    const char3 = password[i + 2];
    
    if (
      char1 >= "0" && char1 <= "9" &&
      char2 >= "0" && char2 <= "9" &&
      char3 >= "0" && char3 <= "9"
    ) {
      const num1 = parseInt(char1, 10);
      const num2 = parseInt(char2, 10);
      const num3 = parseInt(char3, 10);
      if ((num2 === num1 + 1 && num3 === num2 + 1) || (num2 === num1 - 1 && num3 === num2 - 1)) {
        return true;
      }
    }
  }
  return false;
}
