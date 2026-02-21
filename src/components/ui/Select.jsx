import { forwardRef } from "react";

export const Select = forwardRef(({ label, options, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
        {label && (
            <label className="text-xs text-textMuted font-medium">
                {label}
            </label>
        )}
        <select
            ref={ref}
            className={`bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition-colors appearance-none ${className}`}
            {...props}
        >
            {options.map((o) => (
                <option key={o.value} value={o.value} className="bg-card text-text">
                    {o.label}
                </option>
            ))}
        </select>
    </div>
));
Select.displayName = "Select";
