import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendPasswordResetEmail } from "./email";

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
      // 'application/msword',
      // 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
      const { email, password, rememberMe } = z.object({
        email: z.string().email("Invalid email format."),
        password: z.string(),
        rememberMe: z.boolean().optional().default(false),
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
        id: String(user.emp_code),
        emp_code: String(user.emp_code),
        employeeNumber: String(user.emp_code),
        fullName: user.name ?? "",
        email: user.email ?? "",
        department: user.department ?? "",
        location: user.location ?? "",
        role: user.role ?? "",
      };

      // Set session cookie maxAge based on rememberMe
      if (rememberMe) {
        // 30 days for "Remember Me"
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      } else {
        // 24 hours for regular sessions
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
      }

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
        id: String(newUser.emp_code),
        emp_code: String(newUser.emp_code),
        employeeNumber: String(newUser.emp_code),
        fullName: newUser.name ?? "",
        email: newUser.email ?? "",
        department: newUser.department ?? "",
        location: newUser.location ?? "",
        role: newUser.role ?? "",
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
        emp_code: user.emp_code,
        employeeNumber: user.emp_code,
        fullName: user.name,
        email: user.email,
        department: user.department,
        location: user.location,
        role: user.role,
        entity: user.entity,
      };
      res.json(safeUser);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/purchase-requests", requireAuth, async (req: any, res) => {
    try {
      const {
        entity,
        title,
        requestDate,
        department,
        location,
        businessJustificationCode,
        businessJustificationDetails,
        totalEstimatedCost,
        lineItems,
      } = req.body;
      // requesterEmpCode from session
      const requesterEmpCode = req.session.user?.employeeNumber || req.session.user?.emp_code;
      if (!entity || !title || !requestDate || !department || !location || !businessJustificationCode || !businessJustificationDetails || !totalEstimatedCost || !lineItems) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      // Map frontend line items to backend fields
      const mappedLineItems = lineItems.map((item: any) => ({
        productname: item.itemName,
        requiredquantity: Number(item.requiredQuantity),
        unit_of_measure: item.unitOfMeasure,
        vendoraccountnumber: item.vendor?.vendoraccountnumber || null,
        requiredbydate: item.requiredByDate ? new Date(item.requiredByDate.split('-').reverse().join('-')) : new Date(),
        deliverylocation: item.deliveryLocation,
        estimated_cost: Number(item.estimatedCost),
        item_justification: item.itemJustification || null,
      }));
      const pr = await storage.createPurchaseRequest({
        entity,
        title,
        requestDate: new Date(requestDate),
        department,
        location,
        businessJustificationCode,
        businessJustificationDetails,
        totalEstimatedCost: parseFloat(totalEstimatedCost),
        requesterEmpCode,
        createdBy: req.session.user?.emp_code || requesterEmpCode,
        updatedBy: req.session.user?.emp_code || requesterEmpCode,
        status: req.body.status || 'pending',
        lineItems: mappedLineItems,
      });
      // Optionally fetch the PR from DB for freshest data
      const prFromDb = await storage.getPurchaseRequest(pr.pr_number);
      // Send email to first approver
      try {
        const approvalMatrixList = await storage.getAllApprovalMatrix();
        const approvalMatrix = approvalMatrixList.find((m: any) => String(m.emp_code) === String(requesterEmpCode) || (m.department === department && m.site === location));
        if (approvalMatrix && approvalMatrix.approver_1_emp_code) {
          const approver = await storage.getUserByEmployeeNumber(approvalMatrix.approver_1_emp_code);
          const requesterUser = await storage.getUserByEmployeeNumber(requesterEmpCode);
          const requesterName = requesterUser && typeof requesterUser.name === 'string' ? requesterUser.name : '';
          if (approver && typeof approver.email === 'string') {
            const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/approve/${pr.pr_number}`;
          }
        }
      } catch (err) {
        console.error('Error sending email to first approver:', err);
      }
      res.status(201).json(prFromDb || pr);
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
      // Extract filters from query params
      const filters: any = {};
      if (req.query.createdBy) {
        filters.createdBy = req.query.createdBy;
      }
      if (req.query.currentApproverId) {
        filters.currentApproverId = req.query.currentApproverId;
      }
      if (req.query.approverEmpCode) {
        filters.approverEmpCode = req.query.approverEmpCode;
      }
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.department) {
        filters.department = req.query.department;
      }
      if (req.query.location) {
        filters.location = req.query.location;
      }
      // Add more filters as needed
      const requests = await storage.getAllPurchaseRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Get purchase requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/purchase-requests/:id/details", requireAuth, async (req: any, res) => {
    try {
      const id = req.params.id;
      // Use a public method on storage to fetch the request with line items
      const reqData = await storage.getPurchaseRequestWithLineItems(id);
      if (!reqData) {
        return res.status(404).json({ message: "Purchase request not found" });
      }
      // Map DB fields to API fields as in getAllPurchaseRequests
      const result = {
        id: String(reqData.pr_number),
        requisitionNumber: String(reqData.pr_number),
        title: reqData.title,
        requestDate: reqData.request_date,
        department: reqData.department,
        location: reqData.location,
        entity: reqData.users_purchase_requests_created_byTousers?.entity,
        businessJustificationCode: reqData.business_justification_code,
        businessJustificationDetails: reqData.business_justification_details,
        status: reqData.status,
        currentApprovalLevel: reqData.current_approval_level,
        totalEstimatedCost: reqData.total_estimated_cost,
        requesterId: reqData.requester_emp_code ? String(reqData.requester_emp_code) : undefined,
        currentApproverId: reqData.current_approver_emp_code ? String(reqData.current_approver_emp_code) : undefined,
        createdAt: reqData.created_at,
        updatedAt: reqData.updated_at,
        lineItems: (reqData.line_items || []).map((item: any) => ({
          id: item.id,
          itemName: item.productname,
          requiredQuantity: item.requiredquantity,
          unitOfMeasure: item.unit_of_measure,
          requiredByDate: item.requiredbydate,
          deliveryLocation: item.deliverylocation,
          estimatedCost: item.estimated_cost,
          itemJustification: item.item_justification,
          vendor: item.vendors ? { vendorsearchname: item.vendors.vendorsearchname } : undefined,
        })),
      };
      res.json(result);
    } catch (error) {
      console.error("Get purchase request details error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/purchase-requests/:id", requireAuth, async (req: any, res) => {
    try {
      const prNumber = req.params.id;
      const user = req.session.user;
      // Fetch the purchase request
      const pr = await storage.getPurchaseRequest(prNumber);
      if (!pr) return res.status(404).json({ message: "Purchase request not found" });
      // If resubmitting from 'returned', reset approval flow
      let updateData = req.body;
      if ('entity' in updateData) {
        delete updateData.entity;
      }
      // Map camelCase to snake_case
      const fieldMap = {
        requestDate: 'request_date',
        businessJustificationCode: 'business_justification_code',
        businessJustificationDetails: 'business_justification_details',
        totalEstimatedCost: 'total_estimated_cost',
        currentApprovalLevel: 'current_approval_level',
        currentApproverId: 'current_approver_emp_code',
        requesterId: 'requester_emp_code',
      };
      for (const [camel, snake] of Object.entries(fieldMap)) {
        if (camel in updateData) {
          updateData[snake] = updateData[camel];
          delete updateData[camel];
        }
      }
      // Convert request_date to Date if needed
      if (updateData.request_date && typeof updateData.request_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(updateData.request_date)) {
        updateData.request_date = new Date(updateData.request_date);
      }
      if (pr.status === 'returned') {
        // Get approval matrix for requester
        const approvalMatrixList = await storage.getAllApprovalMatrix();
        const approvalMatrix = approvalMatrixList.find((m: any) => String(m.emp_code) === String(pr.requester_emp_code));
        if (!approvalMatrix || !approvalMatrix.approver_1_emp_code) {
          return res.status(400).json({ message: "Approval matrix or first approver not found for requester" });
        }
        updateData.status = 'pending';
        updateData.current_approval_level = 1;
        updateData.current_approver_emp_code = approvalMatrix.approver_1_emp_code;
        // Log resubmission
        await storage.createAuditLog({
          pr_number: prNumber,
          approver_emp_code: String(user.emp_code),
          approval_level: 0,
          action: "resubmitted",
          comment: req.body.resubmissionComment || undefined,
        });
      }
      await storage.updatePurchaseRequest(prNumber, updateData);
      // If resubmitted from returned, send email to first approver
      if (pr.status === 'returned') {
        try {
          const updatedPr = await storage.getPurchaseRequest(prNumber);
          const approvalMatrixList = await storage.getAllApprovalMatrix();
          const approvalMatrix = approvalMatrixList.find((m: any) => String(m.emp_code) === String(updatedPr.requester_emp_code));
          if (approvalMatrix && approvalMatrix.approver_1_emp_code) {
            const approver = await storage.getUserByEmployeeNumber(approvalMatrix.approver_1_emp_code);
            const requesterUser = await storage.getUserByEmployeeNumber(updatedPr.requester_emp_code);
            const requesterName = requesterUser && typeof requesterUser.name === 'string' ? requesterUser.name : '';
            if (approver && typeof approver.email === 'string') {
              const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/approve/${prNumber}`;
            }
          }
        } catch (err) {
          console.error('Error sending email to first approver on resubmission:', err);
        }
      }
      res.json({ message: "Request updated successfully" });
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
      const prNumber = req.params.id;
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      // Only allow PDF and XLSX
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      const uploadedFiles = req.files.filter((file: any) => allowedTypes.includes(file.mimetype));
      if (uploadedFiles.length === 0) {
        return res.status(400).json({ message: "No valid PDF or XLSX files uploaded" });
      }
      // Save file metadata to DB
      const attachments = await Promise.all(uploadedFiles.map((file: any) =>
        storage.createAttachment({
          purchase_request_id: prNumber,
          file_name: file.filename,
          original_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          file_path: file.path,
        })
      ));
      res.status(201).json({ attachments });
    } catch (error) {
      console.error("Upload attachments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/purchase-requests/:id/attachments", requireAuth, async (req, res) => {
    try {
      const prNumber = req.params.id;
      const attachments = await storage.getAttachmentsForRequest(prNumber);
      res.json(attachments);
    } catch (error) {
      console.error("Get attachments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/purchase-requests/:id/approve", requireAuth, async (req: any, res) => {
    try {
      const prNumber = req.params.id;
      const user = req.session.user;
      const comment = req.body.comment || null;
      // Fetch the purchase request, approval matrix, and audit logs
      const pr = await storage.getPurchaseRequest(prNumber);
      if (!pr) return res.status(404).json({ message: "Purchase request not found" });
      const approvalMatrixList = await storage.getAllApprovalMatrix();
      const approvalMatrix = approvalMatrixList.find((m: any) => String(m.emp_code) === String(pr.requester_emp_code));
      if (!approvalMatrix) return res.status(400).json({ message: "Approval matrix not found for requester" });
      const auditLogs = await storage.getAllApprovalHistory ? await storage.getAllApprovalHistory() : [];
      // Only consider audit logs for this PR
      const prAuditLogs = auditLogs.filter(l => l.pr_number === prNumber);
      let currentLevel = pr.current_approval_level || 1;
      let currentApprover = pr.current_approver_emp_code;
      const isAdmin = user.role === 'admin';
      // Only allow if user is current approver (from matrix) or admin
      let allowed = false;
      if (isAdmin) allowed = true;
      else if (currentLevel === 1 && approvalMatrix.approver_1_emp_code === user.emp_code) allowed = true;
      else if (currentLevel === 2 && approvalMatrix.approver_2_emp_code === user.emp_code) allowed = true;
      else if (currentLevel === 3 && (approvalMatrix.approver_3a_emp_code === user.emp_code || approvalMatrix.approver_3b_emp_code === user.emp_code)) allowed = true;
      if (!allowed) {
        return res.status(403).json({ message: "You are not authorized to approve this request at this stage." });
      }
      // Admin override: approve directly
      if (isAdmin) {
        console.log(`[APPROVAL] Admin override for PR ${prNumber}`);
        try {
          await storage.updatePurchaseRequest(prNumber, {
            status: "approved",
            current_approval_level: 3,
            current_approver_emp_code: String(user.emp_code),
          });
        } catch (err) {
          console.error(`[APPROVAL] ERROR updating PR for admin override:`, err);
          return res.status(500).json({ message: "Failed to update purchase request (admin override)." });
        }
        try {
          await storage.createAuditLog({
            pr_number: prNumber,
            approver_emp_code: String(user.emp_code),
            approval_level: 4,
            action: "admin_approved",
            comment,
          });
        } catch (err) {
          console.error(`[APPROVAL] ERROR creating audit log for admin override:`, err);
        }
        // Removed email sending logic here
        return res.json({ message: "Request approved by admin." });
      }
      // Normal approval flow
      const nextStep = storage.getNextApprovalStep(approvalMatrix, currentLevel, 'approve', currentApprover, prAuditLogs);
      console.log(`[APPROVAL] PR ${prNumber} currentLevel=${currentLevel}, nextStep=`, nextStep);
      if (nextStep.isFinal) {
        try {
          await storage.updatePurchaseRequest(prNumber, {
            status: "approved",
            current_approval_level: 3,
            current_approver_emp_code: String(user.emp_code),
          });
        } catch (err) {
          console.error(`[APPROVAL] ERROR updating PR for final approval:`, err);
          return res.status(500).json({ message: "Failed to update purchase request (final approval)." });
        }
        try {
          await storage.createAuditLog({
            pr_number: prNumber,
            approver_emp_code: String(user.emp_code),
            approval_level: currentLevel,
            action: "approved",
            comment,
          });
        } catch (err) {
          console.error(`[APPROVAL] ERROR creating audit log for final approval:`, err);
        }
        // Removed email sending logic here
        return res.json({ message: "Request fully approved." });
      } else {
        // Move to next approver/level
        let nextApprover = nextStep.nextApprover;
        let nextLevel = nextStep.nextLevel;
        if (!nextApprover || !nextLevel) {
          console.error(`[APPROVAL] ERROR: nextApprover or nextLevel is missing for PR ${prNumber}. nextStep=`, nextStep);
          return res.status(500).json({ message: "Approval matrix misconfiguration: next approver or level missing." });
        }
        // For parallel, keep both as possible approvers
        if (Array.isArray(nextApprover)) {
          try {
            await storage.createAuditLog({
              pr_number: prNumber,
              approver_emp_code: String(user.emp_code),
              approval_level: currentLevel,
              action: "approved",
              comment,
            });
          } catch (err) {
            console.error(`[APPROVAL] ERROR creating audit log for parallel approval:`, err);
          }
          const auditLogsNow = await storage.getAllApprovalHistory ? await storage.getAllApprovalHistory() : [];
          const prAuditLogsNow = auditLogsNow.filter(l => l.pr_number === prNumber);
          const approvedBy3a = prAuditLogsNow.some(l => l.approver_emp_code === approvalMatrix.approver_3a_emp_code && typeof l.action === 'string' && l.action.startsWith('approved'));
          const approvedBy3b = prAuditLogsNow.some(l => l.approver_emp_code === approvalMatrix.approver_3b_emp_code && typeof l.action === 'string' && l.action.startsWith('approved'));
          if (approvedBy3a || approvedBy3b) {
            try {
              await storage.updatePurchaseRequest(prNumber, {
                status: "approved",
                current_approval_level: 3,
                current_approver_emp_code: String(user.emp_code),
              });
            } catch (err) {
              console.error(`[APPROVAL] ERROR updating PR for parallel final approval:`, err);
              return res.status(500).json({ message: "Failed to update purchase request (parallel final approval)." });
            }
            return res.json({ message: "Request fully approved." });
          } else {
            try {
              await storage.updatePurchaseRequest(prNumber, {
                status: "pending",
                current_approval_level: 3,
                current_approver_emp_code: null, // Both can approve
              });
            } catch (err) {
              console.error(`[APPROVAL] ERROR updating PR for parallel waiting:`, err);
              return res.status(500).json({ message: "Failed to update purchase request (parallel waiting)." });
            }
            // Removed email sending logic here
            return res.json({ message: "Approved by one, waiting for other approver at level 3." });
          }
        } else {
          console.log(`[APPROVAL] Updating PR ${prNumber} to nextLevel=${nextLevel}, nextApprover=${nextApprover}`);
          try {
            await storage.updatePurchaseRequest(prNumber, {
              status: "pending",
              current_approval_level: nextLevel,
              current_approver_emp_code: nextApprover,
            });
          } catch (err) {
            console.error(`[APPROVAL] ERROR updating PR for next approver:`, err);
            return res.status(500).json({ message: "Failed to update purchase request (next approver)." });
          }
          try {
            await storage.createAuditLog({
              pr_number: prNumber,
              approver_emp_code: String(user.emp_code),
              approval_level: currentLevel,
              action: "approved",
              comment,
            });
          } catch (err) {
            console.error(`[APPROVAL] ERROR creating audit log for next approver:`, err);
          }
          // Send email to next approver
          try {
            const nextApproverUser = await storage.getUserByEmployeeNumber(nextApprover);
            const requesterUser = await storage.getUserByEmployeeNumber(pr.requester_emp_code);
            const requesterName = requesterUser && typeof requesterUser.name === 'string' ? requesterUser.name : '';
            if (nextApproverUser && typeof nextApproverUser.email === 'string') {
              const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/approve/${prNumber}`;
            }
          } catch (err) {
            console.error('Error sending email to next approver:', err);
          }
          return res.json({ message: `Moved to next approver at level ${nextLevel}.` });
        }
      }
    } catch (error) {
      console.error("Approve request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/purchase-requests/:id/reject", requireAuth, async (req: any, res) => {
    try {
      const prNumber = req.params.id;
      const user = req.session.user;
      const comment = req.body.comment || null;
      const pr = await storage.getPurchaseRequest(prNumber);
      if (!pr) return res.status(404).json({ message: "Purchase request not found" });
      const approvalMatrixList = await storage.getAllApprovalMatrix();
      const approvalMatrix = approvalMatrixList.find((m: any) => String(m.emp_code) === String(pr.requester_emp_code));
      if (!approvalMatrix) return res.status(400).json({ message: "Approval matrix not found for requester" });
      let currentLevel = pr.current_approval_level || 1;
      const isAdmin = user.role === 'admin';
      let allowed = false;
      if (isAdmin) allowed = true;
      else if (currentLevel === 1 && approvalMatrix.approver_1_emp_code === user.emp_code) allowed = true;
      else if (currentLevel === 2 && approvalMatrix.approver_2_emp_code === user.emp_code) allowed = true;
      else if (currentLevel === 3 && (approvalMatrix.approver_3a_emp_code === user.emp_code || approvalMatrix.approver_3b_emp_code === user.emp_code)) allowed = true;
      if (!allowed) {
        return res.status(403).json({ message: "You are not authorized to reject this request at this stage." });
      }
      // Set status to rejected, clear approver
      try {
        await storage.updatePurchaseRequest(prNumber, {
          status: "rejected",
          current_approval_level: null,
          current_approver_emp_code: null,
        });
      } catch (err) {
        console.error(`[REJECT] ERROR updating PR:`, err);
        return res.status(500).json({ message: "Failed to update purchase request (reject)." });
      }
      try {
        await storage.createAuditLog({
          pr_number: prNumber,
          approver_emp_code: user.emp_code,
          approval_level: currentLevel,
          action: "rejected",
          comment,
        });
      } catch (err) {
        console.error(`[REJECT] ERROR creating audit log:`, err);
      }
      res.json({ message: "Request rejected." });
    } catch (error) {
      console.error("Reject request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/purchase-requests/:id/return", requireAuth, async (req: any, res) => {
    try {
      const prNumber = req.params.id;
      const user = req.session.user;
      const comment = req.body.comment || null;
      const pr = await storage.getPurchaseRequest(prNumber);
      if (!pr) return res.status(404).json({ message: "Purchase request not found" });
      const approvalMatrixList = await storage.getAllApprovalMatrix();
      const approvalMatrix = approvalMatrixList.find((m: any) => String(m.emp_code) === String(pr.requester_emp_code));
      if (!approvalMatrix) return res.status(400).json({ message: "Approval matrix not found for requester" });
      let currentLevel = pr.current_approval_level || 1;
      const isAdmin = user.role === 'admin';
      let allowed = false;
      if (isAdmin) allowed = true;
      else if (currentLevel === 1 && approvalMatrix.approver_1_emp_code === user.emp_code) allowed = true;
      else if (currentLevel === 2 && approvalMatrix.approver_2_emp_code === user.emp_code) allowed = true;
      else if (currentLevel === 3 && (approvalMatrix.approver_3a_emp_code === user.emp_code || approvalMatrix.approver_3b_emp_code === user.emp_code)) allowed = true;
      if (!allowed) {
        return res.status(403).json({ message: "You are not authorized to return this request at this stage." });
      }
      // Set status to returned, clear approver
      try {
        await storage.updatePurchaseRequest(prNumber, {
          status: "returned",
          current_approval_level: null,
          current_approver_emp_code: null,
        });
      } catch (err) {
        console.error(`[RETURN] ERROR updating PR:`, err);
        return res.status(500).json({ message: "Failed to update purchase request (return)." });
      }
      try {
        await storage.createAuditLog({
          pr_number: prNumber,
          approver_emp_code: user.emp_code,
          approval_level: currentLevel,
          action: "returned",
          comment,
        });
      } catch (err) {
        console.error(`[RETURN] ERROR creating audit log:`, err);
      }
      res.json({ message: "Request returned for edit." });
    } catch (error) {
      console.error("Return request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/stats", requireAuth, async (req: any, res) => {
    try {
      const userEmpCode = req.session.user?.emp_code;
      const requests = await storage.getAllPurchaseRequests({ createdBy: userEmpCode });
      const stats = {
        totalRequests: requests.length,
        pendingRequests: requests.filter(r => r.status === 'pending').length,
        approvedRequests: requests.filter(r => r.status === 'approved').length,
        rejectedRequests: requests.filter(r => r.status === 'rejected').length,
        returnedRequests: requests.filter(r => r.status === 'returned').length,
        totalValue: requests.reduce((sum, r) => sum + (parseFloat(r.total_estimated_cost || '0')), 0),
      };
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/reports/purchase-requests', requireAuth, async (req: any, res) => {
    try {
      // Extract filters from query params (same as /api/purchase-requests)
      const filters: any = {};
      if (req.query.createdBy) filters.createdBy = req.query.createdBy;
      if (req.query.currentApproverId) filters.currentApproverId = req.query.currentApproverId;
      if (req.query.approverEmpCode) filters.approverEmpCode = req.query.approverEmpCode;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.department) filters.department = req.query.department;
      if (req.query.location) filters.location = req.query.location;
      // Add more filters as needed
      const requests = await storage.getAllPurchaseRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching reports data:', error);
      res.status(500).json({ message: 'Failed to fetch reports data' });
    }
  });

  app.get('/api/admin/users', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const search = (req.query.search as string) || "";
      const users = await storage.getAllUsers(search);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/users', requireAuth, async (req: any, res) => {
    try {
      const search = (req.query.search as string) || "";
      const users = await storage.getAllUsers(search);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/masters/:type', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { type } = req.params;
      const search = req.query.search as string || '';
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const sortKey = req.query.sortKey as string || '';
      const sortOrderParam = (req.query.sortOrder as string || 'asc').toLowerCase();
      const sortOrder: 'asc' | 'desc' = sortOrderParam === 'desc' ? 'desc' : 'asc';
      let result;
      switch (type) {
        case 'users':
          result = await storage.getAllUsers(search, sortKey, sortOrder);
          break;
        case 'departments':
          result = await storage.getAllDepartments(search, sortKey, sortOrder);
          break;
        case 'sites':
          result = await storage.getAllSites(search, sortKey, sortOrder);
          result = result.map(site => ({ ...site, id: site.id.toString() }));
          break;
        case 'approval-matrix':
          result = await storage.getAllApprovalMatrix(search, sortKey, sortOrder);
          break;
        case 'inventory':
          result = await storage.getAllInventory(search, sortKey, sortOrder);
          break;
        case 'vendors':
          result = await storage.getAllVendors(search, sortKey, sortOrder);
          break;
        default:
          console.warn(`WARN: GET request for unimplemented master type: ${type}`);
          return res.json({ data: [], totalCount: 0 });
      }
      const totalCount = result.length;
      const pagedData = result.slice((page - 1) * pageSize, page * pageSize);
      res.json({ data: pagedData, totalCount });
    } catch (error) {
      console.error(`Error fetching ${req.params.type} master data:`, error);
      res.status(500).json({ message: `Error fetching ${req.params.type} master data: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
  
  app.get('/api/inventory', requireAuth, async (req: any, res) => {
    try {
      const search = (req.query.search as string) || "";
      const inventory = await storage.getAllInventory(search);
      res.json(inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ message: 'Failed to fetch inventory' });
    }
  });

  // Vendor searchnames for dropdown
  app.get('/api/vendors/searchnames', requireAuth, async (req, res) => {
    try {
      const search = req.query.search ? String(req.query.search).toLowerCase() : "";
      const vendors = await storage.getAllVendors();
      // Only return non-empty vendorsearchname, sorted alphabetically, and filter by search if provided
      const filtered = vendors
        .filter(v => typeof v.vendorsearchname === 'string' && v.vendorsearchname.trim() !== "")
        .filter(v =>
          !search ||
          (typeof v.vendorsearchname === 'string' && v.vendorsearchname.toLowerCase().includes(search)) ||
          (typeof v.vendororganizationname === 'string' && v.vendororganizationname.toLowerCase().includes(search))
        )
        .sort((a, b) => (a.vendorsearchname || '').localeCompare(b.vendorsearchname || ''))
        .map(v => ({
          vendorsearchname: v.vendorsearchname,
          vendoraccountnumber: v.vendoraccountnumber,
          vendororganizationname: v.vendororganizationname
        }));
      res.json(filtered);
    } catch (error) {
      console.error('Error fetching vendor searchnames:', error);
      res.status(500).json({ message: 'Failed to fetch vendor searchnames' });
    }
  });

  app.get('/api/admin/masters/locations', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  app.get('/api/admin/reports/locations', async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  // Download a specific attachment by id
  app.get("/api/attachments/:id/download", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid attachment id" });
      const attachment = await storage.getAttachment(id);
      if (!attachment) return res.status(404).json({ message: "Attachment not found" });
      // Use the file_path to send the file
      const filePath = path.resolve(attachment.file_path);
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found on server" });
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name}"`);
      res.setHeader('Content-Type', attachment.mime_type);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download attachment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/purchase-requests/:id/audit-logs", requireAuth, async (req, res) => {
    try {
      const prNumber = req.params.id;
      const auditLogs = await storage.getAllApprovalHistory();
      const prAuditLogs = auditLogs.filter(l => l.pr_number === prNumber);
      res.json(prAuditLogs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user by emp_code
  app.get('/api/users/:emp_code', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.emp_code);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // ADMIN MASTERS
  // CREATE
  app.post('/api/admin/masters/:type', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { type } = req.params;
      const data = req.body;
      let result;
      switch (type) {
        case 'users':
          const tempPassword = 'Temp@123';
          const hashedPassword = await bcrypt.hash(tempPassword, 10);
          result = await storage.createUser({
            ...data,
            password: hashedPassword,
            must_reset_password: true,
          });
          break;
        case 'departments':
          result = await storage.createDepartment(data);
          break;
        case 'sites':
          result = await storage.createSite(data);
          result = { ...result, id: result.id.toString() };
          break;
        case 'approval-matrix':
          result = await storage.createApprovalMatrix(data);
          break;
        case 'inventory':
          result = await storage.createInventory(data);
          break;
        case 'vendors':
          result = await storage.createVendor(data);
          break;
        default:
          return res.status(400).json({ message: `POST not supported for master type: ${type}` });
      }
      res.status(201).json(result);
    } catch (error) {
      console.error(`Error creating ${req.params.type} master data:`, error);
      res.status(500).json({ message: `Error creating ${req.params.type} master data: ${error instanceof Error ? error.message : String(error)}` });
    }
  });

  // UPDATE
  app.put('/api/admin/masters/:type/:id', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const { type, id } = req.params;
      const data = req.body;
      let result;
      switch (type) {
        case 'users':
          result = await storage.updateUser(id, data);
          break;
        case 'departments':
          result = await storage.updateDepartment(id, data);
          break;
        case 'sites':
          result = await storage.updateSite(BigInt(id), data);
          result = { ...result, id: result.id.toString() };
          break;
        case 'approval-matrix':
          result = await storage.updateApprovalMatrix(id, data);
          break;
        case 'inventory':
          result = await storage.updateInventory(id, data);
          break;
        case 'vendors':
          result = await storage.updateVendor(id, data);
          break;
        default:
          return res.status(400).json({ message: `PUT not supported for master type: ${type}` });
      }
      res.json(result);
    } catch (error) {
      console.error(`Error updating ${req.params.type} master data:`, error);
      res.status(500).json({ message: `Error updating ${req.params.type} master data: ${error instanceof Error ? error.message : String(error)}` });
    }
  });

  // DELETE
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
        case 'inventory':
          await storage.deleteInventory(id);
          break;
        case 'vendors':
          await storage.deleteVendor(id);
          break;
        default:
          return res.status(400).json({ message: `DELETE not supported for master type: ${type}` });
      }
      res.json({ message: `${type} record deleted successfully` });
    } catch (error) {
      console.error(`Error deleting ${req.params.type} master data:`, error);
      res.status(500).json({ message: `Error deleting ${req.params.type} master data: ${error instanceof Error ? error.message : String(error)}` });
    }
  });

  // Catch-all for unknown API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ message: 'API route not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}