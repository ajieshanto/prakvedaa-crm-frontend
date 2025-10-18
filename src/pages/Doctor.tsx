// src/pages/Doctor.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../auth";

type Status = "pending" | "completed";

type Consultation = {
  id: number;
  patient_id: number;
  scheduled_at: string | null;
  video_url: string;
  created_by: string;
  status?: Status;
  doctor_notes?: string | null;
};

type Patient = {
  id: number;
  name: string;
  contact?: string | null;
  assigned_doctor_email?: string | null;
};

type PatientMap = Record<number, { name: string; contact?: string | null; assigned_doctor_email?: string | null }>;

export default function Doctor() {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<PatientMap>({});

  // editor state
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});
  const [statusDraft, setStatusDraft] = useState<Record<number, Status>>({});

  // tiny toast (no external deps)
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }

  async function loadAll() {
    try {
      setLoading(true);

      // doctor sees only assigned consultations (backend already filters)
      const [consRes, patsRes] = await Promise.all([
        api.get<Consultation[]>("/consultations/list"),
        api.get<Patient[]>("/patients/list"),
      ]);

      const pmap: PatientMap = {};
      (patsRes.data as Patient[]).forEach((p) => {
        pmap[p.id] = {
          name: p.name,
          contact: p.contact,
          assigned_doctor_email: p.assigned_doctor_email,
        };
      });

      setPatients(pmap);
      setRows(consRes.data);

      // seed editor drafts from server values
      const nd: Record<number, string> = {};
      const sd: Record<number, Status> = {};
      consRes.data.forEach((c) => {
        nd[c.id] = c.doctor_notes ?? "";
        sd[c.id] = (c.status ?? "pending") as Status;
      });
      setNoteDraft(nd);
      setStatusDraft(sd);
    } catch {
      showToast("Failed to load consultations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function updateConsultation(c: Consultation) {
    try {
      const body: any = {};
      if (noteDraft[c.id] !== undefined) body.notes = noteDraft[c.id];
      if (statusDraft[c.id] !== undefined) body.status = statusDraft[c.id];

      await api.patch(`/consultations/update`, body, {
        params: { consultation_id: c.id },
      });

      showToast("Saved ✅");
      await loadAll();
    } catch {
      showToast("Save failed");
    }
  }

  async function openWhatsApp(c: Consultation) {
    try {
      const { data } = await api.post("/consultations/whatsapp-link", {
        consultation_id: c.id,
      });
      const url = (data as any).wa_link as string;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      showToast("WhatsApp link error");
    }
  }

  function printConsultation(c: Consultation) {
    const status = (c.status ?? "pending") as Status;
    const notes = (c.doctor_notes || "").trim();

    if (status !== "completed" || !notes) {
      showToast("Complete the consultation & add notes to print");
      return;
    }

    const p = patients[c.patient_id];
    const when = c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "Now";
    const today = new Date().toLocaleDateString();

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Prescription — ${p?.name ?? "Patient"}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { --blue:#2563eb; --ink:#0f172a; --muted:#64748b; --border:#e2e8f0; }
    body { margin:0; background:#f8fafc; font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:var(--ink); }
    .sheet { max-width:760px; margin:40px auto; background:white; padding:32px 36px; border-radius:16px; border:2px solid var(--blue); box-shadow:0 20px 50px rgba(37,99,235,.15); }
    .hdr { display:flex; align-items:center; gap:16px; border-bottom:1px dashed var(--border); padding-bottom:14px; margin-bottom:18px; }
    .logo { width:56px; height:56px; border-radius:12px; background:linear-gradient(135deg,#1d4ed8 0%,#60a5fa 100%); display:grid; place-items:center; color:#fff; font-weight:800; font-size:20px; }
    .title { font-size:20px; font-weight:800; letter-spacing:.4px; }
    .tag { font-size:12px; color:var(--muted); margin-top:2px; }
    .row { display:flex; gap:16px; flex-wrap:wrap; }
    .box { flex:1 1 240px; border:1px solid var(--border); border-radius:12px; padding:12px 14px; }
    .label { font-size:12px; color:var(--muted); }
    .val { font-weight:700; margin-top:2px; }
    .section { margin-top:18px; }
    .notes { white-space: pre-wrap; line-height:1.6; border:1px dashed var(--border); padding:16px; border-radius:12px; background:#f8fafc; }
    .footer { margin-top:28px; display:flex; justify-content:space-between; font-size:12px; color:var(--muted); gap:12px; flex-wrap:wrap; }
    @media print { body { background:#fff; } .sheet { margin:0; max-width:100%; box-shadow:none; border-width:1px; } }
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
      <div class="notes">${notes.replace(/</g, "&lt;")}</div>
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
      showToast("Popup blocked — allow popups to print");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  const enriched = useMemo(
    () =>
      rows.map((c) => ({
        ...c,
        patientName: patients[c.patient_id]?.name ?? `#${c.patient_id}`,
      })),
    [rows, patients]
  );

  if (loading) {
    return <div className="text-center text-gray-500 p-8">Loading consultations…</div>;
  }

  return (
    <div
      className="max-w-[78%] ml-auto mr-12 rounded-2xl bg-white p-8 mt-6"
      style={{
        border: "4px solid #3B82F6", // blue-500
        boxShadow: "0 20px 45px rgba(0,0,0,0.12)",
        transform: "translateX(32px)",
      }}
    >
      {/* 🔔 Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-black/80 text-white text-sm px-3 py-2 rounded">
          {toast}
        </div>
      )}

      {/* Header + Logout */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Doctor Dashboard</h2>
          <p className="text-sm text-gray-500">
            Assigned consultations for <span className="font-semibold">{user?.email}</span>
          </p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Consultations Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700 bg-gray-100 border">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Patient</th>
              <th className="p-2 border">Scheduled</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((c) => {
              const status = (c.status ?? "pending") as Status;
              const when = c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "—";

              return (
                <tr key={c.id} className="border-b">
                  <td className="p-2 border">{c.id}</td>
                  <td className="p-2 border font-medium">{c.patientName}</td>
                  <td className="p-2 border">{when}</td>
                  <td className="p-2 border">
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
                  <td className="p-2 border">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={c.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Join
                      </a>
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

                    {/* Inline editor */}
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
                              [c.id]: e.target.value as Status,
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

                    {/* Read-only preview after completion */}
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
  );
}
