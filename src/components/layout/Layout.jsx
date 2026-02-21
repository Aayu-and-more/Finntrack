import { Sidebar } from "./Sidebar";
import { useState } from "react";

export function Layout({ children, page, setPage, onSignOut }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-bg">
            <Sidebar
                page={page}
                setPage={setPage}
                onSignOut={onSignOut}
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
            />
            <main className="flex-1 overflow-x-hidden min-w-0">
                <div className="max-w-6xl mx-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
