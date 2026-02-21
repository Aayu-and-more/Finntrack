import { useState } from "react";
import { format } from "date-fns";
import { collection, addDoc, getDocs, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";

export function Settings({ transactions, debts, budgets, savingsPots, userId }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [importing, setImporting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Statistics
    const stats = {
        tx: transactions.length,
        inc: transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        exp: transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
        saved: savingsPots.reduce((s, p) => s + p.contributions.reduce((ss, c) => ss + c.amount, 0), 0),
    };

    const fmtUserStr = (n) =>
        Math.abs(n) >= 1000
            ? (n < 0 ? "-" : "") + "€" + (Math.abs(n) / 1000).toFixed(1) + "k"
            : (n < 0 ? "-" : "") + "€" + Math.abs(n).toFixed(2);

    const handleExport = () => {
        const data = JSON.stringify({ transactions, debts, budgets, savingsPots, exportedAt: new Date().toISOString() }, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `finntrack-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = ".json";
        inp.onchange = async (e) => {
            const f = e.target.files[0];
            if (!f) return;
            try {
                const text = await f.text();
                const data = JSON.parse(text);

                setImporting(true);
                // Helper to bulk insert
                const bulkInsert = async (collName, items) => {
                    for (const item of items) {
                        // Remove old explicit IDs if they exist to let Firebase auto-generate
                        const cleanItem = { ...item };
                        delete cleanItem.id;
                        // Ensure user_id matches the current authenticated user
                        cleanItem.user_id = userId;
                        await addDoc(collection(db, collName), cleanItem);
                    }
                };

                if (data.transactions) await bulkInsert("transactions", data.transactions);
                if (data.debts) await bulkInsert("debts", data.debts);
                if (data.budgets) await bulkInsert("budgets", data.budgets);
                if (data.savingsPots) await bulkInsert("savings_pots", data.savingsPots);

                alert("Import successful! Data will sync shortly.");
            } catch (err) {
                console.error("Import failed:", err);
                alert("Invalid file or import failed.");
            } finally {
                setImporting(false);
            }
        };
        inp.click();
    };

    const handleReset = async () => {
        setDeleting(true);
        try {
            // Helper to delete all docs in a collection for this user
            const bulkDelete = async (collName) => {
                const collRef = collection(db, collName);
                const snapshot = await getDocs(collRef);
                // Note: For large collections, writeBatch should be used or query properly
                // This is a naive client-side wipe for the user's data
                const batch = writeBatch(db);
                snapshot.docs.forEach(docSnap => {
                    if (docSnap.data().user_id === userId) {
                        batch.delete(docSnap.ref);
                    }
                });
                await batch.commit();
            };

            await bulkDelete("transactions");
            await bulkDelete("debts");
            await bulkDelete("budgets");
            await bulkDelete("savings_pots");
            await bulkDelete("savings_contributions");

            setShowConfirm(false);
        } catch (err) {
            console.error("Reset failed", err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-3xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-text m-0">Settings</h2>
                <p className="text-sm text-textMuted mt-1 mb-0">Manage your data and account</p>
            </div>

            <Card>
                <p className="text-sm font-semibold text-text m-0 mb-4">Overview</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { l: "Transactions", v: stats.tx },
                        { l: "Total Income", v: fmtUserStr(stats.inc) },
                        { l: "Total Expenses", v: fmtUserStr(stats.exp) },
                        { l: "Total Saved", v: fmtUserStr(stats.saved) },
                    ].map((s, i) => (
                        <div key={i} className="bg-bg p-3 rounded-lg border border-border">
                            <p className="text-xs text-textDim m-0 font-medium">{s.l}</p>
                            <p className="font-bold text-lg text-text mt-1 mb-0">{s.v}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <p className="text-sm font-semibold text-text m-0 mb-4">Data Management</p>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-3 bg-bg border border-border rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-text m-0">Export Backup</p>
                            <p className="text-xs text-textDim mt-0.5 mb-0">Download a JSON copy of all your data.</p>
                        </div>
                        <Button variant="secondary" size="md" onClick={handleExport}>
                            Export
                        </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-bg border border-border rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-text m-0">Import Backup</p>
                            <p className="text-xs text-textDim mt-0.5 mb-0">Restore data from a JSON file.</p>
                        </div>
                        <Button variant="secondary" size="md" onClick={handleImport} disabled={importing}>
                            {importing ? "Importing..." : "Import"}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-dangerDim border border-danger/20 rounded-lg mt-2">
                        <div>
                            <p className="text-sm font-semibold text-danger m-0">Danger Zone</p>
                            <p className="text-xs text-danger/80 mt-0.5 mb-0">Permanently delete all your financial records.</p>
                        </div>
                        <Button variant="danger" size="md" onClick={() => setShowConfirm(true)}>
                            Reset Account
                        </Button>
                    </div>
                </div>
            </Card>

            <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Reset Account?">
                <p className="text-sm text-textMuted mb-6">
                    This will permanently delete all your transactions, budgets, debts, and savings pots. This action cannot be undone. Are you absolutely sure?
                </p>
                <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={handleReset} disabled={deleting}>
                        {deleting ? "Deleting..." : "Yes, Delete Everything"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
