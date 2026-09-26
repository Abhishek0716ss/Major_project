"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";

export default function PasskeySetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState("idle"); // idle | working | done
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");

  async function handleSetup() {
    setError("");
    setStatus("working");
    try {
      const optsRes = await fetch("/api/auth/passkey/registration-options", { method: "POST" });
      const options = await optsRes.json();
      if (!optsRes.ok) throw new Error(options.error || "Could not start passkey setup");

      const attestation = await startRegistration(options);

      const verifyRes = await fetch("/api/auth/passkey/verify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attestation, deviceLabel: label || "Passkey" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Passkey setup failed");

      setStatus("done");
    } catch (err) {
      setError(err.message || "Passkey setup failed");
      setStatus("idle");
    }
  }

  return (
    <div className="page-center">
      <div className="card">
        <h1>Set Up Passkey</h1>
        <p className="subtitle">
          Use Windows Hello, Touch ID, a phone authenticator, or a security key
          to sign in without typing your password next time.
        </p>

        <label>Device label (optional)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. My Laptop Windows Hello"
        />

        <button className="btn-primary" onClick={handleSetup} disabled={status === "working"}>
          {status === "working" ? "Waiting for device…" : "Register passkey"}
        </button>

        <button className="btn-secondary" onClick={() => router.back()} type="button">
          Skip for now
        </button>

        {status === "done" && (
          <div className="success-box">
            Passkey registered. You can now sign in with it from the login page.
          </div>
        )}
        {error && <div className="error-box">{error}</div>}
      </div>
    </div>
  );
}
