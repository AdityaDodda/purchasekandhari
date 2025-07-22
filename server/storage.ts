import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

// Import specific types from your schema.prisma.
import type {
  users as User,
  approval_matrix as ApprovalMatrix,
  departments as Department,
  sites as Site,
  inventory as InventoryModel,
  vendors as VendorModel,
} from "@prisma/client";

// Explicit 'any' types for models not present in your schema.prisma
type PurchaseRequest = any;
type LineItem = any;
type Attachment = any;
type ApprovalHistory = any;
type ApprovalWorkflow = any;
type Entity = any;
type Location = any;
type Role = any;
type EscalationMatrix = any;

// Use the properly imported Prisma model types
type Inventory = InventoryModel;
type Vendor = VendorModel; // NEW: Proper type for Vendor

// Define input types using Prisma's generated input types
type InsertUser = Prisma.usersCreateInput;
type InsertApprovalMatrix = Prisma.approval_matrixCreateInput;
type InsertDepartment = Prisma.departmentsCreateInput;
type InsertSite = Prisma.sitesCreateInput;
type InsertInventory = Prisma.inventoryCreateInput;
type UpdateInventory = Prisma.inventoryUpdateInput;
type InsertVendor = Prisma.vendorsCreateInput; // NEW: Proper type for vendor creation
type UpdateVendor = Prisma.vendorsUpdateInput; // NEW: Proper type for vendor update


// Explicit 'any' types for insert types of models not present in your schema.prisma
type InsertPurchaseRequest = any;
type InsertLineItem = any;
type InsertAttachment = any;
type InsertApprovalHistory = any;
type InsertEntity = any;
type InsertLocation = any;
type InsertRole = any;
type InsertEscalationMatrix = any;


// NEW: Reusable type for pagination and search options
interface QueryOptions {
  page: number;
  pageSize: number;
  search: string;
}

