import { Home, ArrowDownUp, PiggyBank, HandCoins, Target, Settings, LogOut, Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "../ui/ThemeProvider";

const NAV_ITEMS = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "transactions", icon: ArrowDownUp, label: "Transactions" },
    { id: "savings", icon: PiggyBank, label: "Savings" },
    { id: "debts", icon: HandCoins, label: "Debts" },
    { id: "budgets", icon: Target, label: "Budgets" },
    { id: "settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ page, setPage, onSignOut, isOpen, setIsOpen }) {
    const { theme, toggleTheme } = useTheme();

    const handleNav = (id) => {
        setPage(id);
        if (window.innerWidth < 768) setIsOpen(false);
    };

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-30">
                <h1 className="text-xl font-bold tracking-tight text-accent">FinnTrack</h1>
                <button onClick={() => setIsOpen(!isOpen)} className="text-text hover:text-accent transition-colors pb-1">
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div
                className={`fixed md:sticky top-[69px] md:top-0 left-0 h-[calc(100vh-69px)] md:h-screen w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 z-40 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    }`}
            >
                <div className="hidden md:block p-6">
                    <h1 className="text-2xl font-bold tracking-tight text-text">
                        Finn<span className="text-accent">Track</span>
                    </h1>
                    <p className="text-xs text-textDim mt-1 truncate">Complete Expense Tracker</p>
                </div>

                <nav className="flex-1 px-4 py-4 md:py-0 overflow-y-auto space-y-1">
                    {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                        const active = page === id;
                        return (
                            <button
                                key={id}
                                onClick={() => handleNav(id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                                        ? "bg-accent/10 text-accent"
                                        : "text-textMuted hover:bg-cardHover hover:text-text"
                                    }`}
                            >
                                <Icon size={18} className={active ? "text-accent" : "text-textMuted"} />
                                {label}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border space-y-2">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-textMuted hover:bg-cardHover hover:text-text transition-all"
                    >
                        {theme === "dark" ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-blue-500" />}
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>

                    {/* Sign Out */}
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-dangerDim transition-all"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}
