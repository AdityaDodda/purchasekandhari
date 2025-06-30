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
  id: number;
  employeeNumber: string;
  fullName: string;
  email: string;
  mobile?: string;
  department: string;
  location: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
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
