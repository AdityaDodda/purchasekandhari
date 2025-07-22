import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
  daysPending?: number;
  approverLevel?: number;
}

export function StatusBadge({ status, className, daysPending, approverLevel }: StatusBadgeProps) {
  // Default status to empty string if undefined/null
  const safeStatus = status || "";
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "submitted":
        return "status-badge-submitted";
      case "pending":
        return "status-badge-pending";
      case "approved":
        return "status-badge-approved";
      case "rejected":
        return "status-badge-rejected";
      case "returned":
        return "status-badge-returned";
      case "cancelled":
        return "status-badge-cancelled";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <Badge className={cn(getStatusStyles(safeStatus), className)}>
      {formatStatus(safeStatus)}
      {(typeof daysPending === 'number' && typeof approverLevel === 'number') && (
        <span className="ml-2 text-[10px] font-normal">
          | {daysPending} days | Level {approverLevel}
        </span>
      )}
    </Badge>
  );
}
