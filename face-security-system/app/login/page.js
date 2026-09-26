"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(false);

  useEffect(() => {
    setWebauthnSupported(
      typeof window !== "undefined" &&
        window.PublicKeyCredential !== undefined
    );
  }, []);

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setError("");
    setLoading(true);
    try {
      if (!email) throw new Error("Enter your admin email first");

      const optsRes = await fetch("/api/auth/passkey/authentication-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const options = await optsRes.json();
      if (!optsRes.ok) throw new Error(options.error || "No passkey registered for this account");

      const assertion = await startAuthentication(options);

      const verifyRes = await fetch("/api/auth/passkey/verify-authentication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, assertion }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Passkey verification failed");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message || "Passkey sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card">
        <h1>Admin Sign In</h1>
        <p className="subtitle">
          AI Face Access Control &amp; Intrusion Alert System — NIE
        </p>

        <form onSubmit={handlePasswordLogin}>
          <label>Admin Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@nie.ac.in"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in with password"}
          </button>
        </form>

        {webauthnSupported && (
          <>
            <div className="divider">OR</div>
            <button
              className="btn-secondary"
              onClick={handlePasskeyLogin}
              disabled={loading}
              type="button"
            >
              Sign in with passkey
            </button>
          </>
        )}

        {error && <div className="error-box">{error}</div>}
      </div>
    </div>
  );
}
