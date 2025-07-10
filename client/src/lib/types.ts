export interface LineItemFormData {
  itemName: string;
  requiredQuantity: number;
  unitOfMeasure: string;
  requiredByDate: string;
  deliveryLocation: string;
  estimatedCost: number;
  itemJustification?: string;
  vendor?: any;
}

export interface PurchaseRequestFormData {
  title: string;
  requestDate: string;
  department: string;
  location: string;
  businessJustificationCode: string;
  businessJustificationDetails: string;
  entity: string;
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

export interface escalation_matrix {
  prNumber: string;
  reqEmpCode?: string;
  reqEmpMail?: string;
  reqEmpName?: string;
  approver1Code?: string;
  approver1Mail?: string;
  approver1Name?: string;
  approver2Code?: string;
  approver2Mail?: string;
  approver2Name?: string;
  approver3Code?: string;
  approver3Mail?: string;
  approver3Name?: string;
  manager1Code?: string;
  manager1Mail?: string;
  manager1Name?: string;
  manager2Code?: string;
  manager2Mail?: string;
  manager2Name?: string;
}

export interface pr_escalation_logs {
  id: number;
  prNumber: string;
  level: number;
  status?: string;
  escalatedAt?: string;
  notifiedAt?: string;
  emailSentTo?: string;
  comment?: string;
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
  vendor?: any;
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

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalValue: number;
}
