// server/index.ts

import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import dotenv from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage"; // <--- ADD THIS EXPLICIT IMPORT

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "kandhari-global-beverages-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Logging middleware for API routes
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalJson = res.json;
  res.json = function (body, ...args) {
    capturedJsonResponse = body;
    return originalJson.apply(res, [body, ...args]);
  };

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Explicitly check if storage is ready (optional, but good for debugging)
    if (!storage) {
      throw new Error("DatabaseStorage instance (storage) failed to initialize.");
    }
    // You could also add a test call here if storage had a simple test method:
    // await storage.getAllDepartments(); // For example, to force a DB call and catch errors early.

    const server = await registerRoutes(app); // This still registers all your routes

    // Central error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error(err);
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = process.env.PORT || 5000;
    server.listen(port, "127.0.0.1", () => {
      log(`Server is running on http://127.0.0.1:${port}`);
    });
  } catch (error) {
    console.error("CRITICAL SERVER STARTUP ERROR:", error);
    process.exit(1); // Exit process if Prisma client or storage fails to initialize
  }
})();