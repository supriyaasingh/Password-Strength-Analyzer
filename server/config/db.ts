/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

// Connection pool reference
export let pool: mysql.Pool | null = null;
export let isConnectedToMySQL = false;

// Local JSON DB fallback file path
const LOCAL_SQL_DB_PATH = path.join(process.cwd(), "password_analyzer_local.json");

// Structure for the local JSON-based SQL database emulator
interface LocalDatabase {
  Users: Array<{
    id: number;
    username: string;
    email: string;
    created_at: string;
  }>;
  PasswordHistory: Array<{
    id: number;
    user_id: number | null;
    password_hash: string;
    password_strength: string | null;
    entropy: number | null;
    crack_time: string | null;
    created_at: string;
  }>;
  SecurityReports: Array<{
    id: number;
    user_id: number | null;
    score: number | null;
    entropy: number | null;
    feedback: string | null;
    created_at: string;
  }>;
}

/**
 * Initializes the local database file if it does not exist.
 */
function initializeLocalDatabase(): LocalDatabase {
  try {
    if (!fs.existsSync(LOCAL_SQL_DB_PATH)) {
      const initialDb: LocalDatabase = {
        Users: [
          {
            id: 1,
            username: "anonymous_vault_user",
            email: "anonymous@sentryvault.local",
            created_at: new Date().toISOString()
          }
        ],
        PasswordHistory: [],
        SecurityReports: []
      };
      fs.writeFileSync(LOCAL_SQL_DB_PATH, JSON.stringify(initialDb, null, 2), "utf-8");
      return initialDb;
    }
    const data = fs.readFileSync(LOCAL_SQL_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("❌ Failed to initialize local JSON DB:", err);
    return { Users: [], PasswordHistory: [], SecurityReports: [] };
  }
}

/**
 * Writes the local database state back to the filesystem.
 */
function saveLocalDatabase(db: LocalDatabase) {
  try {
    fs.writeFileSync(LOCAL_SQL_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("❌ Failed to save local JSON DB:", err);
  }
}

/**
 * Automates MySQL table creation and seeding if they don't exist.
 */
async function bootstrapTables(conn: mysql.PoolConnection) {
  try {
    console.log("🛠️  Checking and bootstrapping MySQL tables...");

    // 1. Users Table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`Users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(255) NOT NULL UNIQUE,
        \`email\` VARCHAR(255) NOT NULL UNIQUE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. PasswordHistory Table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`PasswordHistory\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT DEFAULT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`password_strength\` VARCHAR(50) DEFAULT NULL,
        \`entropy\` DECIMAL(8, 2) DEFAULT NULL,
        \`crack_time\` VARCHAR(255) DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`Users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. SecurityReports Table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`SecurityReports\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT DEFAULT NULL,
        \`score\` INT DEFAULT NULL,
        \`entropy\` DECIMAL(8, 2) DEFAULT NULL,
        \`feedback\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`Users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. Seed anonymous user
    await conn.execute(`
      INSERT INTO \`Users\` (\`id\`, \`username\`, \`email\`)
      VALUES (1, 'anonymous_vault_user', 'anonymous@sentryvault.local')
      ON DUPLICATE KEY UPDATE \`username\` = \`username\`
    `);

    console.log("✅ MySQL schemas and records successfully bootstrapped!");
  } catch (err: any) {
    console.error("❌ Failed to bootstrap MySQL tables:", err.message || err);
  }
}

/**
 * Connects to the MySQL server and sets up the connection pool.
 * If credentials are not set or the host is unreachable, falls back gracefully.
 */
export async function connectDB(): Promise<boolean> {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE || "password_analyzer";
  const port = parseInt(process.env.MYSQL_PORT || "3306", 10);

  if (!host || !user) {
    console.warn("⚠️  MYSQL_HOST or MYSQL_USER is not defined in the environment.");
    console.warn("⚠️  Falling back to secure local JSON-based SQL database emulator (password_analyzer_local.json).");
    isConnectedToMySQL = false;
    initializeLocalDatabase();
    return false;
  }

  try {
    console.log(`🔌 Attempting to establish a pool with MySQL server at ${host}:${port}...`);
    
    if (host.includes("railway.internal")) {
      console.warn("⚠️  WARNING: You are using a 'railway.internal' address.");
      console.warn("⚠️  Internal Railway hostnames are only accessible to services running inside the same Railway project private network.");
      console.warn("⚠️  Since SentryVault is running in the AI Studio container sandbox, you must use Railway's PUBLIC hostname (e.g. roundhouse.proxy.rlwy.net) and PUBLIC port instead!");
    }

    // Create a reusable connection pool
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });

    // Test connection with a quick ping
    const connection = await pool.getConnection();
    await connection.ping();
    
    // Auto-bootstrap schema in active DB context
    await bootstrapTables(connection);
    
    connection.release();

    isConnectedToMySQL = true;
    console.log("🚀 Successfully connected to MySQL database pool and finalized schemas!");
    return true;
  } catch (error: any) {
    console.error("❌ MySQL connection error:", error.message || error);
    console.warn("⚠️  Falling back to secure local JSON-based SQL database emulator.");
    isConnectedToMySQL = false;
    pool = null;
    initializeLocalDatabase();
    return false;
  }
}

