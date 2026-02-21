import { forwardRef } from "react";

export const Input = forwardRef(({ label, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
        {label && (
            <label className="text-xs text-textMuted font-medium">
                {label}
            </label>
        )}
        <input
            ref={ref}
            className={`bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition-colors ${className}`}
            {...props}
        />
    </div>
));
Input.displayName = "Input";
