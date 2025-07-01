export interface LineItemFormData {
  itemName: string;
  requiredQuantity: number;
  unitOfMeasure: string;
  requiredByDate: string;
  deliveryLocation: string;
  estimatedCost: number;
  itemJustification?: string;
}

export interface PurchaseRequestFormData {
  title: string;
  requestDate: string;
  department: string;
  location: string;
  businessJustificationCode: string;
  businessJustificationDetails: string;
  lineItems: LineItemFormData[];
  attachments: File[];
}

export interface User {
  emp_code: string;
  name?: string;
  email?: string;
  mobile_no?: string;
  department?: string;
  manager_name?: string;
  manager_email?: string;
  entity?: string;
  location?: string;
  site?: string;
  role?: string;
  description?: string;
  erp_id?: string;
  password: string;
  must_reset_password?: boolean;
  approval_matrix?: ApprovalMatrix;
}

export interface ApprovalMatrix {
  emp_code: string;
  name?: string;
  email?: string;
  mobile_no?: string;
  site?: string;
  department?: string;

  approver_1_name?: string;
  approver_1_email?: string;
  approver_1_emp_code?: string;

  approver_2_name?: string;
  approver_2_email?: string;
  approver_2_emp_code?: string;

  approver_3a_name?: string;
  approver_3a_email?: string;
  approver_3a_emp_code?: string;

  approver_3b_name?: string;
  approver_3b_email?: string;
  approver_3b_emp_code?: string;

  users?: User;
}

export interface PurchaseRequest {
  id: number;
  requisitionNumber: string;
  title: string;
  requestDate: string;
  department: string;
  location: string;
  businessJustificationCode: string;
  businessJustificationDetails: string;
  status: string;
  currentApprovalLevel: number;
  totalEstimatedCost: string;
  requesterId: number;
  currentApproverId?: number;
  requester?: User;
  currentApprover?: User;
  lineItems?: LineItem[];
  attachments?: Attachment[];
  approvalHistory?: ApprovalHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LineItem {
  id: number;
  purchaseRequestId: number;
  itemName: string;
  requiredQuantity: number;
  unitOfMeasure: string;
  requiredByDate: string;
  deliveryLocation: string;
  estimatedCost: string;
  itemJustification?: string;
  stockAvailable?: number;
  stockLocation?: string;
  createdAt?: string;
}

export interface Attachment {
  id: number;
  purchaseRequestId: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploadedAt?: string;
}

export interface ApprovalHistory {
  id: number;
  purchaseRequestId: number;
  approverId: number;
  action: string;
  comments?: string;
  approvalLevel: number;
  actionDate?: string;
  approver?: User;
  approverEmployeeNumber?: string;
}

export interface Notification {
  id: number;
  userId: number;
  purchaseRequestId?: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt?: string;
}

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalValue: number;
}
