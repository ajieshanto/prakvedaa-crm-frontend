// src/pages/Doctor.tsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../auth";

type Consultation = {
  id: number;
  patient_id: number;
  scheduled_at: string | null;
  video_url: string;
  created_by: string;
  status?: "pending" | "completed";
  doctor_notes?: string | null;
};

type PatientMap = Record<
  number,
  { name: string; contact?: string | null; assigned_doctor_email?: string | null }
>;

export default function Doctor() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<PatientMap>({});
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});
  const [statusDraft, setStatusDraft] = useState<Record<number, "pending" | "completed">>({});
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  async function loadAll() {
    try {
      setLoading(true);
      // doctor sees only assigned consultations
      const [consRes, patsRes] = await Promise.all([
        api.get<Consultation[]>("/consultations/list"),
        api.get("/patients/list"),
      ]);

      const patientMap: PatientMap = {};
      (patsRes.data as any[]).forEach((p) => {
        patientMap[p.id] = {
          name: p.name,
          contact: p.contact,
          assigned_doctor_email: p.assigned_doctor_email,
        };
      });

      setPatients(patientMap);
      setRows(consRes.data);

      // seed drafts from server values
      const nd: Record<number, string> = {};
      const sd: Record<number, "pending" | "completed"> = {};
      consRes.data.forEach((c) => {
        nd[c.id] = c.doctor_notes ?? "";
        sd[c.id] = (c.status ?? "pending") as "pending" | "completed";
      });
      setNoteDraft(nd);
      setStatusDraft(sd);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function updateConsultation(c: Consultation) {
    const body: any = {};
    if (noteDraft[c.id] !== undefined) body.notes = noteDraft[c.id];
    if (statusDraft[c.id] !== undefined) body.status = statusDraft[c.id];

    await api.patch(`/consultations/update`, body, {
      params: { consultation_id: c.id },
    });

    showToast("Saved ✅");
    await loadAll();
  }

  async function openWhatsApp(c: Consultation) {
    // Ask backend to build the wa.me link (handles phone source)
    const { data } = await api.post("/consultations/whatsapp-link", {
      consultation_id: c.id,
    });
    const url = (data as any).wa_link as string;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function printConsultation(c: Consultation) {
    const p = patients[c.patient_id];
    const when = c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "Now";
    const today = new Date().toLocaleDateString();

    // Only allow print when completed and notes exist
    if ((c.status ?? "pending") !== "completed" || !(c.doctor_notes && c.doctor_notes.trim())) {
      showToast("Complete the consultation and add notes to print.");
      return;
    }

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Prescription — ${p?.name ?? "Patient"}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --blue:#2563eb;
      --ink:#0f172a;
      --muted:#64748b;
      --border:#e2e8f0;
    }
    body { margin:0; background:#f8fafc; font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:var(--ink); }
    .sheet {
      max-width: 760px; margin: 40px auto; background:white; padding: 32px 36px;
      border-radius: 16px; border: 2px solid var(--blue);
      box-shadow: 0 20px 50px rgba(37,99,235,.15);
    }
    .hdr { display:flex; align-items:center; gap:16px; border-bottom:1px dashed var(--border); padding-bottom:14px; margin-bottom:18px; }
    .logo { width:56px; height:56px; border-radius:12px; background:linear-gradient(135deg,#1d4ed8 0%,#60a5fa 100%); display:grid; place-items:center; color:white; font-weight:800; font-size:20px; }
    .title { font-size:20px; font-weight:800; letter-spacing:.4px; }
    .tag { font-size:12px; color:var(--muted); margin-top:2px; }
    .row { display:flex; gap:16px; flex-wrap:wrap; }
    .box { flex:1 1 240px; border:1px solid var(--border); border-radius:12px; padding:12px 14px; }
    .label { font-size:12px; color:var(--muted); }
    .val { font-weight:700; margin-top:2px; }
    .section { margin-top:18px; }
    .notes {
      white-space: pre-wrap; line-height:1.6; border:1px dashed var(--border);
      padding:16px; border-radius:12px; background:#f8fafc;
    }
    .footer { margin-top:28px; display:flex; justify-content:space-between; font-size:12px; color:var(--muted); }
    @media print {
      body { background:white; }
      .sheet { margin:0; max-width:100%; box-shadow:none; border-width:1px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hdr">
      <div class="logo">PV</div>
      <div>
        <div class="title">Prakvedaa Tele-Consultation</div>
        <div class="tag">Empowering Digital Healthcare</div>
      </div>
    </div>

    <div class="row">
      <div class="box">
        <div class="label">Patient</div>
        <div class="val">${p?.name ?? "—"}</div>
      </div>
      <div class="box">
        <div class="label">Scheduled</div>
        <div class="val">${when}</div>
      </div>
      <div class="box">
        <div class="label">Doctor</div>
        <div class="val">${user?.email ?? "—"}</div>
      </div>
    </div>

    <div class="section">
      <div class="label" style="margin-bottom:8px;">Doctor Notes / Prescription</div>
      <div class="notes">${(c.doctor_notes || "").replace(/</g, "&lt;")}</div>
    </div>

    <div class="footer">
      <div>Generated: ${today}</div>
      <div>Video: ${c.video_url}</div>
    </div>
  </div>
  <script>window.print()</script>
</body>
</html>
    `.trim();

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      showToast("Popup blocked — allow popups to print.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  const enriched = useMemo(() => {
    return rows.map((c) => ({
      ...c,
      patientName: patients[c.patient_id]?.name ?? `#${c.patient_id}`,
    }));
  }, [rows, patients]);

  if (loading) {
    return (
      <div className="text-center text-gray-500 p-8">Loading consultations…</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* tiny toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-black/80 text-white text-sm px-3 py-2 rounded">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Doctor Dashboard</h2>
          <p className="text-sm text-gray-500">
            Assigned consultations for <span className="font-semibold">{user?.email}</span>
          </p>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-blue-500/20">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-3 pr-4">ID</th>
                <th className="py-3 pr-4">Patient</th>
                <th className="py-3 pr-4">Scheduled</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((c) => {
                const status = (c.status ?? "pending") as "pending" | "completed";
                const scheduledStr = c.scheduled_at
                  ? new Date(c.scheduled_at).toLocaleString()
                  : "—";
                return (
                  <tr key={c.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">{c.id}</td>
                    <td className="py-3 pr-4 font-medium">{c.patientName}</td>
                    <td className="py-3 pr-4">{scheduledStr}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs " +
                          (status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700")
                        }
                      >
                        {status === "completed" ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => window.open(c.video_url, "_blank", "noopener,noreferrer")}
                          className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Join
                        </button>
                        <button
                          onClick={() => openWhatsApp(c)}
                          className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          WhatsApp
                        </button>
                        <button
                          onClick={() => printConsultation(c)}
                          className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
                          disabled={status !== "completed" || !(c.doctor_notes && c.doctor_notes.trim())}
                          title={
                            status !== "completed"
                              ? "Complete consultation to print"
                              : !(c.doctor_notes && c.doctor_notes.trim())
                              ? "Add notes to print"
                              : "Print prescription"
                          }
                        >
                          Print
                        </button>
                      </div>

                      {/* Editor row */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <textarea
                          className="col-span-2 w-full rounded border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={3}
                          placeholder="Doctor notes / prescription…"
                          value={noteDraft[c.id] ?? ""}
                          onChange={(e) =>
                            setNoteDraft((s) => ({ ...s, [c.id]: e.target.value }))
                          }
                        />
                        <div className="flex flex-col gap-2">
                          <select
                            className="rounded border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={statusDraft[c.id] ?? (c.status ?? "pending")}
                            onChange={(e) =>
                              setStatusDraft((s) => ({
                                ...s,
                                [c.id]: e.target.value as "pending" | "completed",
                              }))
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button
                            onClick={() => updateConsultation(c)}
                            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      {/* Read-only show when completed */}
                      {status === "completed" && c.doctor_notes && c.doctor_notes.trim() && (
                        <div className="mt-3 text-gray-700 text-sm">
                          <span className="font-semibold">Saved Notes:</span>{" "}
                          <span className="whitespace-pre-wrap">{c.doctor_notes}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {enriched.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No consultations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
