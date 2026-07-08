/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { executeQuery } from "../config/db.js";

export interface IPasswordHistory {
  id: number;
  userId: number | null;
  passwordHash: string;
  passwordStrength: string | null;
  entropy: number | null;
  crackTime: string | null;
  createdAt: Date;
}

/**
 * PasswordHistory Database operations rewritten from MongoDB to MySQL prepared statements.
 */
export const PasswordHistory = {
  /**
   * Fetches all password hashes from the secure history.
   * Maps properties cleanly to maintain backwards compatibility with controller checks.
   */
  async find(): Promise<any[]> {
    const sql = "SELECT * FROM `PasswordHistory` ORDER BY `created_at` DESC";
    try {
      const rows: any = await executeQuery(sql);
      
      // Map MySQL snake_case columns back to the camelCase expected by the app
      return rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        passwordHash: row.password_hash,
        passwordStrength: row.password_strength,
        entropy: row.entropy ? parseFloat(row.entropy) : null,
        crackTime: row.crack_time,
        createdAt: row.created_at ? new Date(row.created_at) : new Date()
      }));
    } catch (err) {
      console.error("❌ Error in PasswordHistory.find query:", err);
      return [];
    }
  },

  /**
   * Securely saves a salted password hash along with strength metadata to MySQL.
   */
  async create(data: {
    passwordHash: string;
    userId?: number | null;
    passwordStrength?: string | null;
    entropy?: number | null;
    crackTime?: string | null;
  }): Promise<any> {
    const sql = `
      INSERT INTO \`PasswordHistory\` (\`user_id\`, \`password_hash\`, \`password_strength\`, \`entropy\`, \`crack_time\`)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.userId || null,
      data.passwordHash,
      data.passwordStrength || null,
      data.entropy || null,
      data.crackTime || null
    ];

    try {
      const result = await executeQuery(sql, params);
      return result;
    } catch (err) {
      console.error("❌ Error in PasswordHistory.create query:", err);
      throw err;
    }
  }
};
