export function Card({ children, className = '', onClick, ...props }) {
    return (
        <div
            onClick={onClick}
            className={`bg-card border border-border rounded-xl p-5 ${onClick ? 'cursor-pointer transition-colors hover:bg-cardHover' : ''} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
