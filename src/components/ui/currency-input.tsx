import * as React from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
}

function formatWithDots(num: number): string {
  if (!num && num !== 0) return '';
  if (num === 0) return '';
  return num.toLocaleString('id-ID');
}

function parseDots(str: string): number {
  const cleaned = str.replace(/\./g, '').replace(/[^0-9-]/g, '');
  return Number(cleaned) || 0;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, prefix = 'Rp', ...props }, ref) => {
    const [display, setDisplay] = React.useState(() => value ? formatWithDots(value) : '');

    React.useEffect(() => {
      // Sync external value changes
      const formatted = value ? formatWithDots(value) : '';
      setDisplay(prev => {
        const prevNum = parseDots(prev);
        if (prevNum !== value) return formatted;
        return prev;
      });
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
      if (raw === '') {
        setDisplay('');
        onChange(0);
        return;
      }
      const num = Number(raw);
      setDisplay(formatWithDots(num));
      onChange(num);
    };

    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          className={cn(
            'flex h-10 w-full rounded-lg border border-input bg-background py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all',
            prefix ? 'pl-10 pr-3' : 'px-3',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput, formatWithDots, parseDots };
