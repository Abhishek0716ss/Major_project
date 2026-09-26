import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

const ROADMAP = [
  { name: "User Registration & Face Enrollment", status: "done" },
  { name: "Face Detection + Image Quality Assessment", status: "done" },
  { name: "Liveness / Anti-Spoofing", status: "planned" },
  { name: "Face Authentication + Multi-Frame Matching", status: "planned" },
  { name: "Privacy-Preserving Biometric Storage", status: "done" },
  { name: "Dynamic Risk Assessment + Risk History/Decay", status: "planned" },
  { name: "Adaptive Authentication + Adaptive Threshold", status: "planned" },
  { name: "Intelligent Intrusion Detection + Severity Classification", status: "planned" },
  { name: "Explainable Authentication + Real-Time Alerts", status: "planned" },
  { name: "Security Dashboard + Authentication Logs + Analytics", status: "planned" },
];

export default function DashboardPage() {
  const session = getSessionFromCookies();
  const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(session.sub);
  const users = db
    .prepare("SELECT id, name, user_code, department, status, created_at FROM users ORDER BY created_at DESC")
    .all();

  return (
    <div>
      <div className="topbar">
        <div>
          <strong>AI Face Access Control</strong>
          <div className="subtitle" style={{ margin: 0 }}>{admin.email}</div>
        </div>
        <LogoutButton />
      </div>

      <div className="container">
        <div className="grid-2">
          <div className="card card-wide">
            <h2>Registered Users ({users.length})</h2>
            <p className="subtitle">Enrolled with face data, ready for authentication once Module 4 ships.</p>
            <Link href="/register">
              <button className="btn-primary" type="button">+ Register New User</button>
            </Link>

            {users.length > 0 ? (
              <table style={{ marginTop: 20 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>User Code</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.user_code}</td>
                      <td>{u.department || "—"}</td>
                      <td>{u.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="subtitle" style={{ marginTop: 20 }}>No users enrolled yet.</p>
            )}
          </div>

          <div className="card card-wide">
            <h2>Project Roadmap</h2>
            <p className="subtitle">Where each module of your NIE project currently stands.</p>
            <table>
              <thead>
                <tr><th>Module</th><th>Status</th></tr>
              </thead>
              <tbody>
                {ROADMAP.map((m) => (
                  <tr key={m.name}>
                    <td>{m.name}</td>
                    <td>
                      <span className={m.status === "done" ? "badge badge-done" : "badge badge-planned"}>
                        {m.status === "done" ? "Built" : "Planned"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!admin.passkey_enabled && (
              <>
                <p className="subtitle" style={{ marginTop: 20 }}>
                  You're signing in with a password only.
                </p>
                <Link href="/dashboard/passkey-setup">
                  <button className="btn-secondary" type="button">Set up passkey login</button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
