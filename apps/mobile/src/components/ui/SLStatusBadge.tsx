import React from 'react';
import SLBadge from './SLBadge';

type LoadStatus = 'FILLING' | 'LOCKED' | 'BOARDING' | 'IN_FLIGHT' | 'COMPLETED' | 'CANCELLED';
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type WeatherStatus = 'excellent' | 'good' | 'moderate' | 'poor';
type GearStatus = 'SERVICEABLE' | 'DUE_SOON' | 'OVERDUE' | 'GROUNDED';

type StatusType = LoadStatus | BookingStatus | WeatherStatus | GearStatus | string;

interface SLStatusBadgeProps {
  status: StatusType;
}

function getVariant(status: StatusType): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'secondary' {
  switch (status) {
    // Load statuses
    case 'FILLING':
      return 'info';
    case 'LOCKED':
      return 'warning';
    case 'BOARDING':
      return 'success';
    case 'IN_FLIGHT':
      return 'secondary';

    // Booking statuses
    case 'PENDING':
      return 'warning';
    case 'CONFIRMED':
    case 'CHECKED_IN':
      return 'success';
    case 'NO_SHOW':
      return 'danger';

    // Weather
    case 'excellent':
      return 'success';
    case 'good':
      return 'primary';
    case 'moderate':
      return 'warning';
    case 'poor':
      return 'danger';

    // Gear
    case 'SERVICEABLE':
      return 'success';
    case 'DUE_SOON':
      return 'warning';
    case 'OVERDUE':
    case 'GROUNDED':
      return 'danger';

    // Completed / Cancelled (shared)
    case 'COMPLETED':
      return 'neutral';
    case 'CANCELLED':
      return 'danger';

    default:
      return 'neutral';
  }
}

function formatLabel(status: StatusType): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SLStatusBadge({ status }: SLStatusBadgeProps) {
  return <SLBadge label={formatLabel(status)} variant={getVariant(status)} />;
}
