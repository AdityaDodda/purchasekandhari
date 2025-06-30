import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
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
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <Badge className={cn(getStatusStyles(status), className)}>
      {formatStatus(status)}
    </Badge>
  );
}
