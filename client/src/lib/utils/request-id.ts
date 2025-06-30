export function generateRequisitionNumber(department: string): string {
  const deptCode = department.substring(0, 4).toUpperCase();
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const autoNo = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  
  return `PR-${deptCode}-${yearMonth}-${autoNo}`;
}

export function parseRequisitionNumber(requisitionNumber: string) {
  const parts = requisitionNumber.split('-');
  if (parts.length !== 4) {
    throw new Error('Invalid requisition number format');
  }
  
  const [prefix, deptCode, yearMonth, autoNo] = parts;
  const year = yearMonth.substring(0, 4);
  const month = yearMonth.substring(4, 6);
  
  return {
    prefix,
    departmentCode: deptCode,
    year: parseInt(year),
    month: parseInt(month),
    autoNumber: parseInt(autoNo),
  };
}

export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

export function calculateDaysAgo(date: string | Date): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - dateObj.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'submitted':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'returned':
      return 'bg-orange-100 text-orange-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

export function validateFileSize(file: File, maxSizeInBytes: number): boolean {
  return file.size <= maxSizeInBytes;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