// UPDATED: IStorage interface now reflects pagination/search on getAll methods
export interface IStorage {
  // User operations
  getUser(empCode: string): Promise<User | null>;
  getUserByEmployeeNumber(employeeNumber: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(empCode: string, user: Partial<InsertUser>): Promise<User>;
  updateUserPassword(empCode: string, password: string): Promise<void>;
  getUniqueEmailDomains(): Promise<string[]>;
  getApproversByDepartmentLocation(department: string, location: string): Promise<User[]>;

  // Purchase Request operations
  createPurchaseRequest(data: {
    entity: string;
    title: string;
    requestDate: Date;
    department: string;
    location: string;
    businessJustificationCode: string;
    businessJustificationDetails: string;
    totalEstimatedCost: number;
    requesterEmpCode: string;
    createdBy: string;
    updatedBy: string;
    status?: string;
    lineItems: Array<{
      productname: string;
      itemnumber: string;
      requiredquantity: number;
      unit_of_measure: string;
      vendoraccountnumber: string;
      requiredbydate: Date;
      deliverylocation: string;
      estimated_cost: number;
      item_justification?: string;
      receiving_warehouse_id?: string;
    }>;
  }): Promise<any>;
  generateRequisitionNumber(entity: string): Promise<string>;

  // Master Data operations for Admin system - NO PAGINATION
  getAllUsers(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<User[]>;
  deleteUser(empCode: string): Promise<void>;

  getAllEntities(search?: string): Promise<Entity[]>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: number, entity: Partial<InsertEntity>): Promise<Entity>;
  deleteEntity(id: number): Promise<void>;

  getAllDepartments(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(deptNumber: string, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(deptNumber: string): Promise<void>;

  getAllLocations(search?: string): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: number): Promise<void>;

  getAllApprovalMatrix(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<ApprovalMatrix[]>;
  createApprovalMatrix(matrix: InsertApprovalMatrix): Promise<ApprovalMatrix>;
  updateApprovalMatrix(empCode: string, matrix: Partial<InsertApprovalMatrix>): Promise<ApprovalMatrix>;
  deleteApprovalMatrix(empCode: string): Promise<void>;

  getAllEscalationMatrix(search?: string): Promise<any[]>;
  createEscalationMatrix(matrix: any): Promise<any>;
  updateEscalationMatrix(pr_number: string, matrix: any): Promise<any>;
  deleteEscalationMatrix(pr_number: string): Promise<void>;
  
  // Escalation logs methods
  getEscalationLogsForPR(pr_number: string): Promise<any[]>;
  checkEscalationStatus(pr_number: string, level: number): Promise<any | null>;

  getAllInventory(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<Inventory[]>;
  createInventory(item: InsertInventory): Promise<Inventory>;
  updateInventory(itemNumber: string, item: UpdateInventory): Promise<Inventory>;
  deleteInventory(itemNumber: string): Promise<void>;

  getAllVendors(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(vendorAccountNumber: string, vendor: UpdateVendor): Promise<Vendor>;
  deleteVendor(vendorAccountNumber: string): Promise<void>;

  getAllSites(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<Site[]>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: bigint, site: Partial<InsertSite>): Promise<Site>;
  deleteSite(id: bigint): Promise<void>;
}

// Instantiate PrismaClient once
const prismaClient = new PrismaClient();

export class DatabaseStorage implements IStorage {
  private prisma: PrismaClient;

  constructor(prismaInstance: PrismaClient) {
    this.prisma = prismaInstance;
  }

  // Bulk insert for users
  async bulkInsertUsers(data: any[]): Promise<{inserted: number, skipped: number, errors: number}> {
    console.log("bcrypt loaded:", typeof bcrypt, "hash:", typeof bcrypt.hash);
    const tempPassword = 'Temp@123';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    let inserted = 0, skipped = 0, errors = 0;
    for (const row of data) {
      try {
        if (!row.emp_code) { skipped++; continue; }
        const exists = await this.prisma.users.findUnique({ where: { emp_code: String(row.emp_code) } });
        if (exists) { skipped++; continue; }
        await this.prisma.users.create({
          data: {
            ...row,
            mobile_no: row.mobile_no != null ? String(row.mobile_no) : null,
            password: hashedPassword,
            must_reset_password: true,
          }
        });
        inserted++;
      } catch (e) {
        errors++;
        console.error('Error inserting user:', row, e);
      }
    }
    return { inserted, skipped, errors };
  }

  // Bulk insert for departments
  async bulkInsertDepartments(data: any[]): Promise<{inserted: number, skipped: number, errors: number}> {
    let inserted = 0, skipped = 0, errors = 0;
    for (const row of data) {
      try {
        if (!row.dept_number) { skipped++; continue; }
        const exists = await this.prisma.departments.findUnique({ where: { dept_number: String(row.dept_number) } });
        if (exists) { skipped++; continue; }
        await this.prisma.departments.create({ data: row });
        inserted++;
      } catch (e) { errors++; }
    }
    return { inserted, skipped, errors };
  }

  // Bulk insert for sites
  async bulkInsertSites(data: any[]): Promise<{inserted: number, skipped: number, errors: number}> {
    let inserted = 0, skipped = 0, errors = 0;
    for (const row of data) {
      try {
        if (!row.Site_ID) { skipped++; continue; }
        const exists = await this.prisma.sites.findFirst({ where: { Site_ID: String(row.Site_ID) } });
        if (exists) { skipped++; continue; }
        await this.prisma.sites.create({ data: row });
        inserted++;
      } catch (e) { errors++; }
    }
    return { inserted, skipped, errors };
  }

  // Bulk insert for inventory
  async bulkInsertInventory(data: any[]): Promise<{inserted: number, skipped: number, errors: number}> {
    let inserted = 0, skipped = 0, errors = 0;
    for (const row of data) {
      try {
        if (!row.itemnumber) { skipped++; continue; }
        const exists = await this.prisma.inventory.findUnique({ where: { itemnumber: String(row.itemnumber) } });
        if (exists) { skipped++; continue; }
        await this.prisma.inventory.create({ data: row });
        inserted++;
      } catch (e) { errors++; }
    }
    return { inserted, skipped, errors };
  }

  // Bulk insert for vendors
  async bulkInsertVendors(data: any[]): Promise<{inserted: number, skipped: number, errors: number}> {
    let inserted = 0, skipped = 0, errors = 0;
    for (const row of data) {
      try {
        if (!row.vendoraccountnumber) { skipped++; continue; }
        const exists = await this.prisma.vendors.findUnique({ where: { vendoraccountnumber: String(row.vendoraccountnumber) } });
        if (exists) { skipped++; continue; }
        await this.prisma.vendors.create({ data: row });
        inserted++;
      } catch (e) { errors++; }
    }
    return { inserted, skipped, errors };
  }

  // User Operations
  async getUser(empCode: string): Promise<User | null> {
    return this.prisma.users.findUnique({ where: { emp_code: empCode } });
  }
  async getUserByEmployeeNumber(employeeNumber: string): Promise<User | null> {
    return this.prisma.users.findUnique({ where: { emp_code: employeeNumber } });
  }
  async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.users.findFirst({ where: { email } });
  }
  async createUser(userData: InsertUser): Promise<User> {
    return this.prisma.users.create({ data: userData });
  }
  async updateUser(empCode: string, userData: Partial<InsertUser>): Promise<User> {
    return this.prisma.users.update({ where: { emp_code: empCode }, data: userData });
  }
  async updateUserPassword(empCode: string, password: string): Promise<void> {
    await this.prisma.users.update({
      where: { emp_code: empCode },
      data: { password, must_reset_password: false },
    });
  }
  async getUniqueEmailDomains(): Promise<string[]> {
    const result = await this.prisma.$queryRaw<{ domain: string }[]>(Prisma.sql`
      SELECT DISTINCT LOWER(TRIM(SPLIT_PART(email, '@', 2))) AS domain
      FROM "users" WHERE email IS NOT NULL AND POSITION('@' IN email) > 0
    `);
    return result.map(row => row.domain).filter(Boolean);
  }
  async getApproversByDepartmentLocation(department: string, location: string): Promise<User[]> {
    console.warn("WARN: getApproversByDepartmentLocation is not fully implemented for the current schema.");
    return [];
  }

  async generateRequisitionNumber(entity: string): Promise<string> {
    // Format: PR-Entity-KGBPL-YYYYMM-COUNTER
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    // const date = String(now.getDate()).padStart(2, '0');
    // const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${entity}-${year}`;
    // Find the max counter for this entity and year+month
    const lastPR = await this.prisma.purchase_requests.findFirst({
      where: {
        pr_number: { startsWith: prefix },
      },
      orderBy: { pr_number: 'desc' },
    });
    let counter = 1;
    if (lastPR && lastPR.pr_number) {
      const match = lastPR.pr_number.match(/(\d+)$/);
      if (match) {
        counter = parseInt(match[1], 10) + 1;
      }
    }
    return `${prefix}-${String(counter).padStart(6, '0')}`;
  }

  async createPurchaseRequest(data: {
    entity: string;
    title: string;
    requestDate: Date;
    department: string;
    location: string;
    businessJustificationCode: string;
    businessJustificationDetails: string;
    totalEstimatedCost: number;
    requesterEmpCode: string;
    createdBy: string;
    updatedBy: string;
    status?: string;
    lineItems: Array<{
      productname: string;
      itemnumber: string;
      requiredquantity: number;
      unit_of_measure: string;
      vendoraccountnumber: string;
      requiredbydate: Date;
      deliverylocation: string;
      estimated_cost: number;
      item_justification?: string;
      receiving_warehouse_id?: string;
    }>;
  }): Promise<any> {
    const pr_number = await this.generateRequisitionNumber(data.entity);
    // Try to find approval matrix row by department and location first
    let approvalMatrix = await this.prisma.approval_matrix.findFirst({
      where: {
        department: data.department,
        site: data.location,
      },
    });
    // Fallback to emp_code if not found
    if (!approvalMatrix) {
      approvalMatrix = await this.prisma.approval_matrix.findUnique({
        where: { emp_code: data.requesterEmpCode },
      });
    }
    const firstApproverEmpCode = approvalMatrix?.approver_1_emp_code;
    if (!firstApproverEmpCode) {
      throw new Error('No valid first approver found in approval matrix for this request.');
    }
    return this.prisma.$transaction(async (tx) => {
      const pr = await tx.purchase_requests.create({
        data: {
          pr_number,
          title: data.title,
          request_date: data.requestDate,
          department: data.department,
          location: data.location,
          business_justification_code: data.businessJustificationCode,
          business_justification_details: data.businessJustificationDetails,
          total_estimated_cost: data.totalEstimatedCost,
          requester_emp_code: data.requesterEmpCode,
          status: data.status && ["rejected","returned","pending","approved"].includes(data.status) ? data.status : "pending",
          created_by: data.createdBy,
          updated_by: data.updatedBy,
          current_approver_emp_code: firstApproverEmpCode,
          current_approval_level: 1,
        },
      });
      
      const lineItems = await Promise.all(
        data.lineItems.map(async item => {
          let itemnumber = item.itemnumber;
          if (!itemnumber && item.productname) {
            const inventoryItem = await tx.inventory.findFirst({ where: { productname: item.productname } });
            itemnumber = inventoryItem?.itemnumber || "";
          }
          return tx.line_items.create({
            data: {
              pr_number,
              productname: item.productname,
              item_number: itemnumber,
              requiredquantity: item.requiredquantity,
              unit_of_measure: item.unit_of_measure,
              vendoraccountnumber: item.vendoraccountnumber,
              requiredbydate: item.requiredbydate,
              deliverylocation: item.deliverylocation,
              estimated_cost: item.estimated_cost,
              item_justification: item.item_justification || null,
              receiving_warehouse_id: item.receiving_warehouse_id || null,
              created_by: data.createdBy,
              updated_by: data.updatedBy,
            },
          });
        })
      );
      
      // Create escalation matrix for this PR
      try {
        const escalationData = await this.populateEscalationMatrixForPR(pr_number);
        if (escalationData) {
          await tx.escalation_matrix.create({
            data: escalationData
          });
        }
      } catch (error) {
        console.error('Error creating escalation matrix for PR:', pr_number, error);
        // Don't fail the transaction if escalation matrix creation fails
      }
      
      return { ...pr, lineItems };
    });
  }

  // Stubs for non-implemented PR/LineItem/etc. features
  async getPurchaseRequest(id: string): Promise<PurchaseRequest | null> {
    return this.prisma.purchase_requests.findUnique({ where: { pr_number: id } });
  }
  async getAllPurchaseRequests(filters: any = {}): Promise<any[]> {
    const where: any = {};
    if (filters.createdBy) {
      // Support both created_by and requester_emp_code for legacy compatibility
      where.OR = [
        { created_by: filters.createdBy },
        { requester_emp_code: filters.createdBy },
      ];
    }
    if (filters.currentApproverId) {
      where.OR = where.OR || [];
      where.OR.push({ current_approver_emp_code: filters.currentApproverId });
      // For parallel approval, we need to fetch requests with null current_approver_emp_code
      // but we'll filter them properly in JavaScript to only show to the correct approvers
      where.OR.push({ current_approver_emp_code: null });
    }
    // Handle approverEmpCode for legacy/parallel logic
    if (filters.approverEmpCode) {
      where.OR = where.OR || [];
      where.OR.push({ current_approver_emp_code: filters.approverEmpCode });
      // For parallel approval, we need to fetch requests with null current_approver_emp_code
      // but we'll filter them properly in JavaScript to only show to the correct approvers
      where.OR.push({ current_approver_emp_code: null });
      // Parallel case: level 3, current_approver_emp_code is null, user is 3a or 3b
      // We'll filter these after fetching, since Prisma can't join approval_matrix easily here
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.department) {
      where.department = { equals: filters.department, mode: 'insensitive' };
    }
    if (filters.location) {
      where.location = filters.location;
    }
    // Fetch requests
    const requests = await this.prisma.purchase_requests.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        line_items: true,
      },
    });
    // Fetch approval matrix for all relevant requester_emp_codes
    const empCodes = Array.from(new Set(requests.map((r: any) => r.requester_emp_code).filter((x: any): x is string => !!x)));
    const approvalMatrices = await this.prisma.approval_matrix.findMany({
      where: { emp_code: { in: empCodes } },
    });
    const matrixMap = Object.fromEntries(approvalMatrices.map(m => [m.emp_code, m]));
    // Fetch escalation matrix for all PRs
    const prNumbers = requests.map((r: any) => r.pr_number).filter((x: any): x is string => !!x);
    const escalationMatrices = await this.prisma.escalation_matrix.findMany({
      where: { pr_number: { in: prNumbers } },
    });
    const escalationMap = Object.fromEntries(escalationMatrices.map(m => [m.pr_number, m]));
    // Fetch escalation logs for all PRs
    const escalationLogs = await this.prisma.pr_escalation_logs.findMany({
      where: { pr_number: { in: prNumbers } },
      orderBy: { escalated_at: 'desc' },
    });
    // If parallel approval filter, filter in JS for level 3 and escalations
    let filteredRequests = requests;
    if (filters.approverEmpCode || filters.currentApproverId) {
      const approverId = filters.approverEmpCode || filters.currentApproverId;
      filteredRequests = requests.filter((req: any) => {
        // If status filter is 'pending', only show pending requests
        if (filters.status === 'pending' && req.status !== 'pending') {
          return false;
        }
        // Normal assignment
        if (req.current_approver_emp_code === approverId) {
          return true;
        }
        // Escalation logic for level 1
        if (
          req.current_approval_level === 1 &&
          !req.current_approver_emp_code &&
          escalationMap[req.pr_number]
        ) {
          const escalationLog = escalationLogs.find(
            (log: any) => log.pr_number === req.pr_number && log.level === 1 && log.status === 'escalated'
          );
          if (escalationLog) {
            const escalation = escalationMap[req.pr_number];
            if (
              approverId === escalation.approver_1_code ||
              approverId === escalation.manager_1_code
            ) {
              return true;
            }
          }
        }
        // Escalation logic for level 2
        if (
          req.current_approval_level === 2 &&
          !req.current_approver_emp_code &&
          escalationMap[req.pr_number]
        ) {
          const escalationLog = escalationLogs.find(
            (log: any) => log.pr_number === req.pr_number && log.level === 2 && log.status === 'escalated'
          );
          if (escalationLog) {
            const escalation = escalationMap[req.pr_number];
            if (
              approverId === escalation.approver_2_code ||
              approverId === escalation.manager_2_code
            ) {
              return true;
            }
          }
        }
        // Parallel approval: level 3, current_approver_emp_code is null
        const matrix = matrixMap[req.requester_emp_code];
        if (
          req.current_approval_level === 3 &&
          !req.current_approver_emp_code &&
          matrix &&
          (matrix.approver_3a_emp_code === approverId ||
            matrix.approver_3b_emp_code === approverId)
        ) {
          return true;
        }
        return false;
      });
    }
    // Map DB fields to API fields expected by frontend
    return filteredRequests.map((req: any) => {
      const matrix = matrixMap[req.requester_emp_code];
      const escalation = escalationMap[req.pr_number];
      const escalationLog = escalationLogs.find(
        (log: any) => log.pr_number === req.pr_number && log.level === req.current_approval_level && log.status === 'escalated'
      );
      const userEmpCode = filters.userEmpCode;
      let canApprove = false;
      let canReject = false;
      let canReturn = false;
      if (userEmpCode) {
        // Normal assignment
        if (req.current_approver_emp_code === userEmpCode) {
          canApprove = true;
          canReject = true;
          canReturn = true;
        } else if (
          !req.current_approver_emp_code &&
          escalationLog &&
          escalation &&
          (
            (req.current_approval_level === 1 && (userEmpCode === escalation.approver_1_code || userEmpCode === escalation.manager_1_code)) ||
            (req.current_approval_level === 2 && (userEmpCode === escalation.approver_2_code || userEmpCode === escalation.manager_2_code))
          )
        ) {
          canApprove = true;
          canReject = true;
          canReturn = true;
        } else if (
          req.current_approval_level === 3 &&
          !req.current_approver_emp_code &&
          matrix &&
          (matrix.approver_3a_emp_code === userEmpCode || matrix.approver_3b_emp_code === userEmpCode)
        ) {
          canApprove = true;
          canReject = true;
          canReturn = true;
        }
      }
      return {
        id: req.pr_number, // Map pr_number to id
        requisitionNumber: req.pr_number, // Also provide as requisitionNumber
        title: req.title,
        requestDate: req.request_date,
        department: req.department,
        location: req.location,
        businessJustificationCode: req.business_justification_code,
        businessJustificationDetails: req.business_justification_details,
        status: req.status,
        currentApprovalLevel: req.current_approval_level,
        totalEstimatedCost: req.total_estimated_cost,
        requesterId: req.requester_emp_code,
        currentApproverId: req.current_approver_emp_code,
        createdAt: req.created_at,
        updatedAt: req.updated_at,
        lineItems: req.line_items,
        approvalMatrix: matrix,
        canApprove,
        canReject,
        canReturn,
      };
    });
  }
  async updatePurchaseRequest(id: string, request: Partial<InsertPurchaseRequest>): Promise<PurchaseRequest> {
    return this.prisma.purchase_requests.update({
      where: { pr_number: id },
      data: request,
    });
  }
  async deletePurchaseRequest(id: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async createLineItem(item: InsertLineItem): Promise<LineItem> {
    throw new Error("Method not implemented.");
  }
  async getLineItem(id: number): Promise<LineItem | null> {
    throw new Error("Method not implemented.");
  }
  async getAllLineItems(): Promise<LineItem[]> {
    throw new Error("Method not implemented.");
  }
  async updateLineItem(id: number, item: Partial<InsertLineItem>): Promise<LineItem> {
    throw new Error("Method not implemented.");
  }
  async deleteLineItem(id: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async createAttachment(attachment: {
    purchase_request_id: string;
    file_name: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    file_path: string;
    uploaded_at?: Date;
  }): Promise<any> {
    return this.prisma.attachments.create({
      data: {
        purchase_request_id: attachment.purchase_request_id,
        file_name: attachment.file_name,
        original_name: attachment.original_name,
        file_size: attachment.file_size,
        mime_type: attachment.mime_type,
        file_path: attachment.file_path,
        uploaded_at: attachment.uploaded_at || new Date(),
      },
    });
  }
  async getAttachment(id: number): Promise<any> {
    return this.prisma.attachments.findUnique({
      where: { id },
    });
  }
  async getAllAttachments(): Promise<Attachment[]> {
    throw new Error("Method not implemented.");
  }
  async deleteAttachment(id: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async createApprovalHistory(history: InsertApprovalHistory): Promise<ApprovalHistory> {
    throw new Error("Method not implemented.");
  }
  async getApprovalHistory(id: number): Promise<ApprovalHistory | null> {
    throw new Error("Method not implemented.");
  }
  async getAllApprovalHistory(): Promise<ApprovalHistory[]> {
    return this.prisma.audit_logs.findMany({
      include: { users: true }
    });
  }

  async getApprovalWorkflow(id: number): Promise<ApprovalWorkflow | null> {
    throw new Error("Method not implemented.");
  }
  async getAllApprovalWorkflows(): Promise<ApprovalWorkflow[]> {
    throw new Error("Method not implemented.");
  }
  async updateApprovalWorkflow(id: number, workflow: Partial<ApprovalWorkflow>): Promise<ApprovalWorkflow> {
    throw new Error("Method not implemented.");
  }

// MASTER DATA IMPLEMENTATIONS
  // Users Master
  async getAllUsers(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<User[]> {
    const where: Prisma.usersWhereInput = search
      ? {
          OR: [
            { emp_code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
            { role: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const allowedSortKeys = [
      'emp_code', 'name', 'email', 'department', 'location', 'role', 'entity', 'site', 'erp_id'
    ];
    const finalSortKey = sortKey && allowedSortKeys.includes(sortKey) ? sortKey : 'emp_code';
    const finalSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
    return this.prisma.users.findMany({ where, orderBy: { [finalSortKey]: finalSortOrder } });
  }

  async deleteUser(empCode: string): Promise<void> {
    await this.prisma.users.delete({ where: { emp_code: empCode } });
  }

  // Entity Master
  async getAllEntities(search?: string): Promise<Entity[]> {
    throw new Error("ERR: getAllEntities not implemented. Entity model is missing from schema.prisma.");
  }
  async createEntity(entity: InsertEntity): Promise<Entity> {
    throw new Error("Method not implemented.");
  }
  async updateEntity(id: number, entity: Partial<InsertEntity>): Promise<Entity> {
    throw new Error("Method not implemented.");
  }
  async deleteEntity(id: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  // Department Master
  async getAllDepartments(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<Department[]> {
    const where: Prisma.departmentsWhereInput = search
      ? {
          OR: [
            { dept_number: { contains: search, mode: 'insensitive' } },
            { dept_name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const allowedSortKeys = ['dept_number', 'dept_name'];
    const finalSortKey = sortKey && allowedSortKeys.includes(sortKey) ? sortKey : 'dept_number';
    const finalSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
    return this.prisma.departments.findMany({ where, orderBy: { [finalSortKey]: finalSortOrder } });
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    return this.prisma.departments.create({ data: departmentData });
  }
  async updateDepartment(deptNumber: string, departmentData: Partial<InsertDepartment>): Promise<Department> {
    return this.prisma.departments.update({ where: { dept_number: deptNumber }, data: departmentData });
  }
  async deleteDepartment(deptNumber: string): Promise<void> {
    await this.prisma.departments.delete({ where: { dept_number: deptNumber } });
  }

  // Location Master
  async getAllLocations(): Promise<string[]> {
    const locations = await this.prisma.users.findMany({
      where: { location: { not: null } },
      select: { location: true },
      distinct: ['location'],
      orderBy: { location: 'asc' },
    });
    return locations.map(l => l.location).filter((l): l is string => !!l);
  }
  async createLocation(location: InsertLocation): Promise<Location> {
    throw new Error("Method not implemented.");
  }
  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location> {
    throw new Error("Method not implemented.");
  }
  async deleteLocation(id: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  // Approval Matrix
  async getAllApprovalMatrix(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<ApprovalMatrix[]> {
    const where: Prisma.approval_matrixWhereInput = search
      ? {
          OR: [
            { emp_code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
            { site: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const allowedSortKeys = [
      'emp_code', 'name', 'email', 'department', 'site',
      'approver_1_name', 'approver_1_emp_code', 'approver_2_name', 'approver_2_emp_code',
      'approver_3a_name', 'approver_3a_emp_code', 'approver_3b_name', 'approver_3b_emp_code'
    ];
    const finalSortKey = sortKey && allowedSortKeys.includes(sortKey) ? sortKey : 'emp_code';
    const finalSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
    return this.prisma.approval_matrix.findMany({ where, orderBy: { [finalSortKey]: finalSortOrder } });
  }

  async createApprovalMatrix(matrixData: InsertApprovalMatrix): Promise<ApprovalMatrix> {
    return this.prisma.approval_matrix.create({ data: matrixData });
  }
  async updateApprovalMatrix(empCode: string, matrixData: Partial<InsertApprovalMatrix>): Promise<ApprovalMatrix> {
    return this.prisma.approval_matrix.update({ where: { emp_code: empCode }, data: matrixData });
  }
  async deleteApprovalMatrix(empCode: string): Promise<void> {
    await this.prisma.approval_matrix.delete({ where: { emp_code: empCode } });
  }

  // Escalation Matrix Master
  async getAllEscalationMatrix(search?: string): Promise<any[]> {
    const where = search
      ? {
          OR: [
            { pr_number: { contains: search, mode: 'insensitive' } },
            { req_emp_code: { contains: search, mode: 'insensitive' } },
            { req_emp_mail: { contains: search, mode: 'insensitive' } },
            { req_emp_name: { contains: search, mode: 'insensitive' } },
            { approver_1_code: { contains: search, mode: 'insensitive' } },
            { approver_2_code: { contains: search, mode: 'insensitive' } },
            { approver_3_code: { contains: search, mode: 'insensitive' } },
            { manager_1_code: { contains: search, mode: 'insensitive' } },
            { manager_2_code: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.escalation_matrix.findMany({ where });
  }
  async createEscalationMatrix(matrix: any): Promise<any> {
    return this.prisma.escalation_matrix.create({ data: matrix });
  }
  async updateEscalationMatrix(pr_number: string, matrix: any): Promise<any> {
    return this.prisma.escalation_matrix.update({ where: { pr_number }, data: matrix });
  }
  async deleteEscalationMatrix(pr_number: string): Promise<void> {
    await this.prisma.escalation_matrix.delete({ where: { pr_number } });
  }

  async getEscalationLogsForPR(pr_number: string): Promise<any[]> {
    return this.prisma.pr_escalation_logs.findMany({
      where: { pr_number },
      orderBy: { escalated_at: 'desc' }
    });
  }

  async checkEscalationStatus(pr_number: string, level: number): Promise<any | null> {
    return this.prisma.pr_escalation_logs.findFirst({
      where: {
        pr_number,
        level,
        status: 'escalated'
      }
    });
  }

  // PR Escalation Logs
  async getAllPrEscalationLogs(search?: string): Promise<any[]> {
    const where = search
      ? {
          OR: [
            { pr_number: { contains: search, mode: 'insensitive' } },
            { status: { contains: search, mode: 'insensitive' } },
            { email_sent_to: { contains: search, mode: 'insensitive' } },
            { comment: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.pr_escalation_logs.findMany({ where });
  }
  async getPrEscalationLogById(id: number): Promise<any | null> {
    return this.prisma.pr_escalation_logs.findUnique({ where: { id } });
  }
  async createPrEscalationLog(log: any): Promise<any> {
    return this.prisma.pr_escalation_logs.create({ data: log });
  }
  async updatePrEscalationLog(id: number, log: any): Promise<any> {
    return this.prisma.pr_escalation_logs.update({ where: { id }, data: log });
  }
  async deletePrEscalationLog(id: number): Promise<void> {
    await this.prisma.pr_escalation_logs.delete({ where: { id } });
  }

  // Inventory Master
  async getAllInventory(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<Inventory[]> {
    const where: Prisma.inventoryWhereInput = search
      ? {
          OR: [
            { itemnumber: { contains: search, mode: 'insensitive' } },
            { productname: { contains: search, mode: 'insensitive' } },
            { productdescription: { contains: search, mode: 'insensitive' } },
            { productnumber: { contains: search, mode: 'insensitive' } },
            { searchname: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const allowedSortKeys = [
      'itemnumber', 'productname', 'productdescription', 'productnumber', 'searchname',
      'bomunitsymbol', 'inventoryreservationhierarchyname', 'inventoryunitsymbol',
      'iscatchweightproduct', 'isproductkit', 'itemmodelgroupid', 'lowerwarrantablepricerangelimit',
      'productcategoryname','productdimensiongroupname', 'productgroupid', 'productsearchname', 'productsubtype',
      'producttype', 'purchasesalestaxitemgroupcode', 'purchaseunitsymbol', 'retailproductcategoryname',
      'salessalestaxitemgroupcode', 'salesunitsymbol', 'servicetype', 'storagedimensiongroupname',
      'trackingdimensiongroupname', 'upperwarrantablepricerangelimit', 'variantconfigurationtechnology',
      'warrantablepricerangebasetype', 'warrantydurationtime', 'warrantydurationtimeunit'
    ];
    const finalSortKey = sortKey && allowedSortKeys.includes(sortKey) ? sortKey : 'itemnumber';
    const finalSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
    return this.prisma.inventory.findMany({ where, orderBy: { [finalSortKey]: finalSortOrder } });
  }

  async createInventory(itemData: InsertInventory): Promise<Inventory> {
    return this.prisma.inventory.create({
      data: itemData,
    });
  }

  async updateInventory(itemNumber: string, itemData: UpdateInventory): Promise<Inventory> {
    return this.prisma.inventory.update({
      where: { itemnumber: itemNumber },
      data: itemData,
    });
  }

  async deleteInventory(itemNumber: string): Promise<void> {
    await this.prisma.inventory.delete({
      where: { itemnumber: itemNumber },
    });
  }

  // Vendor Master
  async getAllVendors(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<Vendor[]> {
    const where: Prisma.vendorsWhereInput = search
      ? {
          OR: [
            { vendoraccountnumber: { contains: search, mode: 'insensitive' } },
            { vendororganizationname: { contains: search, mode: 'insensitive' } },
            { vendorsearchname: { contains: search, mode: 'insensitive' } },
            { addresscity: { contains: search, mode: 'insensitive' } },
            { addressstateid: { contains: search, mode: 'insensitive' } },
            { addresszipcode: { contains: search, mode: 'insensitive' } },
            { currencycode: { contains: search, mode: 'insensitive' } },
            { pannumber: { contains: search, mode: 'insensitive' } },
            { vendorgroupid: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const finalSortKey = sortKey || 'vendororganizationname';
    const finalSortOrder = sortOrder || 'asc';
    const allowedSortKeys = [
      'vendoraccountnumber', 'vendororganizationname', 'vendorsearchname', 'addresscity', 'addressstateid',
      'addresszipcode', 'currencycode', 'pannumber', 'vendorgroupid'
    ];
    const safeSortKey = allowedSortKeys.includes(finalSortKey) ? finalSortKey : 'vendororganizationname';
    const safeSortOrder = finalSortOrder === 'desc' ? 'desc' : 'asc';
    return this.prisma.vendors.findMany({ where, orderBy: { [safeSortKey]: safeSortOrder } });
  }

  async createVendor(vendorData: InsertVendor): Promise<Vendor> {
    return this.prisma.vendors.create({
      data: vendorData,
    });
  }

  async updateVendor(vendorAccountNumber: string, vendorData: UpdateVendor): Promise<Vendor> {
    return this.prisma.vendors.update({
      where: { vendoraccountnumber: vendorAccountNumber },
      data: vendorData,
    });
  }

  async deleteVendor(vendorAccountNumber: string): Promise<void> {
    await this.prisma.vendors.delete({
      where: { vendoraccountnumber: vendorAccountNumber },
    });
  }

  // Site Master
  async getAllSites(
    search?: string,
    sortKey?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<Site[]> {
    const where: Prisma.sitesWhereInput = search
      ? {
          OR: [
            { Site_Name: { contains: search, mode: 'insensitive' } },
            { Site_ID: { contains: search, mode: 'insensitive' } },
            { Legal_Entity: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const allowedSortKeys = ['Site_Name', 'Site_ID', 'Legal_Entity'];
    const finalSortKey = sortKey && allowedSortKeys.includes(sortKey) ? sortKey : 'Site_Name';
    const finalSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
    return this.prisma.sites.findMany({ where, orderBy: { [finalSortKey]: finalSortOrder } });
  }

  async createSite(siteData: InsertSite): Promise<Site> {
    return this.prisma.sites.create({ data: siteData });
  }
  async updateSite(id: bigint, siteData: Partial<InsertSite>): Promise<Site> {
    return this.prisma.sites.update({ where: { id }, data: siteData });
  }
  async deleteSite(id: bigint): Promise<void> {
    await this.prisma.sites.delete({ where: { id } });
  }

  async getAttachmentsForRequest(prNumber: string): Promise<any[]> {
    return this.prisma.attachments.findMany({
      where: { purchase_request_id: prNumber },
      orderBy: { uploaded_at: 'desc' },
    });
  }

  async getPurchaseRequestWithLineItems(pr_number: string): Promise<any> {
    return this.prisma.purchase_requests.findUnique({
      where: { pr_number },
      include: {
        line_items: {
          include: {
            vendors: true,
          },
        },
        users_purchase_requests_created_byTousers: true,
      },
    });
  }

  /**
   * Helper to get the next approver and approval level from the approval_matrix for a given request and action.
   * @param approvalMatrix ApprovalMatrix
   * @param currentLevel number
   * @param action 'approve' | 'return' | 'reject'
   * @param currentApprover string
   * @param auditLogs any[]
   * @returns { nextLevel: number | null, nextApprover: string | null, isFinal: boolean, isParallel: boolean }
   */
  getNextApprovalStep(approvalMatrix: ApprovalMatrix, currentLevel: number, action: string, currentApprover: string, auditLogs: any[] = []) {
    if (action === 'return' || action === 'reject') {
      return { nextLevel: null, nextApprover: null, isFinal: false, isParallel: false };
    }
    if (currentLevel === 1 && approvalMatrix.approver_2_emp_code) {
      return { nextLevel: 2, nextApprover: approvalMatrix.approver_2_emp_code, isFinal: false, isParallel: false };
    }
    if (currentLevel === 2 && (approvalMatrix.approver_3a_emp_code || approvalMatrix.approver_3b_emp_code)) {
      // Parallel approval at level 3
      // Only consider audit logs for the current PR and current approval cycle
      let relevantLogs = auditLogs;
      // Find the last 'returned' or 'rejected' action (if any)
      const lastReturnOrRejectIdx = auditLogs
        .map((l, idx) => ({ action: l.action, idx }))
        .reverse()
        .find(l => l.action === 'returned' || l.action === 'rejected');
      if (lastReturnOrRejectIdx) {
        // Only consider logs after the last return/reject
        const cutoff = auditLogs.length - lastReturnOrRejectIdx.idx;
        relevantLogs = auditLogs.slice(cutoff);
      }
      if (approvalMatrix.approver_3a_emp_code && approvalMatrix.approver_3b_emp_code) {
        // If either 3a or 3b has already approved in this cycle, it's final
        const approvedBy3a = relevantLogs.some(l => l.approver_emp_code === approvalMatrix.approver_3a_emp_code && l.action === 'approved');
        const approvedBy3b = relevantLogs.some(l => l.approver_emp_code === approvalMatrix.approver_3b_emp_code && l.action === 'approved');
        if (approvedBy3a || approvedBy3b) {
          return { nextLevel: null, nextApprover: null, isFinal: true, isParallel: true };
        }
        // Otherwise, assign to both (frontend/backend should allow either to approve)
        return { nextLevel: 3, nextApprover: [approvalMatrix.approver_3a_emp_code, approvalMatrix.approver_3b_emp_code], isFinal: false, isParallel: true };
      } else if (approvalMatrix.approver_3a_emp_code) {
        return { nextLevel: 3, nextApprover: approvalMatrix.approver_3a_emp_code, isFinal: true, isParallel: false };
      } else if (approvalMatrix.approver_3b_emp_code) {
        return { nextLevel: 3, nextApprover: approvalMatrix.approver_3b_emp_code, isFinal: true, isParallel: false };
      }
    }
    // If no more approvers, it's final
    return { nextLevel: null, nextApprover: null, isFinal: true, isParallel: false };
  }

  async createAuditLog(data: {
    pr_number?: string;
    approver_emp_code?: string;
    approval_level?: number;
    action?: string;
    comment?: string;
    acted_at?: Date;
  }): Promise<any> {
    return this.prisma.audit_logs.create({
      data: {
        pr_number: data.pr_number ?? null,
        approver_emp_code: data.approver_emp_code ?? null,
        approval_level: data.approval_level ?? null,
        action: data.action ?? null,
        comment: data.comment ?? null,
        acted_at: data.acted_at || new Date(),
      },
    });
  }
async populateEscalationMatrixForPR(pr_number: string): Promise<any> {
  console.log(`Populating escalation matrix for PR: ${pr_number}`);
  
  const pr = await this.prisma.purchase_requests.findUnique({ where: { pr_number } });
  if (!pr?.requester_emp_code) {
    console.log(`No purchase request or requester_emp_code found for PR: ${pr_number}`);
    return null;
  }
  
  console.log(`Found purchase request for PR: ${pr_number}, requester: ${pr.requester_emp_code}`);

  const approvalMatrix = await this.prisma.approval_matrix.findUnique({
    where: { emp_code: pr.requester_emp_code }
  });
  if (!approvalMatrix) {
    console.log(`No approval matrix found for requester: ${pr.requester_emp_code}`);
    return null;
  }
  
  console.log(`Found approval matrix for requester: ${pr.requester_emp_code}`);

  const empCodes = [
    pr.requester_emp_code,
    approvalMatrix.approver_1_emp_code,
    approvalMatrix.approver_2_emp_code,
    approvalMatrix.approver_3a_emp_code,
    approvalMatrix.approver_3b_emp_code
  ].filter(Boolean);

  const users = await this.prisma.users.findMany({
    where: { emp_code: { in: empCodes } }
  });

  const getUserByEmpCode = (code: string | null | undefined) =>
    users.find(u => u.emp_code === code);

  const requester = getUserByEmpCode(pr.requester_emp_code);
  const approver1 = getUserByEmpCode(approvalMatrix.approver_1_emp_code);
  const approver2 = getUserByEmpCode(approvalMatrix.approver_2_emp_code);
  const approver3a = getUserByEmpCode(approvalMatrix.approver_3a_emp_code);
  const approver3b = getUserByEmpCode(approvalMatrix.approver_3b_emp_code);

  // Collect manager names to fetch their info
  const managerNames = [
    approver1?.manager_name,
    approver2?.manager_name
  ].filter(Boolean) as string[];

  const managerUsers = await this.prisma.users.findMany({
    where: { name: { in: managerNames } }
  });

  const getManagerForApprover = (approver: any) =>
    managerUsers.find(m => m.name === approver?.manager_name);

  const manager1 = getManagerForApprover(approver1);
  const manager2 = getManagerForApprover(approver2);

  return {
    pr_number,

    req_emp_code: requester?.emp_code,
    req_emp_mail: requester?.email,
    req_emp_name: requester?.name,

    approver_1_code: approver1?.emp_code,
    approver_1_mail: approver1?.email,
    approver_1_name: approver1?.name,

    approver_2_code: approver2?.emp_code,
    approver_2_mail: approver2?.email,
    approver_2_name: approver2?.name,

    approver_3a_code: approver3a?.emp_code,
    approver_3a_mail: approver3a?.email,
    approver_3a_name: approver3a?.name,

    approver_3b_code: approver3b?.emp_code,
    approver_3b_mail: approver3b?.email,
    approver_3b_name: approver3b?.name,

    manager_1_code: manager1?.emp_code,
    manager_1_mail: manager1?.email,
    manager_1_name: manager1?.name,

    manager_2_code: manager2?.emp_code,
    manager_2_mail: manager2?.email,
    manager_2_name: manager2?.name,
  };
}

  async upsertEscalationMatrixForPR(pr_number: string): Promise<any> {
    const data = await this.populateEscalationMatrixForPR(pr_number);
    if (!data) throw new Error("Cannot populate escalation matrix for this PR");
    return this.prisma.escalation_matrix.upsert({
      where: { pr_number },
      update: data,
      create: data,
    });
  }

  // Clear escalation logs for a PR (used when resubmitting a returned request)
  async clearEscalationLogsForPR(pr_number: string): Promise<void> {
    await this.prisma.pr_escalation_logs.deleteMany({ where: { pr_number } });
  }

  // --- Warehouse Delivery ---
  async getWarehouseDelivery(receiving_warehouse_id: string) {
    return this.prisma.warehouse_delivery.findUnique({ where: { receiving_warehouse_id } });
  }
  async getAllWarehouseDeliveries(entity?: string) {
    if (entity) {
      return this.prisma.warehouse_delivery.findMany({ where: { buying_legal_entity_id: entity } });
    }
    return this.prisma.warehouse_delivery.findMany();
  }
  async createWarehouseDelivery(data: any) {
    return this.prisma.warehouse_delivery.create({ data });
  }
  async updateWarehouseDelivery(receiving_warehouse_id: string, data: any) {
    return this.prisma.warehouse_delivery.update({ where: { receiving_warehouse_id }, data });
  }
  async deleteWarehouseDelivery(receiving_warehouse_id: string) {
    return this.prisma.warehouse_delivery.delete({ where: { receiving_warehouse_id } });
  }

  // --- Employee Entity ---
  async getEmployeeEntity(personnel_number: string) {
    return this.prisma.employee_entity.findUnique({ where: { personnel_number } });
  }
  async getAllEmployeeEntities() {
    return this.prisma.employee_entity.findMany();
  }
  async createEmployeeEntity(data: any) {
    return this.prisma.employee_entity.create({ data });
  }
  async updateEmployeeEntity(personnel_number: string, data: any) {
    return this.prisma.employee_entity.update({ where: { personnel_number }, data });
  }
  async deleteEmployeeEntity(personnel_number: string) {
    return this.prisma.employee_entity.delete({ where: { personnel_number } });
  }

  // --- Stock Table ---
  async getStockAvailPhysical(itemnumber: string): Promise<number | null> {
    const stock = await this.prisma.stock.findUnique({
      where: { itemnumber },
      select: { availphysical: true },
    });
    return stock?.availphysical ?? null;
  }
}

// Pass the initialized PrismaClient instance to the DatabaseStorage constructor
export const storage = new DatabaseStorage(prismaClient);