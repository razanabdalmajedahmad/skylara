import { STATUS_COLORS } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_COLORS[status] || STATUS_COLORS.COMPLETE;

  return (
    <span className={`status-badge ${config.bg} ${config.text} ${className}`}>
      {config.label}
    </span>
  );
}
