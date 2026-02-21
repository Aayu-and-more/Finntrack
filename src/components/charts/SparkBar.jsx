import { motion } from "framer-motion";

export function SparkBar({ data, height = 60 }) {
    if (!data || !data.length) return null;
    const max = Math.max(...data.map(d => d.value), 1);
    const w = Math.min(24, (280 / data.length) - 2);

    return (
        <svg width="100%" height={height + 16} viewBox={`0 0 ${data.length * (w + 2)} ${height + 16}`} className="overflow-visible">
            {data.map((d, i) => {
                const h = Math.max((d.value / max) * (height - 8), 2);
                const y = height - h;
                return (
                    <g key={i}>
                        <motion.rect
                            initial={{ height: 0, y: height }}
                            animate={{ height: h, y: y }}
                            transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
                            x={i * (w + 2)}
                            width={w}
                            rx={3}
                            className={d.highlight ? "fill-accent" : "fill-border"}
                            fillOpacity={d.highlight ? 1 : 0.5}
                        />
                        <text
                            x={i * (w + 2) + w / 2}
                            y={height + 12}
                            textAnchor="middle"
                            className="fill-textDim text-[8px] font-sans"
                        >
                            {d.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}
