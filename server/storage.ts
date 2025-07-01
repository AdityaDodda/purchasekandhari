import { PrismaClient, Prisma } from "@prisma/client";

// Import specific types from your schema.prisma.
import type {
  users as User,
  approval_matrix as ApprovalMatrix,
  departments as Department,
  sites as Site,
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
type Inventory = any;
type Vendor = any;

// Define input types using Prisma's generated input types
type InsertUser = Prisma.usersCreateInput;
type InsertApprovalMatrix = Prisma.approval_matrixCreateInput;
type InsertDepartment = Prisma.departmentsCreateInput;
type InsertSite = Prisma.sitesCreateInput;

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
type InsertInventory = any;
type InsertVendor = any;

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

  // Master Data operations for Admin system - SIGNATURES UPDATED
  getAllUsers(options: QueryOptions): Promise<{ data: User[], totalCount: number }>;
  deleteUser(empCode: string): Promise<void>;

  getAllEntities(options: QueryOptions): Promise<{ data: Entity[], totalCount: number }>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: number, entity: Partial<InsertEntity>): Promise<Entity>;
  deleteEntity(id: number): Promise<void>;

  getAllDepartments(options: QueryOptions): Promise<{ data: Department[], totalCount: number }>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(deptNumber: string, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(deptNumber: string): Promise<void>;

  getAllLocations(options: QueryOptions): Promise<{ data: Location[], totalCount: number }>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: number): Promise<void>;

  // getAllRoles(options: QueryOptions): Promise<{ data: Role[], totalCount: number }>;
  // createRole(role: InsertRole): Promise<Role>;
  // updateRole(id: number, role: Partial<InsertRole>): Promise<Role>;
  // deleteRole(id: number): Promise<void>;

  getAllApprovalMatrix(options: QueryOptions): Promise<{ data: ApprovalMatrix[], totalCount: number }>;
  createApprovalMatrix(matrix: InsertApprovalMatrix): Promise<ApprovalMatrix>;
  updateApprovalMatrix(empCode: string, matrix: Partial<InsertApprovalMatrix>): Promise<ApprovalMatrix>;
  deleteApprovalMatrix(empCode: string): Promise<void>;

  getAllEscalationMatrix(options: QueryOptions): Promise<{ data: EscalationMatrix[], totalCount: number }>;
  createEscalationMatrix(matrix: InsertEscalationMatrix): Promise<EscalationMatrix>;
  updateEscalationMatrix(id: number, matrix: Partial<InsertEscalationMatrix>): Promise<EscalationMatrix>;
  deleteEscalationMatrix(id: number): Promise<void>;

  getAllInventory(options: QueryOptions): Promise<{ data: Inventory[], totalCount: number }>;
  createInventory(item: InsertInventory): Promise<Inventory>;
  updateInventory(id: number, item: Partial<InsertInventory>): Promise<Inventory>;
  deleteInventory(id: number): Promise<void>;

  getAllVendors(options: QueryOptions): Promise<{ data: Vendor[], totalCount: number }>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: number): Promise<void>;

  getAllSites(options: QueryOptions): Promise<{ data: Site[], totalCount: number }>;
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
  // ... (all the `throw new Error` stubs remain here)


  // MASTER DATA IMPLEMENTATIONS (UPDATED FOR PAGINATION/SEARCH)

  // Users Master
  async getAllUsers(options: QueryOptions): Promise<{ data: User[], totalCount: number }> {
    const { page, pageSize, search } = options;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

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

    const [totalCount, data] = await this.prisma.$transaction([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
    ]);

    return { data, totalCount };
  }

  async deleteUser(empCode: string): Promise<void> {
    await this.prisma.users.delete({ where: { emp_code: empCode } });
  }

  // Entity Master 
  async getAllEntities(options: QueryOptions): Promise<{ data: Entity[], totalCount: number }> {
    throw new Error("ERR: getAllEntities not implemented. Entity model is missing from schema.prisma.");
  }
  // ... (other entity stubs)
  
  // Department Master
  async getAllDepartments(options: QueryOptions): Promise<{ data: Department[], totalCount: number }> {
    const { page, pageSize, search } = options;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.departmentsWhereInput = search
      ? {
          OR: [
            { dept_number: { contains: search, mode: 'insensitive' } },
            { dept_name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [totalCount, data] = await this.prisma.$transaction([
      this.prisma.departments.count({ where }),
      this.prisma.departments.findMany({ where, skip, take, orderBy: { dept_name: 'asc' } }),
    ]);

    return { data, totalCount };
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
  async getAllLocations(options: QueryOptions): Promise<{ data: Location[], totalCount: number }> {
    throw new Error("ERR: getAllLocations not implemented. Consider using Sites.");
  }
  // ... (other location stubs)
  
  // Role Master 
  async getAllRoles(options: QueryOptions): Promise<{ data: Role[], totalCount: number }> {
    throw new Error("ERR: getAllRoles not implemented. Role model is missing from schema.prisma.");
  }
  // ... (other role stubs)

  // Approval Matrix
  async getAllApprovalMatrix(options: QueryOptions): Promise<{ data: ApprovalMatrix[], totalCount: number }> {
    const { page, pageSize, search } = options;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

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

    const [totalCount, data] = await this.prisma.$transaction([
      this.prisma.approval_matrix.count({ where }),
      this.prisma.approval_matrix.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
    ]);

    return { data, totalCount };
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
  async getAllEscalationMatrix(options: QueryOptions): Promise<{ data: EscalationMatrix[], totalCount: number }> {
    throw new Error("ERR: getAllEscalationMatrix not implemented. EscalationMatrix model is missing from schema.prisma.");
  }
  // ... (other escalation matrix stubs)

  // Inventory Master 
  async getAllInventory(options: QueryOptions): Promise<{ data: Inventory[], totalCount: number }> {
    throw new Error("ERR: getAllInventory not implemented. Inventory model is missing from schema.prisma.");
  }
  // ... (other inventory stubs)

  // Vendor Master 
  async getAllVendors(options: QueryOptions): Promise<{ data: Vendor[], totalCount: number }> {
    throw new Error("ERR: getAllVendors not implemented. Vendor model is missing from schema.prisma.");
  }
  // ... (other vendor stubs)
  
  // Site Master
  async getAllSites(options: QueryOptions): Promise<{ data: Site[], totalCount: number }> {
    const { page, pageSize, search } = options;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.sitesWhereInput = search
      ? {
          OR: [
            { site_name: { contains: search, mode: 'insensitive' } },
            // Add other searchable fields from the 'sites' table here if needed
            // e.g., { city: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [totalCount, data] = await this.prisma.$transaction([
      this.prisma.sites.count({ where }),
      this.prisma.sites.findMany({ where, skip, take, orderBy: { site_name: 'asc' } }),
    ]);

    return { data, totalCount };
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

  // Stubs for non-implemented PR/LineItem/etc. features
  // ... (the rest of the stubs for createPurchaseRequest, etc. remain here)
  async createPurchaseRequest(request: InsertPurchaseRequest): Promise<PurchaseRequest> {
    throw new Error("Method not implemented.");
  }
  // etc.
}

// Pass the initialized PrismaClient instance to the DatabaseStorage constructor
export const storage = new DatabaseStorage(prismaClient);