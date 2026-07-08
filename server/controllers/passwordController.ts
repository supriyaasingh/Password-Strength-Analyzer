/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { PasswordHistory } from "../models/PasswordHistory.js";
import { analyzePassword } from "../utils/passwordScore.js";
import { generateSecurePassword } from "../utils/passwordGenerator.js";
import { executeQuery } from "../config/db.js";

/**
 * Estimates password crack time based on Shannon entropy bits.
 */
function estimateCrackTime(entropy: number): string {
  if (entropy < 25) return "Immediately";
  if (entropy < 40) return "< 1 minute";
  if (entropy < 60) return "2 hours";
  if (entropy < 80) return "5 years";
  return "800 trillion years";
}

/**
 * Checks if a candidate password has already been used in the stored database history.
 * Iterates through each record, comparing using secure bcrypt.compare().
 * 
 * @param password The candidate password to check
 * @returns true if the password matches a previously saved hash, false otherwise
 */
async function checkIfPasswordReused(password: string): Promise<boolean> {
  try {
    // 1. Fetch all stored hashes (which never exposes plain passwords)
    const history = await PasswordHistory.find();
    
    // 2. Loop through each record and verify using secure bcrypt comparison
    for (const record of history) {
      if (record.passwordHash) {
        const match = await bcrypt.compare(password, record.passwordHash);
        if (match) {
          return true; // Match found - password is reused!
        }
      }
    }
    
    return false; // No matches found - unique password!
  } catch (err) {
    console.error("Error in reuse detection:", err);
    return false; // Fallback to safe state if DB query fails
  }
}

/**
 * POST /api/password/check
 * Analyzes the candidate password's strength, entropy, patterns, and history.
 */
export async function checkPassword(req: Request, res: Response): Promise<void> {
  try {
    const { password } = req.body;

    // 1. Input validation & security sanitization
    if (password === undefined || password === null) {
      res.status(400).json({ error: "Password field is required." });
      return;
    }

    if (typeof password !== "string") {
      res.status(400).json({ error: "Password must be a string." });
      return;
    }

    // Cybersecurity Best Practice: Limit maximum input length to prevent bcrypt CPU exhaustion (DoS) attacks.
    // bcrypt ignores bytes past 72, and extremely long strings can freeze Node.js event loops.
    if (password.length > 128) {
      res.status(400).json({ error: "Password exceeds maximum allowable length of 128 characters." });
      return;
    }

    // 2. Perform Reuse Detection (fetch stored hashes and compare using bcrypt)
    const isReused = await checkIfPasswordReused(password);
    const reuseStatus = isReused ? "Password already used before" : "Unique password";

    // 3. Analyze password strength with our scoring rules (passing reuse flag for score penalty)
    const analysis = analyzePassword(password, isReused);

    // 4. Return secure analysis results to client (never exposes database hashes)
    res.json({
      strength: analysis.strength,
      score: analysis.score,
      entropy: analysis.entropy,
      suggestions: analysis.suggestions,
      reuseStatus,
      checks: analysis.checks
    });
  } catch (error: any) {
    console.error("Error in checkPassword controller:", error);
    res.status(500).json({ error: "An internal server error occurred during analysis." });
  }
}

/**
 * POST /api/password/save
 * Hashes a unique password using bcrypt and stores it in the history database.
 * Rejects duplicate passwords to enforce secure password uniqueness.
 */
export async function savePassword(req: Request, res: Response): Promise<void> {
  try {
    const { password } = req.body;

    // 1. Input validation
    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "A valid password string is required to save." });
      return;
    }

    if (password.length > 128) {
      res.status(400).json({ error: "Password exceeds maximum length limit of 128 characters." });
      return;
    }

    // 2. Reuse check - reject duplicate passwords to comply with security rules
    const isReused = await checkIfPasswordReused(password);
    if (isReused) {
       res.status(400).json({ 
        error: "Password already used.", 
        message: "This password has already been used in your history and cannot be saved again for security reasons." 
      });
       return;
    }

    // 3. Securely hash the password using bcrypt with optimal work factor (saltRounds = 12)
    // Salt rounds of 12 balances strong cryptographic defense with event loop performance.
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Calculate detailed security parameters for saving to schema tables
    const analysis = analyzePassword(password, false);
    const crackTime = estimateCrackTime(analysis.entropy);

    // 5. Save hash to PasswordHistory (using MySQL prepared statements)
    await PasswordHistory.create({
      passwordHash,
      userId: 1, // anonymous standard user
      passwordStrength: analysis.strength,
      entropy: analysis.entropy,
      crackTime
    });

    // 6. Create associated SecurityReport record in MySQL
    const reportSql = `
      INSERT INTO \`SecurityReports\` (\`user_id\`, \`score\`, \`entropy\`, \`feedback\`)
      VALUES (?, ?, ?, ?)
    `;
    const feedbackText = analysis.suggestions.length > 0 
      ? analysis.suggestions.join(" | ")
      : "Password has exceptional cryptographic properties and fully meets NIST guidelines.";

    await executeQuery(reportSql, [
      1, // user_id
      analysis.score,
      analysis.entropy,
      feedbackText
    ]);

    res.json({ 
      success: true, 
      message: "Password successfully hashed and saved to secure history database." 
    });
  } catch (error: any) {
    console.error("Error in savePassword controller:", error);
    res.status(500).json({ error: "An internal server error occurred while saving." });
  }
}

/**
 * POST /api/password/generate
 * Generates a cryptographically secure 16-character password and returns it.
 */
export async function generatePassword(req: Request, res: Response): Promise<void> {
  try {
    const password = generateSecurePassword(16);
    res.json({ password });
  } catch (error: any) {
    console.error("Error in generatePassword controller:", error);
    res.status(500).json({ error: "An error occurred while generating a secure password." });
  }
}

