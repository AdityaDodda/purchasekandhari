import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendPasswordResetEmail, sendPurchaseRequestToApprovers } from "./email";

// Zod Schemas (Redefined for Prisma Compatibility with your new schema)
const insertUserSchema = z.object({
  emp_code: z.string().min(1, "Employee code is required."),
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  mobile_no: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  manager_name: z.string().optional().nullable(),
  manager_email: z.string().email().optional().nullable(),
  entity: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  site: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  erp_id: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters."),
  must_reset_password: z.boolean().optional().nullable(),
});

const insertPurchaseRequestSchema = z.object({
  requesterId: z.string(),
  department: z.string(),
  location: z.string(),
  requestType: z.string(),
  totalEstimatedCost: z.union([z.string(), z.number()]).transform(val => parseFloat(val.toString())),
  justification: z.string(),
  status: z.string().optional(),
  requisitionNumber: z.string().optional(),
  currentApproverId: z.string().nullable().optional(),
  currentApproverEmployeeNumber: z.string().nullable().optional(),
  currentApprovalLevel: z.number().optional(),
  requestDate: z.string(),
  title: z.string().optional().nullable(),
  businessJustificationDetails: z.string().optional().nullable(),
});

const insertLineItemSchema = z.object({
  itemDescription: z.string(),
  requiredQuantity: z.number(),
  estimatedCost: z.union([z.string(), z.number()]).transform(val => parseFloat(val.toString())),
  requiredByDate: z.string().optional().nullable(),
  stockAvailable: z.number().optional().nullable(),
});

// Multer Configuration for File Uploads
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, and images are allowed.'));
    }
  }
});

