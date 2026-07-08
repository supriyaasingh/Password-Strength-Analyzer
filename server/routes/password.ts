/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { checkPassword, savePassword, generatePassword } from "../controllers/passwordController.js";

const router = Router();

// Route to analyze password strength, entropy, and history reuse
// POST /api/password/check
router.post("/check", checkPassword);

// Route to hash and save a unique password to the history
// POST /api/password/save
router.post("/save", savePassword);

// Route to generate a cryptographically secure 16-character password
// POST /api/password/generate
router.post("/generate", generatePassword);

export default router;
