// server/storage.ts

import { PrismaClient, Prisma } from "@prisma/client";

// Import specific types from your schema.prisma.
// Prisma Client generates camelCase model names from snake_case table names.
import type {
  users as User, // Maps 'users' table to 'User' type
  approval_matrix as ApprovalMatrix, // Maps 'approval_matrix' table to 'ApprovalMatrix' type
  departments as Department, // Maps 'departments' table to 'Department' type
  sites as Site, // Maps 'sites' table to 'Site' type

  // The following types are NOT generated by your current schema.prisma.
  // They are explicitly typed as 'any' here to satisfy the IStorage interface,
  // as requested. If you add these models to your schema.prisma,
  // remember to uncomment and use their proper Prisma generated types.
} from "@prisma/client";

// Explicit 'any' types for models not present in your schema.prisma
type PurchaseRequest = any;
type LineItem = any;
type Attachment = any;
type ApprovalHistory = any;
type ApprovalWorkflow = any;
type Notification = any;
type Entity = any;
type Location = any; // 'sites' likely replaces 'locations' conceptually
type Role = any;
type EscalationMatrix = any;
type Inventory = any;
type Vendor = any;

// Define input types using Prisma's generated input types
// These will correctly map to your schema's types.
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


// Your IStorage interface remains mostly the same, as it's an abstraction.
// Methods referencing models not in your schema.prisma will be stubbed in the implementation.
export interface IStorage {
  // User operations - IDs are now strings (emp_code)
  getUser(empCode: string): Promise<User | null>; // Changed id: number to empCode: string
  getUserByEmployeeNumber(employeeNumber: string): Promise<User | null>; // Maps to emp_code
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(empCode: string, user: Partial<InsertUser>): Promise<User>; // Changed id: number to empCode: string
  updateUserPassword(empCode: string, password: string): Promise<void>; // Changed id: number to empCode: string
  
  // NEW: Method to get unique email domains
  getUniqueEmailDomains(): Promise<string[]>;

  // This function is incompatible with the 'approval_matrix' schema. Will return empty/throw.
  getApproversByDepartmentLocation(department: string, location: string): Promise<User[]>;