// Helper to parse dd-mm-yyyy to Date
function parseDDMMYYYY(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split("-");
  if (!day || !month || !year) return null;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

// Helper function to calculate total cost from line items
const calculateTotalCost = (items: any[]): number => {
  return items.reduce((sum, item) => {
    const itemTotal = (item.requiredQuantity || 0) * parseFloat(item.estimatedCost?.toString() || '0');
    return sum + itemTotal;
  }, 0);
};


export function registerRoutes(app: Express): Server {
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.session.user || !req.session.user.role || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email("Invalid email format."),
        password: z.string(),
      }).parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.password) {
          return res.status(401).json({ message: "Invalid credentials (no password set)" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.must_reset_password) {
        return res.json({
          userNeedsPasswordReset: true,
          email: user.email,
          message: "Please reset your password to continue.",
        });
      }

      req.session.user = {
        id: user.emp_code,
        employeeNumber: user.emp_code,
        fullName: user.name,
        email: user.email,
        department: user.department,
        location: user.location,
        role: user.role,
      };

      res.json({ user: req.session.user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/domains", async (req, res) => {
    try {
      const domains = await storage.getUniqueEmailDomains();
      res.json(domains);
    } catch (error) {
      console.error("Error fetching unique email domains:", error);
      res.status(500).json({ message: "Failed to retrieve email domains." });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUserByEmpCode = await storage.getUserByEmployeeNumber(userData.emp_code);
      if (existingUserByEmpCode) {
        return res.status(400).json({ message: "Employee code already exists" });
      }

      if (!userData.email) {
          return res.status(400).json({ message: "Email is required for signup." });
      }
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        must_reset_password: true,
      });

      req.session.user = {
        id: newUser.emp_code,
        employeeNumber: newUser.emp_code,
        fullName: newUser.name,
        email: newUser.email,
        department: newUser.department,
        location: newUser.location,
        role: newUser.role,
      };

      res.status(201).json({ user: req.session.user, message: "User created. Please proceed to login and reset your password if prompted." });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const user = await storage.getUserByEmail(email);

      if (user && user.email) {
        const resetLink = `http://${req.headers.host}/reset-password?email=${encodeURIComponent(user.email)}`;
        await sendPasswordResetEmail(user.email, resetLink);
      }
      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string().min(6, "Password must be at least 6 characters."),
      }).parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid email or reset link." });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(user.emp_code, hashedPassword);

      res.json({ message: "Your password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/user", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const safeUser = {
        id: user.emp_code,
        employeeNumber: user.emp_code,
        fullName: user.name,
        email: user.email,
        department: user.department,
        location: user.location,
        role: user.role,
      };
      res.json(safeUser);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/purchase-requests", requireAuth, async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Purchase requests are not enabled with the current database schema.", requiredModels: ["PurchaseRequest", "LineItem", "ApprovalWorkflow", "Notification"] });
    } catch (error: any) {
      console.error("Create purchase request error:", error);
      res.status(500).json({ message: "Internal server error", details: error.message });
    }
  });

  app.get("/api/purchase-requests/:id", requireAuth, async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Purchase requests are not enabled with the current database schema." });
    } catch (error) {
      console.error("Get purchase request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/purchase-requests", requireAuth, async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Purchase requests are not enabled with the current database schema." });
    } catch (error) {
      console.error("Get purchase requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/purchase-requests/:id/details", requireAuth, async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Purchase request details are not enabled with the current database schema." });
    } catch (error) {
      console.error("Get purchase request details error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/purchase-requests/:id", requireAuth, async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Updating purchase requests is not enabled with the current database schema." });
    } catch (error) {
      console.error("Update purchase request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/purchase-requests/:id/line-items", requireAuth, async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Line items are not enabled with the current database schema." });
    } catch (error: any) {
      console.error("Create line item error:", error);
      res.status(500).json({ message: "Internal server error", details: error.message });
    }
  });

  app.get("/api/purchase-requests/:id/line-items", requireAuth, async (req, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Line items are not enabled with the current database schema." });
    } catch (error) {
      console.error("Get line items error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/purchase-requests/:requestId/line-items/:itemId", requireAuth, async (req, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Line items are not enabled with the current database schema." });
    } catch (error) {
      console.error("Delete line item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/purchase-requests/:requestId/line-items/:itemId", requireAuth, async (req, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Line items are not enabled with the current database schema." });
    } catch (error) {
      console.error("Update line item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/purchase-requests/:id/attachments", requireAuth, upload.array('files', 10), async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Attachments are not enabled with the current database schema." });
    } catch (error) {
      console.error("Upload attachments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/purchase-requests/:id/attachments", requireAuth, async (req, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Attachments are not enabled with the current database schema." });
    } catch (error) {
      console.error("Get attachments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/purchase-requests/:id/approve", requireAuth, requireRole(['approver', 'admin']), async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Approval workflow is not enabled with the current database schema." });
    } catch (error) {
      console.error("Approve request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/purchase-requests/:id/reject", requireAuth, requireRole(['approver', 'admin']), async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Approval workflow is not enabled with the current database schema." });
    } catch (error) {
      console.error("Reject request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/purchase-requests/:id/return", requireAuth, requireRole(['approver', 'admin']), async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Approval workflow is not enabled with the current database schema." });
    } catch (error) {
      console.error("Return request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/stats", requireAuth, async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Dashboard statistics are not available with the current database schema." });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Notifications are not enabled with the current database schema." });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Notifications are not enabled with the current database schema." });
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/reports/purchase-requests', requireAuth, async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Purchase request reports are not enabled with the current database schema." });
    } catch (error) {
      console.error('Error fetching reports data:', error);
      res.status(500).json({ message: 'Failed to fetch reports data' });
    }
  });

  app.get('/api/admin/users', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

    app.get('/api/admin/masters/:type', requireAuth, requireRole(['admin']), async (req: any, res) => {
        try {
            const { type } = req.params;
            // 1. Extract and parse parameters from the query string sent by the frontend
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 10;
            const search = (req.query.search as string) || '';
            // 2. Bundle these parameters into a single 'options' object
            const options = { page, pageSize, search };
            // This variable will hold the { data, totalCount } object from the storage layer
            let result: { data: any[], totalCount: number };

            // 3. Pass the SINGLE 'options' object to the correct storage function
            switch (type) {
                case 'users':
                    result = await storage.getAllUsers(options);
                    break;
                case 'departments':
                    result = await storage.getAllDepartments(options);
                    break;
                case 'sites':
                    result = await storage.getAllSites(options);
                    break;
                case 'approval-matrix':
                    result = await storage.getAllApprovalMatrix(options);
                    break;
                // You can add more cases here as you implement them in storage.ts
                // e.g., case 'vendors': result = await storage.getAllVendors(options); break;
                default:
                    // For types not yet implemented, return an empty result to avoid frontend errors
                    console.warn(`WARN: GET request for unimplemented master type: ${type}`);
                    return res.json({ data: [], totalCount: 0 });
            }

            // 4. Send the entire result object back to the frontend
            res.json(result);
        } catch (error) {
            console.error(`Error fetching ${req.params.type} master data:`, error);
            res.status(500).json({ message: `Failed to fetch ${req.params.type} data` });
        }
    });

  app.post('/api/admin/masters/:type', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { type } = req.params;
      let result;

      switch (type) {
        case 'users':
          const userData = insertUserSchema.parse(req.body);
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          result = await storage.createUser({ ...userData, password: hashedPassword, must_reset_password: true });
          break;
        case 'departments':
          result = await storage.createDepartment(req.body);
          break;
        case 'sites':
          result = await storage.createSite(req.body);
          break;
        case 'approval-matrix':
          result = await storage.createApprovalMatrix(req.body);
          break;
        default:
          return res.status(400).json({ message: 'Invalid master type or master type not supported by current schema.' });
      }

      res.status(201).json(result);
    } catch (error: any) {
      console.error(`Error creating ${req.params.type}:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: `Failed to create ${req.params.type}`, details: error.message });
    }
  });

  app.put('/api/admin/masters/:type/:id', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { type, id } = req.params;
      let result;

      switch (type) {
        case 'users':
          if (req.body.password && req.body.password.length > 0) {
            req.body.password = await bcrypt.hash(req.body.password, 10);
          }
          result = await storage.updateUser(id, req.body);
          break;
        case 'departments':
          result = await storage.updateDepartment(id, req.body);
          break;
        case 'sites':
          result = await storage.updateSite(BigInt(id), req.body);
          break;
        case 'approval-matrix':
          result = await storage.updateApprovalMatrix(id, req.body);
          break;
        default:
          return res.status(400).json({ message: 'Invalid master type or master type not supported by current schema.' });
      }

      res.json(result);
    } catch (error: any) {
      console.error(`Error updating ${req.params.type}:`, error);
      res.status(500).json({ message: `Failed to update ${req.params.type}`, details: error.message });
    }
  });

  app.delete('/api/admin/masters/:type/:id', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { type, id } = req.params;

      switch (type) {
        case 'users':
          await storage.deleteUser(id);
          break;
        case 'departments':
          await storage.deleteDepartment(id);
          break;
        case 'sites':
          await storage.deleteSite(BigInt(id));
          break;
        case 'approval-matrix':
          await storage.deleteApprovalMatrix(id);
          break;
        default:
          return res.status(400).json({ message: 'Invalid master type or master type not supported by current schema.' });
      }

      res.json({ message: 'Record deleted successfully' });
    } catch (error: any) {
      console.error(`Error deleting ${req.params.type}:`, error);
      res.status(500).json({ message: `Failed to delete ${req.params.type}`, details: error.message });
    }
  });

  app.get('/api/inventory', requireAuth, async (req: any, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Inventory is not enabled with the current database schema." });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ message: 'Failed to fetch inventory' });
    }
  });

  app.get("/api/approval-workflow", requireAuth, async (req, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Dynamic approval workflow is not enabled with the current database schema (uses fixed approval_matrix)." });
    } catch (error) {
      console.error("Get approval workflow error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/approval-history/:requestId", requireAuth, async (req, res) => {
    try {
      return res.status(501).json({ message: "Feature not implemented: Approval history is not enabled with the current database schema." });
    } catch (error) {
      console.error("Get approval history error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}