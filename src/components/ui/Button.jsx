export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled,
    ...props
}) {
    const base = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none rounded-lg";

    const variants = {
        primary: "bg-accent text-bg hover:bg-emerald-600 font-semibold",
        secondary: "bg-border text-text hover:bg-gray-300 dark:hover:bg-gray-700",
        danger: "bg-dangerDim text-danger hover:bg-red-500 hover:text-white",
        ghost: "bg-transparent text-textMuted hover:bg-border/50 hover:text-text",
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
    };

    return (
        <button
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
