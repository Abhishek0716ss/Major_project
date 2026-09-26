"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WebcamFaceCapture from "@/components/WebcamFaceCapture";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", userCode: "", email: "", department: "" });
  const [samples, setSamples] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!samples || samples.length === 0) {
      setError("Please capture the applicant's face before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, samples }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <div className="card card-wide">
        <h1>Register New User</h1>
        <p className="subtitle">
          Enroll a person authorized for access. Face data is stored as an
          encrypted numeric descriptor, not as a photo.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div>
              <label>Full Name</label>
              <input value={form.name} onChange={update("name")} required />

              <label>User Code / ID</label>
              <input value={form.userCode} onChange={update("userCode")} placeholder="e.g. 4NI23CI042" required />

              <label>Email (optional)</label>
              <input type="email" value={form.email} onChange={update("email")} />

              <label>Department (optional)</label>
              <input value={form.department} onChange={update("department")} placeholder="e.g. CSE" />
            </div>

            <div>
              <label>Face Enrollment</label>
              <WebcamFaceCapture onComplete={setSamples} onReset={() => setSamples(null)} />
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Complete Registration"}
          </button>

          {error && <div className="error-box">{error}</div>}
        </form>
      </div>
    </div>
  );
}
