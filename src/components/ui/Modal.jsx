import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, width = "max-w-md" }) {
    // Prevent scrolling on body when modal is open
    if (typeof window !== "undefined") {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "unset";
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
                            className={`bg-card border border-border rounded-2xl w-full ${width} max-h-[85vh] overflow-y-auto pointer-events-auto p-6 shadow-2xl`}
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-semibold text-text">{title}</h3>
                                <button
                                    onClick={onClose}
                                    className="text-textMuted hover:text-text p-1 rounded-md hover:bg-border/50 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            {children}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
