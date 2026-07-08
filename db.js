/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// SentryVault MySQL Database Connection Helper Module
// This file exports the active connection pool and execution helper.
// The primary TypeScript implementation resides in server/config/db.ts.

import { pool, isConnectedToMySQL, executeQuery } from "./server/config/db.js";

export {
  pool,
  isConnectedToMySQL,
  executeQuery
};
