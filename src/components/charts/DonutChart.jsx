import { motion } from "framer-motion";

export function DonutChart({ segments, size = 110 }) {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (!total) return null;

    const r = size / 2 - 8;
    const cx = size / 2;
    const cy = size / 2;
    const ir = r * 0.6;

    let cum = 0;

    return (
        <svg width={size} height={size}>
            {segments.map((seg, i) => {
                const startAngle = (cum / total) * 2 * Math.PI - Math.PI / 2;
                cum += seg.value;
                const endAngle = (cum / total) * 2 * Math.PI - Math.PI / 2;

                const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

                const pathData = `
          M ${cx + r * Math.cos(startAngle)} ${cy + r * Math.sin(startAngle)} 
          A ${r} ${r} 0 ${largeArcFlag} 1 ${cx + r * Math.cos(endAngle)} ${cy + r * Math.sin(endAngle)} 
          L ${cx + ir * Math.cos(endAngle)} ${cy + ir * Math.sin(endAngle)} 
          A ${ir} ${ir} 0 ${largeArcFlag} 0 ${cx + ir * Math.cos(startAngle)} ${cy + ir * Math.sin(startAngle)} Z
        `;

                return (
                    <motion.path
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.85, scale: 1 }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        d={pathData}
                        fill={seg.color}
                        style={{ transformOrigin: "50% 50%" }}
                        className="hover:opacity-100 transition-opacity cursor-pointer"
                    />
                );
            })}
        </svg>
    );
}
