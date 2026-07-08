/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { connectDB } from "./server/config/db.js";
import passwordRoutes from "./server/routes/password.js";

// Load environment variables from .env
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Initialize Database (MySQL with automatic JSON file fallback emulator)
  await connectDB();

  // 2. Security Middleware Setup
  // Use Helmet for secure HTTP headers, with a Content Security Policy adapted for SentryVault and the SentryVault preview iframe
  app.use(
    helmet({
      frameguard: false, // Allow SentryVault to be embedded in SentryVault's preview iframe
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https://*"],
          connectSrc: ["'self'", "ws://localhost:3000", "ws://localhost:5173", "wss://*", "https://*"],
          frameAncestors: ["*"], // Ensure the app can be rendered in the developer iframe
        },
      },
    })
  );

  // Enable CORS (Cross-Origin Resource Sharing)
  app.use(cors());

  // JSON request body parser with payload limit protection (prevent crash on heavy payload DoS)
  app.use(express.json({ limit: "10kb" }));

  // 3. API Routes Configuration
  app.use("/api/password", passwordRoutes);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date() });
  });

  // 4. Vite Dev Server Integration & Static Assets Serving
  const isProd = process.env.NODE_ENV === "production";
  
  if (!isProd) {
    console.log("🛠️  Running in DEVELOPMENT mode. Initializing Vite middleware...");
    // Create Vite server in middleware mode to enable fast HMR and route processing
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite dev middleware
    app.use(vite.middlewares);
  } else {
    console.log("📦 Running in PRODUCTION mode. Serving pre-compiled static assets...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve Vite-compiled assets from static folder
    app.use(express.static(distPath));
    
    // Fallback all non-API routing to index.html for SPA router completeness
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 5. Start Listening on Host 0.0.0.0 and Port 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=================================================`);
    console.log(`🛡️  Password Strength Analyzer Server online!`);
    console.log(`🔗 Local Dev Access: http://localhost:${PORT}`);
    console.log(`🌍 Target Network: Listening on 0.0.0.0:${PORT}`);
    console.log(`=================================================`);
  });
}

// Global exception trackers for server resilience
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception caught:", error);
});

startServer();