  // Purchase Request operations - ALL ARE NOT IMPLEMENTED due to missing model
  createPurchaseRequest(request: InsertPurchaseRequest): Promise<PurchaseRequest>;
  getPurchaseRequest(id: number): Promise<PurchaseRequest | null>;
  getPurchaseRequestWithDetails(id: number): Promise<
    | (PurchaseRequest & {
        requester: User;
        currentApprover: User | null;
        lineItems: LineItem[];
        attachments: Attachment[];
        approvalHistory: (ApprovalHistory & { approver: User })[];
      })
    | null
  >;
  updatePurchaseRequest(id: number, request: Partial<InsertPurchaseRequest>): Promise<PurchaseRequest>;
  getPurchaseRequestsByUser(userId: number, filters?: any): Promise<PurchaseRequest[]>;
  getAllPurchaseRequests(filters?: any): Promise<PurchaseRequest[]>;
  getPurchaseRequestStats(): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    totalValue: number;
  }>;
  getPurchaseRequestStatsByUser(userId: number): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    totalValue: number;
  }>;
  generateRequisitionNumber(department: string): Promise<string>;

  // Line Item operations - ALL ARE NOT IMPLEMENTED
  createLineItem(lineItem: InsertLineItem): Promise<LineItem>;
  getLineItemsByRequest(requestId: number): Promise<LineItem[]>;
  updateLineItem(id: number, lineItem: Partial<InsertLineItem>): Promise<LineItem>;
  deleteLineItem(id: number): Promise<void>;

  // Attachment operations - ALL ARE NOT IMPLEMENTED
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachmentsByRequest(requestId: number): Promise<Attachment[]>;
  deleteAttachment(id: number): Promise<void>;

  // Approval operations - ALL ARE NOT IMPLEMENTED or need significant re-work
  createApprovalHistory(approval: InsertApprovalHistory): Promise<ApprovalHistory>;
  getApprovalHistoryByRequest(requestId: number): Promise<
    (ApprovalHistory & { approver: User })[]
  >;
  // This function is incompatible with the 'approval_matrix' schema. Will return empty/throw.
  getApprovalWorkflow(department: string, location: string): Promise<
    (ApprovalWorkflow & { approver: User })[]
  >;

  // Notification operations - ALL ARE NOT IMPLEMENTED
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;

  // Master Data operations for Admin system
  getAllUsers(): Promise<User[]>;
  deleteUser(empCode: string): Promise<void>; // Changed id: number to empCode: string

  // Entity Master operations - NOT IMPLEMENTED
  getAllEntities(): Promise<Entity[]>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: number, entity: Partial<InsertEntity>): Promise<Entity>;
  deleteEntity(id: number): Promise<void>;

  // Department Master operations - IDs are now strings (dept_number)
  getAllDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(deptNumber: string, department: Partial<InsertDepartment>): Promise<Department>; // Changed id: number to deptNumber: string
  deleteDepartment(deptNumber: string): Promise<void>; // Changed id: number to deptNumber: string

  // Location Master operations - NOT IMPLEMENTED (conceptually replaced by 'sites')
  getAllLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: number): Promise<void>;

  // Role Master operations - NOT IMPLEMENTED
  getAllRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;

  // Approval Matrix operations - IDs are now strings (emp_code)
  getAllApprovalMatrix(): Promise<ApprovalMatrix[]>;
  createApprovalMatrix(matrix: InsertApprovalMatrix): Promise<ApprovalMatrix>;
  updateApprovalMatrix(empCode: string, matrix: Partial<InsertApprovalMatrix>): Promise<ApprovalMatrix>; // Changed id: number to empCode: string
  deleteApprovalMatrix(empCode: string): Promise<void>; // Changed id: number to empCode: string

  // Escalation Matrix operations - NOT IMPLEMENTED
  getAllEscalationMatrix(): Promise<EscalationMatrix[]>;
  createEscalationMatrix(matrix: InsertEscalationMatrix): Promise<EscalationMatrix>;
  updateEscalationMatrix(id: number, matrix: Partial<InsertEscalationMatrix>): Promise<EscalationMatrix>;
  deleteEscalationMatrix(id: number): Promise<void>;

  // Inventory Master operations - NOT IMPLEMENTED
  getAllInventory(): Promise<Inventory[]>;
  createInventory(item: InsertInventory): Promise<Inventory>;
  updateInventory(id: number, item: Partial<InsertInventory>): Promise<Inventory>;
  deleteInventory(id: number): Promise<void>;

  // Vendor Master operations - NOT IMPLEMENTED
  getAllVendors(): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: number): Promise<void>;

  // NEW: Site operations (since 'sites' model exists)
  getAllSites(): Promise<Site[]>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: bigint, site: Partial<InsertSite>): Promise<Site>;
  deleteSite(id: bigint): Promise<void>;
}

// Instantiate PrismaClient once here
const prismaClient = new PrismaClient(); // Renamed the constant for clarity

export class DatabaseStorage implements IStorage {
  private prisma: PrismaClient; // Declare a private class property to hold the PrismaClient instance

  constructor(prismaInstance: PrismaClient) {
    this.prisma = prismaInstance; // Assign the passed instance to the class property
  }

  // User operations
  async getUser(empCode: string): Promise<User | null> { // Parameter changed to empCode: string
    return this.prisma.users.findUnique({ 
      where: { emp_code: empCode }, // Primary key is `emp_code` (string)
    });
  }

