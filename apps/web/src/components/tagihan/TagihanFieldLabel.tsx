import { TagihanInfoTooltip as InfoTooltip } from './TagihanInfoTooltip';

interface TagihanFieldLabelProps {
  children: React.ReactNode;
  tooltip?: string;
  required?: boolean;
}

export function TagihanFieldLabel({ children, tooltip, required }: TagihanFieldLabelProps) {
  return (
    <label className="text-sm font-medium mb-1.5 flex items-center gap-0.5 text-foreground">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
      {tooltip && <InfoTooltip text={tooltip} />}
    </label>
  );
}
