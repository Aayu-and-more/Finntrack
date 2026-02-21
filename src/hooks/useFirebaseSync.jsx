import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";

export function useFirebaseSync(userId) {
    const [data, setData] = useState({
        transactions: [],
        budgets: [],
        debts: [],
        savingsPots: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setData({ transactions: [], budgets: [], debts: [], savingsPots: [] });
            setLoading(false);
            return;
        }

        setLoading(true);

        // Queries
        const qTx = query(
            collection(db, "transactions"),
            where("user_id", "==", userId),
            orderBy("date", "desc")
        );
        const qBudgets = query(collection(db, "budgets"), where("user_id", "==", userId));
        const qDebts = query(collection(db, "debts"), where("user_id", "==", userId));
        const qPots = query(collection(db, "savings_pots"), where("user_id", "==", userId));
        const qContribs = query(collection(db, "savings_contributions"), where("user_id", "==", userId));

        // Listeners state
        let tx = [];
        let budgets = [];
        let debts = [];
        let pots = [];
        let contribs = [];

        let isInit = { tx: false, budgets: false, debts: false, pots: false, contribs: false };

        const updateState = () => {
            // Wait for all initial snapshots to resolve before stopping the loading spinner
            if (Object.values(isInit).every(Boolean)) {
                setData({
                    transactions: tx.map(t => ({ ...t, amount: parseFloat(t.amount) })),
                    budgets: budgets.map(b => ({ ...b, limit: parseFloat(b.limit) })),
                    debts: debts.map(d => ({ ...d, amount: parseFloat(d.amount) })),
                    savingsPots: pots.map(p => ({
                        ...p,
                        target: parseFloat(p.target),
                        monthlyAmount: parseFloat(p.monthly_amount || 0),
                        contributions: contribs
                            .filter(c => c.pot_id === p.id)
                            .map(c => ({ ...c, amount: parseFloat(c.amount) }))
                    }))
                });
                setLoading(false);
            }
        };

        const unsubTx = onSnapshot(qTx, (snapshot) => {
            tx = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            isInit.tx = true;
            updateState();
        });

        const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
            budgets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            isInit.budgets = true;
            updateState();
        });

        const unsubDebts = onSnapshot(qDebts, (snapshot) => {
            debts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            isInit.debts = true;
            updateState();
        });

        const unsubPots = onSnapshot(qPots, (snapshot) => {
            pots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            isInit.pots = true;
            updateState();
        });

        const unsubContribs = onSnapshot(qContribs, (snapshot) => {
            contribs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            isInit.contribs = true;
            updateState();
        });

        return () => {
            unsubTx();
            unsubBudgets();
            unsubDebts();
            unsubPots();
            unsubContribs();
        };
    }, [userId]);

    return { ...data, loading };
}