  async getUserByEmployeeNumber(employeeNumber: string): Promise<User | null> {
    // In your current schema, 'emp_code' serves as the employee number and is the primary key.
    return this.prisma.users.findUnique({ 
      where: { emp_code: employeeNumber },
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    // Note: 'email' is not marked @unique in your schema, so findFirst is safer if multiple matches possible.
    // If it's effectively unique, you might consider adding @unique to the schema.
    return this.prisma.users.findFirst({ 
      where: { email },
    });
  }

  async createUser(userData: InsertUser): Promise<User> {
    const createdUser = await this.prisma.users.create({ 
      data: userData,
    });
    return createdUser;
  }

  async updateUser(empCode: string, userData: Partial<InsertUser>): Promise<User> { // Parameter changed to empCode: string
    const updatedUser = await this.prisma.users.update({ 
      where: { emp_code: empCode }, // Update by `emp_code`
      data: userData,
    });
    return updatedUser;
  }

  async updateUserPassword(empCode: string, password: string): Promise<void> { // Parameter changed to empCode: string
    await this.prisma.users.update({ 
      where: { emp_code: empCode }, // Update by `emp_code`
      data: {
        password,
        must_reset_password: false, // Mark that password has been reset/is no longer temporary
      },
    });
  }

 // Implementation for getUniqueEmailDomains
  async getUniqueEmailDomains(): Promise<string[]> {
    try {
    const result = await this.prisma.$queryRaw<{ domain: string }[]>(Prisma.sql`
      SELECT DISTINCT LOWER(TRIM(SPLIT_PART(email, '@', 2))) AS domain
      FROM "users"
      WHERE email IS NOT NULL AND POSITION('@' IN email) > 0
    `);

    return result
      .map(row => row.domain)
      .filter(domain => domain); // Removes null or empty entries
  } catch (error) {
    console.error("Error in getUniqueEmailDomains:", error);
    return [];
  }
  }

  async getApproversByDepartmentLocation(department: string, location: string): Promise<User[]> {
    // This function's original logic relied on `ApprovalWorkflow` table, which is NOT in your current schema.
    // The `approval_matrix` table has a different structure with fixed approver columns.
    console.warn("WARN: getApproversByDepartmentLocation is not fully implemented for the current database schema (missing ApprovalWorkflow model). Returning empty array.");
    return [];
  }

  // Purchase Request operations - ALL ARE NOT IMPLEMENTED
  async createPurchaseRequest(requestData: any): Promise<any> {
    throw new Error("ERR: createPurchaseRequest not implemented. PurchaseRequest model is missing from schema.prisma.");
  }
  async getPurchaseRequest(id: number): Promise<any | null> {
    throw new Error("ERR: getPurchaseRequest not implemented. PurchaseRequest model is missing from schema.prisma.");
  }
  async getPurchaseRequestWithDetails(id: number): Promise<any | null> {
    throw new Error("ERR: getPurchaseRequestWithDetails not implemented. PurchaseRequest model is missing from schema.prisma.");
  }
  async updatePurchaseRequest(id: number, requestData: any): Promise<any> {
    throw new Error("ERR: updatePurchaseRequest not implemented. PurchaseRequest model is missing from schema.prisma.");
  }
  async getPurchaseRequestsByUser(userId: number, filters: any = {}): Promise<any[]> {
    throw new Error("ERR: getPurchaseRequestsByUser not implemented. PurchaseRequest model is missing from schema.prisma.");
  }
  async getAllPurchaseRequests(filters: any = {}): Promise<any[]> {
    throw new Error("ERR: getAllPurchaseRequests not implemented. PurchaseRequest model is missing from schema.prisma.");
  }
  async getPurchaseRequestStats(): Promise<any> {
    throw new Error("ERR: getPurchaseRequestStats not implemented. PurchaseRequest model is missing from schema.prisma.");
  }
  async getPurchaseRequestStatsByUser(userId: number): Promise<any> {
    throw new Error("ERR: getPurchaseRequestStatsByUser not implemented. PurchaseRequest model is missing from schema.prisma.");
  }
  async generateRequisitionNumber(department: string): Promise<string> {
    throw new Error("ERR: generateRequisitionNumber not implemented. Requires PurchaseRequest model logic.");
  }

  // Line Item operations - ALL ARE NOT IMPLEMENTED
  async createLineItem(lineItemData: any): Promise<any> {
    throw new Error("ERR: createLineItem not implemented. LineItem model is missing from schema.prisma.");
  }
  async getLineItemsByRequest(requestId: number): Promise<any[]> {
    throw new Error("ERR: getLineItemsByRequest not implemented. LineItem model is missing from schema.prisma.");
  }
  async updateLineItem(id: number, lineItemData: any): Promise<any> {
    throw new Error("ERR: updateLineItem not implemented. LineItem model is missing from schema.prisma.");
  }
  async deleteLineItem(id: number): Promise<void> {
    throw new Error("ERR: deleteLineItem not implemented. LineItem model is missing from schema.prisma.");
  }

  // Attachment operations - ALL ARE NOT IMPLEMENTED
  async createAttachment(attachmentData: any): Promise<any> {
    throw new Error("ERR: createAttachment not implemented. Attachment model is missing from schema.prisma.");
  }
  async getAttachmentsByRequest(requestId: number): Promise<any[]> {
    throw new Error("ERR: getAttachmentsByRequest not implemented. Attachment model is missing from schema.prisma.");
  }
  async deleteAttachment(id: number): Promise<void> {
    throw new Error("ERR: deleteAttachment not implemented. Attachment model is missing from schema.prisma.");
  }

  // Approval operations - ALL ARE NOT IMPLEMENTED (or need significant re-work for 'approval_matrix')
  async createApprovalHistory(approvalData: any): Promise<any> {
    throw new Error("ERR: createApprovalHistory not implemented. ApprovalHistory model is missing from schema.prisma.");
  }
  async getApprovalHistoryByRequest(requestId: number): Promise<any[]> {
    throw new Error("ERR: getApprovalHistoryByRequest not implemented. ApprovalHistory model is missing from schema.prisma.");
  }
  async getApprovalWorkflow(department: string, location: string): Promise<any[]> {
    console.warn("WARN: getApprovalWorkflow not fully implemented for the current database schema (missing ApprovalWorkflow model). Returning empty array.");
    return [];
  }

  // Notification operations - ALL ARE NOT IMPLEMENTED
  async createNotification(notificationData: any): Promise<any> {
    throw new Error("ERR: createNotification not implemented. Notification model is missing from schema.prisma.");
  }
  async getNotificationsByUser(userId: number): Promise<any[]> {
    throw new Error("ERR: getNotificationsByUser not implemented. Notification model is missing from schema.prisma.");
  }
  async markNotificationAsRead(id: number): Promise<void> {
    throw new Error("ERR: markNotificationAsRead not implemented. Notification model is missing from schema.prisma.");
  }

  // Master Data implementations for Admin system
  async getAllUsers(): Promise<User[]> {
    return this.prisma.users.findMany(); 
  }

  async deleteUser(empCode: string): Promise<void> { // Parameter changed to empCode: string
    await this.prisma.users.delete({ where: { emp_code: empCode } }); 
  }

  // Entity Master implementations - NOT IMPLEMENTED
  async getAllEntities(): Promise<any[]> {
    throw new Error("ERR: getAllEntities not implemented. Entity model is missing from schema.prisma.");
  }
  async createEntity(entityData: any): Promise<any> {
    throw new Error("ERR: createEntity not implemented. Entity model is missing from schema.prisma.");
  }
  async updateEntity(id: number, entityData: any): Promise<any> {
    throw new Error("ERR: updateEntity not implemented. Entity model is missing from schema.prisma.");
  }
  async deleteEntity(id: number): Promise<void> {
    throw new Error("ERR: deleteEntity not implemented. Entity model is missing from schema.prisma.");
  }

  // Department Master implementations - UPDATED: Primary key is dept_number (string)
  async getAllDepartments(): Promise<Department[]> {
    return this.prisma.departments.findMany(); 
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const createdDepartment = await this.prisma.departments.create({ data: departmentData }); 
    return createdDepartment;
  }

  async updateDepartment(deptNumber: string, departmentData: Partial<InsertDepartment>): Promise<Department> { // Parameter changed to deptNumber: string
    const updatedDepartment = await this.prisma.departments.update({ 
      where: { dept_number: deptNumber }, // Update by `dept_number`
      data: departmentData,
    });
    return updatedDepartment;
  }

  async deleteDepartment(deptNumber: string): Promise<void> { // Parameter changed to deptNumber: string
    await this.prisma.departments.delete({ where: { dept_number: deptNumber } }); 
  }

  // Location Master operations - NOT IMPLEMENTED (replaced by 'sites' conceptually)
  async getAllLocations(): Promise<any[]> {
    throw new Error("ERR: getAllLocations not implemented. Location model is missing from schema.prisma (consider using Sites).");
  }
  async createLocation(locationData: any): Promise<any> {
    throw new Error("ERR: createLocation not implemented. Location model is missing from schema.prisma (consider using Sites).");
  }
  async updateLocation(id: number, locationData: any): Promise<any> {
    throw new Error("ERR: updateLocation not implemented. Location model is missing from schema.prisma (consider using Sites).");
  }
  async deleteLocation(id: number): Promise<void> {
    throw new Error("ERR: deleteLocation not implemented. Location model is missing from schema.prisma (consider using Sites).");
  }

  // Role Master operations - NOT IMPLEMENTED
  async getAllRoles(): Promise<any[]> {
    throw new Error("ERR: getAllRoles not implemented. Role model is missing from schema.prisma.");
  }
  async createRole(roleData: any): Promise<any> {
    throw new Error("ERR: createRole not implemented. Role model is missing from schema.prisma.");
  }
  async updateRole(id: number, roleData: any): Promise<any> {
    throw new Error("ERR: updateRole not implemented. Role model is missing from schema.prisma.");
  }
  async deleteRole(id: number): Promise<void> {
    throw new Error("ERR: deleteRole not implemented. Role model is missing from schema.prisma.");
  }

  // Approval Matrix operations - UPDATED: Primary key is emp_code (string)
  async getAllApprovalMatrix(): Promise<ApprovalMatrix[]> {
    return this.prisma.approval_matrix.findMany(); 
  }

  async createApprovalMatrix(matrixData: InsertApprovalMatrix): Promise<ApprovalMatrix> {
    const createdMatrix = await this.prisma.approval_matrix.create({ data: matrixData }); 
    return createdMatrix;
  }

  async updateApprovalMatrix(empCode: string, matrixData: Partial<InsertApprovalMatrix>): Promise<ApprovalMatrix> { // Parameter changed to empCode: string
    const updatedMatrix = await this.prisma.approval_matrix.update({ 
      where: { emp_code: empCode }, // Update by `emp_code`
      data: matrixData,
    });
    return updatedMatrix;
  }

  async deleteApprovalMatrix(empCode: string): Promise<void> { // Parameter changed to empCode: string
    await this.prisma.approval_matrix.delete({ where: { emp_code: empCode } }); 
  }

  // Escalation Matrix operations - NOT IMPLEMENTED
  async getAllEscalationMatrix(): Promise<any[]> {
    throw new Error("ERR: getAllEscalationMatrix not implemented. EscalationMatrix model is missing from schema.prisma.");
  }
  async createEscalationMatrix(matrixData: any): Promise<any> {
    throw new Error("ERR: createEscalationMatrix not implemented. EscalationMatrix model is missing from schema.prisma.");
  }
  async updateEscalationMatrix(id: number, matrixData: any): Promise<any> {
    throw new Error("ERR: updateEscalationMatrix not implemented. EscalationMatrix model is missing from schema.prisma.");
  }
  async deleteEscalationMatrix(id: number): Promise<void> {
    throw new Error("ERR: deleteEscalationMatrix not implemented. EscalationMatrix model is missing from schema.prisma.");
  }

  // Inventory Master operations - NOT IMPLEMENTED
  async getAllInventory(): Promise<any[]> {
    throw new Error("ERR: getAllInventory not implemented. Inventory model is missing from schema.prisma.");
  }
  async createInventory(itemData: any): Promise<any> {
    throw new Error("ERR: createInventory not implemented. Inventory model is missing from schema.prisma.");
  }
  async updateInventory(id: number, itemData: any): Promise<any> {
    throw new Error("ERR: updateInventory not implemented. Inventory model is missing from schema.prisma.");
  }
  async deleteInventory(id: number): Promise<void> {
    throw new Error("ERR: deleteInventory not implemented. Inventory model is missing from schema.prisma.");
  }

  // Vendor Master operations - NOT IMPLEMENTED
  async getAllVendors(): Promise<any[]> {
    throw new Error("ERR: getAllVendors not implemented. Vendor model is missing from schema.prisma.");
  }
  async createVendor(vendorData: any): Promise<any> {
    throw new Error("ERR: createVendor not implemented. Vendor model is missing from schema.prisma.");
  }
  async updateVendor(id: number, vendorData: any): Promise<any> {
    throw new Error("ERR: updateVendor not implemented. Vendor model is missing from schema.prisma.");
  }
  async deleteVendor(id: number): Promise<void> {
    throw new Error("ERR: deleteVendor not implemented. Vendor model is missing from schema.prisma.");
  }

  // NEW: Site operations (fully implemented as 'sites' model exists)
  async getAllSites(): Promise<Site[]> {
    return this.prisma.sites.findMany(); 
  }

  async createSite(siteData: InsertSite): Promise<Site> {
    const createdSite = await this.prisma.sites.create({ data: siteData }); 
    return createdSite;
  }

  async updateSite(id: bigint, siteData: Partial<InsertSite>): Promise<Site> {
    const updatedSite = await this.prisma.sites.update({ 
      where: { id: id },
      data: siteData,
    });
    return updatedSite;
  }

  async deleteSite(id: bigint): Promise<void> {
    await this.prisma.sites.delete({ where: { id: id } }); 
  }
}

// Pass the initialized PrismaClient instance to the DatabaseStorage constructor
export const storage = new DatabaseStorage(prismaClient);