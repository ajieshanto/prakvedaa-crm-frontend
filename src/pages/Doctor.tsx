// src/pages/Doctor.tsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../auth";

type Role = "sales" | "doctor";
type User = { email: string; role: Role };

type Patient = {
  id: number;
  name: string;
  age?: number;
  contact?: string;
  notes?: string;
  created_by: string;
  assigned_doctor_email?: string | null;
};

type Consultation = {
  id: number;
  patient_id: number;
  video_url: string;
  scheduled_at?: string | null;
  created_by: string;
  status?: "pending" | "completed";
  doctor_notes?: string | null;
};

export default function Doctor() {
  const { user, logout } = useAuth() as { user: User | null; logout: () => void };

  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [openPanelId, setOpenPanelId] = useState<number | null>(null);
  const [notesInput, setNotesInput] = useState<string>("");

  // toast
  const [toast, setToast] = useState<{ show: boolean; text: string }>({
    show: false,
    text: "",
  });
  const showToast = (text: string) => {
    setToast({ show: true, text });
    setTimeout(() => setToast({ show: false, text: "" }), 2500);
  };

  const loadAll = async () => {
    try {
      // Doctor: backend already filters only assigned consultations
      const [p, c] = await Promise.all([
        api.get("/patients/list"),
        api.get("/consultations/list"),
      ]);
      setPatients(p.data);
      setConsultations(c.data);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 10000);
    return () => clearInterval(t);
  }, []);

  const patientById = useMemo(() => {
    const m: Record<number, Patient> = {};
    patients.forEach((p) => (m[p.id] = p));
    return m;
  }, [patients]);

  const renderStatusBadge = (status?: string) => {
    const s = (status || "pending").toLowerCase();
    if (s === "completed") {
      return <span className="px-2 py-1 rounded text-xs bg-green-200 text-green-800">Completed</span>;
    }
    return <span className="px-2 py-1 rounded text-xs bg-yellow-200 text-yellow-800">Pending</span>;
  };

  const openUpdatePanel = (c: Consultation) => {
    setOpenPanelId((prev) => (prev === c.id ? null : c.id));
    setNotesInput(c.doctor_notes || "");
  };

  const patchConsultation = async (c: Consultation, markDone: boolean) => {
    const body: any = {
      consultation_id: c.id,
      notes: notesInput ?? "",
    };
    if (markDone) body.status = "completed";
    await api.patch(`/consultations/update`, body, {
      params: { consultation_id: c.id },
    });
    showToast("✅ Consultation Updated Successfully");
    setOpenPanelId(null);
    setNotesInput("");
    await loadAll();
  };

  const printSummary = (c: Consultation) => {
    const p = patientById[c.patient_id];
    const when = c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "—";
    const notes = (c.doctor_notes || "").trim() || "—";
    const phone = p?.contact || "—";
    const doc = window.open("", "_blank", "width=800,height=900");
    if (!doc) return;

    doc.document.write(`
      <html>
        <head>
          <title>Consultation #${c.id} — Summary</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; color: #111827; }
            .title { font-weight: 800; font-size: 22px; margin-bottom: 4px; display:flex; gap:8px; align-items:center; }
            .tagline { color: #6B7280; font-style: italic; margin-bottom: 16px; }
            .card { border: 2px solid #3B82F6; border-radius: 16px; padding: 20px; }
            .row { display: grid; grid-template-columns: 180px 1fr; gap: 10px; margin: 8px 0; }
            .label { color: #374151; }
            .badge { display:inline-block; padding:4px 10px; border-radius:9999px; font-size:12px; }
            .badge-pending { background:#FEF3C7; color:#92400E; }
            .badge-completed { background:#DCFCE7; color:#166534; }
            .footer { margin-top: 16px; color: #6B7280; font-size: 12px; }
            .link { color: #2563EB; text-decoration: none; }
            .link:hover { text-decoration: underline; }
          </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 200);">
          <div class="title">🩺 PRAKVEDAA CRM</div>
          <div class="tagline">“Healing through seamless conversations — Prakvedaa”</div>
          <div class="card">
            <div class="row"><div class="label">Consultation ID</div><div>#${c.id}</div></div>
            <div class="row"><div class="label">Patient</div><div>${p?.name ?? "—"}</div></div>
            <div class="row"><div class="label">Scheduled</div><div>${when}</div></div>
            <div class="row"><div class="label">Doctor</div><div>${user?.email ?? "—"}</div></div>
            <div class="row"><div class="label">Video Link</div><div><a class="link" href="${c.video_url}">${c.video_url}</a></div></div>
            <div class="row"><div class="label">Phone</div><div>${phone}</div></div>
            <div class="row"><div class="label">Status</div>
              <div><span class="badge ${c.status === "completed" ? "badge-completed" : "badge-pending"}">${c.status || "pending"}</span></div>
            </div>
            <div class="row"><div class="label">Doctor Notes</div><div><pre style="white-space: pre-wrap; font-family: inherit; margin:0;">${notes}</pre></div></div>
          </div>
          <div class="footer">Printed on ${new Date().toLocaleString()}</div>
        </body>
      </html>
    `);
    doc.document.close();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Brand header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-700">
          <span className="text-3xl">🩺</span> PRAKVEDAA CRM
        </div>
        <p className="text-gray-500 text-sm mt-1 italic">
          “Healing through seamless conversations — Prakvedaa”
        </p>
      </div>

      {/* Right aligned bordered panel */}
      <div
        className="w-[75%] ml-auto mr-12 rounded-2xl bg-white p-8 mt-6 space-y-6"
        style={{
          border: "4px solid #3B82F6",
          boxShadow: "0 20px 45px rgba(0,0,0,0.12)",
          transform: "translateX(24px)",
        }}
      >
        {/* Header with logout */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-700">Doctor Dashboard</h2>
          <button
            onClick={logout}
            className="text-sm px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        {/* Consultations (assigned to this doctor) */}
        <div className="border p-4 rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-3">📋 My Consultations</h3>
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-2">ID</th>
                <th className="p-2">Patient</th>
                <th className="p-2">Scheduled</th>
                <th className="p-2">Status</th>
                <th className="p-2">Join</th>
                <th className="p-2">WhatsApp</th>
                <th className="p-2">Print</th>
                <th className="p-2">Update</th>
              </tr>
            </thead>
            <tbody>
              {consultations.map((c) => {
                const p = patientById[c.patient_id];
                const when = c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "—";
                const phone =
                  p?.contact?.replace(/\s+/g, "")?.replace(/^\+/, "") || "";
                const waLink = phone
                  ? `https://wa.me/${phone}?text=${encodeURIComponent(
                      `Hello ${p?.name || ""}, your video consultation link: ${c.video_url}${
                        c.scheduled_at ? ` at ${when}` : ""
                      }`
                    )}`
                  : undefined;

                const isOpen = openPanelId === c.id;

                return (
                  <React.Fragment key={c.id}>
                    <tr className="border-t align-top">
                      <td className="p-2">{c.id}</td>
                      <td className="p-2">
                        <div className="font-medium">{p?.name || "—"}</div>
                        <div className="text-xs text-gray-500">{p?.contact || "—"}</div>
                      </td>
                      <td className="p-2">{when}</td>
                      <td className="p-2">{renderStatusBadge(c.status)}</td>
                      <td className="p-2">
                        <a
                          href={c.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Join
                        </a>
                      </td>
                      <td className="p-2">
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-600 hover:underline"
                          >
                            WhatsApp
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">No phone</span>
                        )}
                      </td>
                      <td className="p-2">
                        <button
                          className="text-sm px-3 py-1 rounded bg-gray-800 text-white hover:bg-black"
                          onClick={() => printSummary(c)}
                        >
                          🖨 Print
                        </button>
                      </td>
                      <td className="p-2">
                        <button
                          className="text-sm px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                          onClick={() => openUpdatePanel(c)}
                        >
                          {isOpen ? "Close" : "Update"}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable update panel */}
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="bg-white">
                          <div className="p-4 border rounded mt-2">
                            <div className="font-semibold mb-2">📝 Doctor Notes</div>
                            <textarea
                              className="w-full border rounded p-2 h-28"
                              placeholder="Write your notes / prescription..."
                              value={notesInput}
                              onChange={(e) => setNotesInput(e.target.value)}
                            />
                            <div className="mt-3 flex gap-2">
                              <button
                                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => patchConsultation(c, false)}
                              >
                                Save Notes
                              </button>
                              <button
                                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                                onClick={() => patchConsultation(c, true)}
                              >
                                Save & Mark Completed
                              </button>
                              <button
                                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                                onClick={() => setOpenPanelId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {consultations.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={8}>
                    No consultations assigned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-400">Auto-refresh is enabled (every 10 seconds).</div>
      </div>

      {/* ✅ Toast (top-right) */}
      {toast.show && (
        <div className="fixed top-6 right-6 bg-green-600 text-white px-4 py-3 rounded shadow-lg transition-opacity">
          {toast.text}
        </div>
      )}
    </div>
  );
}
