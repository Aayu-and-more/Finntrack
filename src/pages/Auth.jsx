import { useState } from "react";
import { auth } from "../lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

export function Auth() {
    const [mode, setMode] = useState("login"); // login, signup, forgot
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email || (mode !== "forgot" && !password)) return setError("Please fill all fields");
        if (password.length < 6 && mode !== "forgot") return setError("Password must be at least 6 characters");
        setError(""); setMessage(""); setLoading(true);

        try {
            if (mode === "signup") {
                await createUserWithEmailAndPassword(auth, email, password);
            } else if (mode === "login") {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await sendPasswordResetEmail(auth, email);
                setMessage("Password reset email sent (check spam)");
            }
        } catch (e) {
            if (e.code === "auth/email-already-in-use") setError("Email already registered");
            else if (e.code === "auth/wrong-password" || e.code === "auth/user-not-found") setError("Invalid email or password");
            else setError(e.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold tracking-tight text-text">FinnTrack</h1>
                    <p className="mt-2 text-sm text-textMuted">Track expenses across all your apps</p>
                </div>

                <Card className="p-8 shadow-xl">
                    <h3 className="text-xl font-semibold text-center mb-6 text-text">
                        {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
                    </h3>

                    <div className="space-y-4 flex flex-col">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                        {mode !== "forgot" && (
                            <Input
                                label="Password"
                                type="password"
                                placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        )}

                        {error && (
                            <p className="text-sm text-danger bg-dangerDim px-3 py-2 rounded-lg m-0">{error}</p>
                        )}
                        {message && (
                            <p className="text-sm text-accent bg-accentDim px-3 py-2 rounded-lg m-0">{message}</p>
                        )}

                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full mt-2"
                        >
                            {loading ? "..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                        </Button>
                    </div>

                    <div className="mt-6 text-center space-y-2">
                        {mode === "login" && (
                            <>
                                <button onClick={() => setMode("signup")} className="text-sm font-medium text-accent hover:underline">Sign up</button>
                                <br />
                                <button onClick={() => setMode("forgot")} className="text-xs text-textDim hover:text-textMuted transition-colors mt-2">Forgot password?</button>
                            </>
                        )}
                        {mode === "signup" && (
                            <button onClick={() => setMode("login")} className="text-sm font-medium text-accent hover:underline">Already have an account? Log in</button>
                        )}
                        {mode === "forgot" && (
                            <button onClick={() => setMode("login")} className="text-sm font-medium text-accent hover:underline">Back to login</button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
