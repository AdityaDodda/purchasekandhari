import { PrismaClient, Prisma } from "@prisma/client";

// Import specific types from your schema.prisma.
import type {
  users as User,
  approval_matrix as ApprovalMatrix,
  departments as Department,
  sites as Site,
  inventory as InventoryModel,
  vendors as VendorModel, // NEW: Import vendors model
} from "@prisma/client";

// Explicit 'any' types for models not present in your schema.prisma
type PurchaseRequest = any;
type LineItem = any;
type Attachment = any;
type ApprovalHistory = any;
type ApprovalWorkflow = any;
type Notification = any;
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
type InsertNotification = any;
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

  // Purchase Request operations (Not Implemented)
  createPurchaseRequest(request: InsertPurchaseRequest): Promise<PurchaseRequest>;
  // ... (other non-implemented methods remain the same)
  generateRequisitionNumber(department: string): Promise<string>;

  // Master Data operations for Admin system - NO PAGINATION
  getAllUsers(search?: string): Promise<User[]>;
  deleteUser(empCode: string): Promise<void>;

  getAllEntities(search?: string): Promise<Entity[]>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: number, entity: Partial<InsertEntity>): Promise<Entity>;
  deleteEntity(id: number): Promise<void>;

  getAllDepartments(search?: string): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(deptNumber: string, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(deptNumber: string): Promise<void>;

  getAllLocations(search?: string): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: number): Promise<void>;

  // getAllRoles(search?: string): Promise<Role[]>;
  // createRole(role: InsertRole): Promise<Role>;
  // updateRole(id: number, role: Partial<InsertRole>): Promise<Role>;
  // deleteRole(id: number): Promise<void>;

  getAllApprovalMatrix(search?: string): Promise<ApprovalMatrix[]>;
  createApprovalMatrix(matrix: InsertApprovalMatrix): Promise<ApprovalMatrix>;
  updateApprovalMatrix(empCode: string, matrix: Partial<InsertApprovalMatrix>): Promise<ApprovalMatrix>;
  deleteApprovalMatrix(empCode: string): Promise<void>;

  getAllEscalationMatrix(search?: string): Promise<EscalationMatrix[]>;
  createEscalationMatrix(matrix: InsertEscalationMatrix): Promise<EscalationMatrix>;
  updateEscalationMatrix(id: number, matrix: Partial<InsertEscalationMatrix>): Promise<EscalationMatrix>;
  deleteEscalationMatrix(id: number): Promise<void>;

  getAllInventory(search?: string): Promise<Inventory[]>;
  createInventory(item: InsertInventory): Promise<Inventory>;
  updateInventory(itemNumber: string, item: UpdateInventory): Promise<Inventory>;
  deleteInventory(itemNumber: string): Promise<void>;

  getAllVendors(search?: string): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(vendorAccountNumber: string, vendor: UpdateVendor): Promise<Vendor>;
  deleteVendor(vendorAccountNumber: string): Promise<void>;

  getAllSites(search?: string): Promise<Site[]>;
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

  // Stubs for non-implemented PR/LineItem/etc. features
  async createPurchaseRequest(request: InsertPurchaseRequest): Promise<PurchaseRequest> {
    throw new Error("Method not implemented.");
  }
  async getPurchaseRequest(id: string): Promise<PurchaseRequest | null> {
    throw new Error("Method not implemented.");
  }
  async getAllPurchaseRequests(): Promise<PurchaseRequest[]> {
    throw new Error("Method not implemented.");
  }
  async updatePurchaseRequest(id: string, request: Partial<InsertPurchaseRequest>): Promise<PurchaseRequest> {
    throw new Error("Method not implemented.");
  }
  async deletePurchaseRequest(id: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async generateRequisitionNumber(department: string): Promise<string> {
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

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    throw new Error("Method not implemented.");
  }
  async getAttachment(id: number): Promise<Attachment | null> {
    throw new Error("Method not implemented.");
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
    throw new Error("Method not implemented.");
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

  async createNotification(notification: InsertNotification): Promise<Notification> {
    throw new Error("Method not implemented.");
  }
  async getNotification(id: number): Promise<Notification | null> {
    throw new Error("Method not implemented.");
  }
  async getAllNotifications(): Promise<Notification[]> {
    throw new Error("Method not implemented.");
  }
  async updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification> {
    throw new Error("Method not implemented.");
  }
  async deleteNotification(id: number): Promise<void> {
    throw new Error("Method not implemented.");
  }


  // MASTER DATA IMPLEMENTATIONS (UPDATED FOR PAGINATION/SEARCH)

  // Users Master
  async getAllUsers(search?: string): Promise<User[]> {
    const where: Prisma.usersWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { emp_code: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
            { role: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.users.findMany({ where, orderBy: { name: 'asc' } });
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
  async getAllDepartments(search?: string): Promise<Department[]> {
    const where: Prisma.departmentsWhereInput = search
      ? {
          OR: [
            { dept_number: { contains: search, mode: 'insensitive' } },
            { dept_name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.departments.findMany({ where, orderBy: { dept_name: 'asc' } });
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
  async getAllLocations(search?: string): Promise<Location[]> {
    throw new Error("ERR: getAllLocations not implemented. Consider using Sites.");
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

  // Role Master
  async getAllRoles(search?: string): Promise<Role[]> {
    throw new Error("ERR: getAllRoles not implemented. Role model is missing from schema.prisma.");
  }
  async createRole(role: InsertRole): Promise<Role> {
    throw new Error("Method not implemented.");
  }
  async updateRole(id: number, role: Partial<InsertRole>): Promise<Role> {
    throw new Error("Method not implemented.");
  }
  async deleteRole(id: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  // Approval Matrix
  async getAllApprovalMatrix(search?: string): Promise<ApprovalMatrix[]> {
    const where: Prisma.approval_matrixWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { emp_code: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
            { site: { contains: search, mode: 'insensitive' } },
            { approver_1_name: { contains: search, mode: 'insensitive' } },
            { approver_1_email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.approval_matrix.findMany({ where, orderBy: { name: 'asc' } });
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

  // Escalation Matrix
  async getAllEscalationMatrix(search?: string): Promise<EscalationMatrix[]> {
    throw new Error("ERR: getAllEscalationMatrix not implemented. EscalationMatrix model is missing from schema.prisma.");
  }
  async createEscalationMatrix(matrix: InsertEscalationMatrix): Promise<EscalationMatrix> {
    throw new Error("Method not implemented.");
  }
  async updateEscalationMatrix(id: number, matrix: Partial<InsertEscalationMatrix>): Promise<EscalationMatrix> {
    throw new Error("Method not implemented.");
  }
  async deleteEscalationMatrix(id: number): Promise<void> {
    throw new Error("Method not implemented.");
  }

  // Inventory Master - FULLY IMPLEMENTED
  async getAllInventory(search?: string): Promise<Inventory[]> {
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
    return this.prisma.inventory.findMany({ where, orderBy: { itemnumber: 'asc' } });
  }

  async createInventory(itemData: InsertInventory): Promise<Inventory> {
    return this.prisma.inventory.create({
      data: itemData,
    });
  }

  async updateInventory(itemNumber: string, itemData: UpdateInventory): Promise<Inventory> {
    // Note: The original Drizzle code had `updatedAt: new Date()`.
    // Your Prisma schema does not have an `updatedAt` field.
    // If you need it, add `updatedAt DateTime @updatedAt` to your schema.prisma.
    // For now, it's excluded from `itemData`.
    return this.prisma.inventory.update({
      where: { itemnumber: itemNumber }, // Primary key is itemnumber (string)
      data: itemData,
    });
  }

  async deleteInventory(itemNumber: string): Promise<void> {
    await this.prisma.inventory.delete({
      where: { itemnumber: itemNumber }, // Primary key is itemnumber (string)
    });
  }

  // Vendor Master - FULLY IMPLEMENTED
  async getAllVendors(search?: string): Promise<Vendor[]> {
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
    return this.prisma.vendors.findMany({ where, orderBy: { vendororganizationname: 'asc' } });
  }

  async createVendor(vendorData: InsertVendor): Promise<Vendor> {
    return this.prisma.vendors.create({
      data: vendorData,
    });
  }

  async updateVendor(vendorAccountNumber: string, vendorData: UpdateVendor): Promise<Vendor> {
    return this.prisma.vendors.update({
      where: { vendoraccountnumber: vendorAccountNumber }, // Primary key is vendoraccountnumber (string)
      data: vendorData,
    });
  }

  async deleteVendor(vendorAccountNumber: string): Promise<void> {
    await this.prisma.vendors.delete({
      where: { vendoraccountnumber: vendorAccountNumber }, // Primary key is vendoraccountnumber (string)
    });
  }

  // Site Master
  async getAllSites(search?: string): Promise<Site[]> {
    const where: Prisma.sitesWhereInput = search
      ? {
          OR: [
            { Site_Name: { contains: search, mode: 'insensitive' } },
            // Add other searchable fields from the 'sites' table here if needed
            // e.g., { city: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.sites.findMany({ where, orderBy: { Site_Name: 'asc' } });
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
}

// Pass the initialized PrismaClient instance to the DatabaseStorage constructor
export const storage = new DatabaseStorage(prismaClient);