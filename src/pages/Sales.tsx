// src/pages/Sales.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../auth";

type Patient = {
  id: number;
  name: string;
  age?: number | null;
  contact?: string | null;
  notes?: string | null;
  created_by: string;
  assigned_doctor_email?: string | null;
  created_at?: string;
};

type Doctor = {
  id: number;
  name: string;
  email: string;
  role: "doctor" | "sales" | "admin";
};

type Consultation = {
  id: number;
  patient_id: number;
  scheduled_at: string | null;
  video_url: string;
  created_by: string;
  status?: "pending" | "completed";
  doctor_notes?: string | null;
};

export default function Sales() {
  const { token, user, logout } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consults, setConsults] = useState<Consultation[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // forms
  const [form, setForm] = useState({ name: "", age: "", contact: "", notes: "" });
  const [assign, setAssign] = useState({ patient_id: "", doctor_email: "" });
  const [schedule, setSchedule] = useState({ patient_id: "", scheduled_at: "" });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  async function loadData() {
    if (!token) return;
    try {
      const headers = { Authorization: token };
      const [usersRes, patientsRes, consRes] = await Promise.all([
        api.get<Doctor[]>("/users", { params: { role: "doctor" }, headers }),
        api.get<Patient[]>("/patients/list", { headers }),
        api.get<Consultation[]>("/consultations/list", { headers }),
      ]);
      setDoctors(usersRes.data);
      setPatients(patientsRes.data);
      setConsults(consRes.data);
    } catch (e) {
      showToast("Failed to load data. Check login/token & backend.");
    }
  }

  useEffect(() => {
    loadData();
    // re-load when token changes (login/logout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Pick the latest consultation per patient (by id as a simple heuristic)
  const latestByPatient: Record<number, Consultation | undefined> = useMemo(() => {
    const map: Record<number, Consultation> = {};
    for (const c of consults) {
      const prev = map[c.patient_id];
      if (!prev || c.id > prev.id) map[c.patient_id] = c;
    }
    return map;
  }, [consults]);

  async function createPatient() {
    if (!form.name.trim()) return showToast("Enter a patient name");
    try {
      await api.post("/patients/create", form, { headers: { Authorization: token! } });
      showToast("Patient created!");
      setForm({ name: "", age: "", contact: "", notes: "" });
      loadData();
    } catch {
      showToast("Failed to create patient");
    }
  }

  async function assignDoctor() {
    if (!assign.patient_id || !assign.doctor_email) return showToast("Select patient & doctor");
    try {
      await api.post("/patients/assign", assign, { headers: { Authorization: token! } });
      showToast("Doctor assigned!");
      setAssign({ patient_id: "", doctor_email: "" });
      loadData();
    } catch {
      showToast("Failed to assign doctor");
    }
  }

  async function scheduleConsultation() {
    if (!schedule.patient_id || !schedule.scheduled_at)
      return showToast("Pick patient & date/time");
    try {
      await api.post("/consultations/schedule", schedule, {
        headers: { Authorization: token! },
      });
      showToast("Appointment scheduled!");
      setSchedule({ patient_id: "", scheduled_at: "" });
      loadData();
    } catch {
      showToast("Failed to schedule");
    }
  }

  function statusBadge(c?: Consultation) {
    if (!c) return <span className="inline-block text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">—</span>;
    const s = (c.status ?? "pending") as "pending" | "completed";
    return (
      <span
        className={
          "inline-flex items-center gap-1 text-xs px-2 py-1 rounded " +
          (s === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")
        }
      >
        {s === "completed" ? "Completed" : "Pending"}
      </span>
    );
  }

  function printConsultation(p: Patient) {
    const c = latestByPatient[p.id];
    if (!c) {
      showToast("No consultation yet for this patient");
      return;
    }
    const status = (c.status ?? "pending") as "pending" | "completed";
    if (status !== "completed" || !(c.doctor_notes && c.doctor_notes.trim())) {
      showToast("Print available only when completed & notes present.");
      return;
    }
    const when = c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "Now";
    const today = new Date().toLocaleDateString();
    const doctorEmail = p.assigned_doctor_email || "—";

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Prescription — ${p.name}</title>
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
        <div class="val">${p.name}</div>
      </div>
      <div class="box">
        <div class="label">Scheduled</div>
        <div class="val">${when}</div>
      </div>
      <div class="box">
        <div class="label">Doctor</div>
        <div class="val">${doctorEmail}</div>
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

  async function openWhatsApp(p: Patient) {
    const c = latestByPatient[p.id];
    if (!c) {
      showToast("No consultation yet for this patient");
      return;
    }
    try {
      const { data } = await api.post(
        "/consultations/whatsapp-link",
        { consultation_id: c.id },
        { headers: { Authorization: token! } }
      );
      const url = (data as any).wa_link as string;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      showToast("Failed to build WhatsApp link");
    }
  }

  return (
    <div
      className="max-w-[78%] ml-auto mr-12 rounded-2xl bg-white p-8 mt-6"
      style={{
        border: "4px solid #3B82F6",
        boxShadow: "0 20px 45px rgba(0,0,0,0.12)",
        transform: "translateX(32px)",
      }}
    >
      {/* ✅ Tiny toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-black/80 text-white text-sm px-3 py-2 rounded">
          {toast}
        </div>
      )}

      {/* ✅ Logout */}
      <div className="flex justify-end mb-4">
        <span className="text-sm text-gray-600 mr-3">{user?.email}</span>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
        >
          Logout
        </button>
      </div>

      <h2 className="text-xl font-bold mb-4">Sales Dashboard</h2>

      {/* --- Create Patient --- */}
      <div className="border border-gray-300 bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="font-semibold mb-3">➕ Create Patient</h3>
        <div className="grid grid-cols-4 gap-3">
          <input
            className="border p-2 rounded"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            placeholder="Age"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            placeholder="Contact (+91..., etc.)"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <button
          onClick={createPatient}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Patient
        </button>
      </div>

      {/* --- Assign Doctor --- */}
      <div className="border border-gray-300 bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="font-semibold mb-3">👨‍⚕️ Assign Doctor</h3>
        <div className="grid grid-cols-3 gap-3">
          <select
            className="border p-2 rounded"
            value={assign.patient_id}
            onChange={(e) => setAssign({ ...assign, patient_id: e.target.value })}
          >
            <option value="">Select Patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded"
            value={assign.doctor_email}
            onChange={(e) => setAssign({ ...assign, doctor_email: e.target.value })}
          >
            <option value="">Select Doctor</option>
            {doctors.map((d) => (
              <option key={d.email} value={d.email}>
                {d.email}
              </option>
            ))}
          </select>

          <button
            onClick={assignDoctor}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Assign
          </button>
        </div>
      </div>

      {/* --- Schedule Appointment --- */}
      <div className="border border-gray-300 bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="font-semibold mb-3">📅 Schedule Appointment</h3>
        <div className="grid grid-cols-3 gap-3">
          <select
            className="border p-2 rounded"
            value={schedule.patient_id}
            onChange={(e) => setSchedule({ ...schedule, patient_id: e.target.value })}
          >
            <option value="">Select Patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            className="border p-2 rounded"
            value={schedule.scheduled_at}
            onChange={(e) => setSchedule({ ...schedule, scheduled_at: e.target.value })}
          />

          <button
            onClick={scheduleConsultation}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Schedule
          </button>
        </div>
      </div>

      {/* --- Patients Table (Status + Actions from latest consultation) --- */}
      <h3 className="font-semibold mb-3">📌 Patient List</h3>
      <div className="overflow-x-auto">
        <table className="w-full border mt-2 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">ID</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Doctor</th>
              <th className="border p-2">Scheduled</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => {
              const c = latestByPatient[p.id];
              const scheduledStr = c?.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "—";
              return (
                <tr key={p.id}>
                  <td className="border p-2">{p.id}</td>
                  <td className="border p-2 font-medium">{p.name}</td>
                  <td className="border p-2">{p.assigned_doctor_email || "Not Assigned"}</td>
                  <td className="border p-2">{scheduledStr}</td>
                  <td className="border p-2">{statusBadge(c)}</td>
                  <td className="border p-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        onClick={() => c && window.open(c.video_url, "_blank", "noopener,noreferrer")}
                        disabled={!c}
                        title={c ? "Join video" : "No consultation yet"}
                      >
                        Join
                      </button>
                      <button
                        className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        onClick={() => openWhatsApp(p)}
                        disabled={!c}
                        title={c ? "Open WhatsApp" : "No consultation yet"}
                      >
                        WhatsApp
                      </button>
                      <button
                        className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        onClick={() => printConsultation(p)}
                        disabled={!c || (c.status ?? "pending") !== "completed" || !(c.doctor_notes && c.doctor_notes.trim())}
                        title={!c
                          ? "No consultation yet"
                          : (c.status ?? "pending") !== "completed"
                          ? "Complete consultation to print"
                          : !(c.doctor_notes && c.doctor_notes.trim())
                          ? "Doctor notes required to print"
                          : "Print prescription"}
                      >
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {patients.length === 0 && (
              <tr>
                <td colSpan={6} className="border p-6 text-center text-gray-500">
                  No patients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