/**
 * Highly resilient execution abstraction.
 * Executes queries on MySQL if connected, otherwise falls back to the JSON database emulator.
 * Uses prepared statements / parameters for security against SQL Injection.
 */
export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
  if (isConnectedToMySQL && pool) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows as T;
    } catch (err: any) {
      console.error(`❌ Database query execution error on MySQL [Query: "${sql}"]:`, err.message || err);
      throw err;
    }
  }

  // Fallback SQL Emulation Logic for Offline / Local Sandbox Dev Mode
  const db = initializeLocalDatabase();
  const normalizedSql = sql.trim().replace(/\s+/g, " ").toUpperCase();

  // 1. SELECT operations
  if (normalizedSql.startsWith("SELECT")) {
    if (normalizedSql.includes("FROM PASSWORDHISTORY") || normalizedSql.includes("FROM `PASSWORDHISTORY`")) {
      return db.PasswordHistory as unknown as T;
    }
    if (normalizedSql.includes("FROM USERS") || normalizedSql.includes("FROM `USERS`")) {
      return db.Users as unknown as T;
    }
    if (normalizedSql.includes("FROM SECURITYREPORTS") || normalizedSql.includes("FROM `SECURITYREPORTS`")) {
      return db.SecurityReports as unknown as T;
    }
  }

  // 2. INSERT operations
  if (normalizedSql.startsWith("INSERT INTO PASSWORDHISTORY") || normalizedSql.startsWith("INSERT INTO `PASSWORDHISTORY`")) {
    const newId = db.PasswordHistory.length > 0 ? Math.max(...db.PasswordHistory.map(ph => ph.id)) + 1 : 1;
    // Map params array to PasswordHistory columns: [user_id, password_hash, password_strength, entropy, crack_time]
    const record = {
      id: newId,
      user_id: params[0] !== undefined ? params[0] : null,
      password_hash: params[1] || "",
      password_strength: params[2] || null,
      entropy: params[3] !== undefined ? params[3] : null,
      crack_time: params[4] || null,
      created_at: new Date().toISOString()
    };
    db.PasswordHistory.push(record);
    saveLocalDatabase(db);
    return { insertId: newId, affectedRows: 1 } as unknown as T;
  }

  if (normalizedSql.startsWith("INSERT INTO USERS") || normalizedSql.startsWith("INSERT INTO `USERS`")) {
    const newId = db.Users.length > 0 ? Math.max(...db.Users.map(u => u.id)) + 1 : 1;
    // Map params array to Users columns: [username, email]
    const record = {
      id: newId,
      username: params[0] || "",
      email: params[1] || "",
      created_at: new Date().toISOString()
    };
    db.Users.push(record);
    saveLocalDatabase(db);
    return { insertId: newId, affectedRows: 1 } as unknown as T;
  }

  if (normalizedSql.startsWith("INSERT INTO SECURITYREPORTS") || normalizedSql.startsWith("INSERT INTO `SECURITYREPORTS`")) {
    const newId = db.SecurityReports.length > 0 ? Math.max(...db.SecurityReports.map(sr => sr.id)) + 1 : 1;
    // Map params array to SecurityReports columns: [user_id, score, entropy, feedback]
    const record = {
      id: newId,
      user_id: params[0] !== undefined ? params[0] : null,
      score: params[1] !== undefined ? params[1] : null,
      entropy: params[2] !== undefined ? params[2] : null,
      feedback: params[3] || null,
      created_at: new Date().toISOString()
    };
    db.SecurityReports.push(record);
    saveLocalDatabase(db);
    return { insertId: newId, affectedRows: 1 } as unknown as T;
  }

  // 3. DELETE operations (for general completeness)
  if (normalizedSql.startsWith("DELETE FROM")) {
    if (normalizedSql.includes("PASSWORDHISTORY") || normalizedSql.includes("`PASSWORDHISTORY`")) {
      db.PasswordHistory = [];
      saveLocalDatabase(db);
      return { affectedRows: 1 } as unknown as T;
    }
  }

  // 4. UPDATE operations (for general completeness)
  if (normalizedSql.startsWith("UPDATE")) {
    return { affectedRows: 0 } as unknown as T;
  }

  return [] as unknown as T;
}
