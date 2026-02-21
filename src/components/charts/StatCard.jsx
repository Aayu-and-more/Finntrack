import { Card } from "../ui/Card";

export function StatCard({ label, value, colorClass, bgClass, icon: Icon }) {
    return (
        <Card className="p-4 flex justify-between items-start">
            <div>
                <p className="m-0 text-xs text-textMuted font-medium">{label}</p>
                <p className={`mt-1.5 mb-0 text-xl font-bold ${colorClass}`}>
                    {value}
                </p>
            </div>
            <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bgClass} ${colorClass}`}
            >
                {Icon && <Icon size={16} />}
            </div>
        </Card>
    );
}
