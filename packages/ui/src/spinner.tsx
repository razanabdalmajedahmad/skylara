/** Border color matches `SKYLARA_BRAND.primaryHex` in tokens.ts (Tailwind JIT). */
export type SpinnerProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  'aria-label'?: string;
};

const sizeClasses = {
  sm: 'w-6 h-6 border-2',
  md: 'w-12 h-12 border-4',
  lg: 'w-16 h-16 border-4',
} as const;

export function Spinner({
  className = '',
  size = 'md',
  label,
  'aria-label': ariaLabel = 'Loading',
}: SpinnerProps) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div
        className={`${sizeClasses[size]} rounded-full border-[#1B4F72] border-t-transparent animate-spin`}
      />
      {label ? (
        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">{label}</span>
      ) : null}
    </div>
  );
}
