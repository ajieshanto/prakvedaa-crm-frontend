// src/pages/Sales.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../auth";
import { toast } from "react-toastify";

type Patient = {
  id: number;
  name: string;
  age?: number;
  contact?: string | null;
  notes?: string | null;
  assigned_doctor_email?: string | null;
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

  // master data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  // forms
  const [form, setForm] = useState({ name: "", age: "", contact: "", notes: "" });
  const [assign, setAssign] = useState({ patient_id: "", doctor_email: "" });
  const [schedule, setSchedule] = useState({ patient_id: "", scheduled_at: "" });

  async function loadData() {
    try {
      const [usersRes, patientsRes, consRes] = await Promise.all([
        api.get("/users?role=doctor"),
        api.get("/patients/list"),
        api.get("/consultations/list"),
      ]);
      setDoctors(usersRes.data);
      setPatients(patientsRes.data);
      setConsultations(consRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data. Check your login/token and backend.");
    }
  }

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  async function createPatient() {
    try {
      await api.post("/patients/create", form);
      toast.success("Patient created!");
      setForm({ name: "", age: "", contact: "", notes: "" });
      loadData();
    } catch {
      toast.error("Failed to create patient");
    }
  }

  async function assignDoctor() {
    if (!assign.patient_id || !assign.doctor_email) return toast.error("Select both fields");
    try {
      await api.post("/patients/assign", assign);
      toast.success("Doctor assigned!");
      setAssign({ patient_id: "", doctor_email: "" });
      loadData();
    } catch {
      toast.error("Failed to assign doctor");
    }
  }

  async function scheduleConsultation() {
    if (!schedule.patient_id || !schedule.scheduled_at)
      return toast.error("Select patient and date/time");

    try {
      await api.post("/consultations/schedule", schedule);
      toast.success("Appointment scheduled!");
      setSchedule({ patient_id: "", scheduled_at: "" });
      loadData();
    } catch {
      toast.error("Failed to schedule");
    }
  }

  // ---- derive the LATEST consultation per patient (by scheduled_at then id) ----
  const latestByPatient: Record<number, Consultation> = useMemo(() => {
    const map: Record<number, Consultation> = {};
    for (const c of consultations) {
      const prev = map[c.patient_id];
      if (!prev) {
        map[c.patient_id] = c;
      } else {
        // prefer later scheduled_at; fall back to larger id
        const t1 = c.scheduled_at ? Date.parse(c.scheduled_at) : -1;
        const t2 = prev.scheduled_at ? Date.parse(prev.scheduled_at) : -1;
        if (t1 > t2 || (t1 === t2 && c.id > prev.id)) map[c.patient_id] = c;
      }
    }
    return map;
  }, [consultations]);

  // ---- actions that need consultation id present ----
  async function sendWhatsApp(patientId: number) {
    const cons = latestByPatient[patientId];
    if (!cons) return toast.error("No consultation yet for this patient.");
    try {
      const { data } = await api.post("/consultations/whatsapp-link", {
        consultation_id: cons.id,
      });
      window.open(data.wa_link, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to create WhatsApp link");
    }
  }

  function printConsultation(patient: Patient) {
    const cons = latestByPatient[patient.id];
    if (!cons) return toast.error("No consultation to print.");
    const status = cons.status ?? "pending";
    const notes = cons.doctor_notes?.trim();
    if (status !== "completed" || !notes) {
      return toast.info("Only completed consultations with notes can be printed.");
    }

    const when = cons.scheduled_at ? new Date(cons.scheduled_at).toLocaleString() : "Now";
    const today = new Date().toLocaleDateString();

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Prescription — ${patient.name}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { --blue:#2563eb; --ink:#0f172a; --muted:#64748b; --border:#e2e8f0; }
    body { margin:0; background:#f8fafc; font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:var(--ink); }
    .sheet { max-width: 760px; margin: 40px auto; background:white; padding: 32px 36px; border-radius: 16px; border: 2px solid var(--blue); box-shadow: 0 20px 50px rgba(37,99,235,.15); }
    .hdr { display:flex; align-items:center; gap:16px; border-bottom:1px dashed var(--border); padding-bottom:14px; margin-bottom:18px; }
    .logo { width:56px; height:56px; border-radius:12px; background:linear-gradient(135deg,#1d4ed8 0%,#60a5fa 100%); display:grid; place-items:center; color:white; font-weight:800; font-size:20px; }
    .title { font-size:20px; font-weight:800; letter-spacing:.4px; }
    .tag { font-size:12px; color:var(--muted); margin-top:2px; }
    .row { display:flex; gap:16px; flex-wrap:wrap; }
    .box { flex:1 1 240px; border:1px solid var(--border); border-radius:12px; padding:12px 14px; }
    .label { font-size:12px; color:var(--muted); }
    .val { font-weight:700; margin-top:2px; }
    .section { margin-top:18px; }
    .notes { white-space: pre-wrap; line-height:1.6; border:1px dashed var(--border); padding:16px; border-radius:12px; background:#f8fafc; }
    .footer { margin-top:28px; display:flex; justify-content:space-between; font-size:12px; color:var(--muted); }
    @media print { body { background:white; } .sheet { margin:0; max-width:100%; box-shadow:none; border-width:1px; } }
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
        <div class="val">${patient.name}</div>
      </div>
      <div class="box">
        <div class="label">Scheduled</div>
        <div class="val">${when}</div>
      </div>
      <div class="box">
        <div class="label">Doctor</div>
        <div class="val">${patient.assigned_doctor_email ?? "—"}</div>
      </div>
    </div>

    <div class="section">
      <div class="label" style="margin-bottom:8px;">Doctor Notes / Prescription</div>
      <div class="notes">${(notes || "").replace(/</g, "&lt;")}</div>
    </div>

    <div class="footer">
      <div>Generated: ${today}</div>
      <div>Video: ${cons.video_url}</div>
    </div>
  </div>
  <script>window.print()</script>
</body>
</html>
    `.trim();

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return toast.error("Popup blocked — allow popups to print.");
    w.document.open();
    w.document.write(html);
    w.document.close();
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
      {/* 🔐 Logout Bar */}
      <div className="flex justify-end mb-4">
        <span className="text-sm text-gray-600 mr-3">{user?.email}</span>
        <button onClick={logout} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded">
          Logout
        </button>
      </div>

      <h2 className="text-xl font-bold mb-4">Sales Dashboard</h2>

      {/* ➕ Create Patient */}
      <div className="border border-gray-300 bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="font-semibold mb-3">➕ Create Patient</h3>
        <div className="grid grid-cols-4 gap-3">
          <input className="border p-2 rounded" placeholder="Name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="border p-2 rounded" placeholder="Age"
            value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          <input className="border p-2 rounded" placeholder="Contact (WhatsApp)"
            value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <input className="border p-2 rounded" placeholder="Notes"
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button onClick={createPatient} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Save Patient
        </button>
      </div>

      {/* 👨‍⚕️ Assign Doctor */}
      <div className="border border-gray-300 bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="font-semibold mb-3">👨‍⚕️ Assign Doctor</h3>
        <div className="grid grid-cols-3 gap-3">
          <select className="border p-2 rounded"
            value={assign.patient_id}
            onChange={(e) => setAssign({ ...assign, patient_id: e.target.value })}>
            <option value="">Select Patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select className="border p-2 rounded"
            value={assign.doctor_email}
            onChange={(e) => setAssign({ ...assign, doctor_email: e.target.value })}>
            <option value="">Select Doctor</option>
            {doctors.map((d) => (
              <option key={d.email} value={d.email}>{d.email}</option>
            ))}
          </select>

          <button onClick={assignDoctor} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Assign
          </button>
        </div>
      </div>

      {/* 📅 Schedule Appointment */}
      <div className="border border-gray-300 bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="font-semibold mb-3">📅 Schedule Appointment</h3>
        <div className="grid grid-cols-3 gap-3">
          <select className="border p-2 rounded"
            value={schedule.patient_id}
            onChange={(e) => setSchedule({ ...schedule, patient_id: e.target.value })}>
            <option value="">Select Patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input type="datetime-local" className="border p-2 rounded"
            value={schedule.scheduled_at}
            onChange={(e) => setSchedule({ ...schedule, scheduled_at: e.target.value })} />

          <button onClick={scheduleConsultation} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Schedule
          </button>
        </div>
      </div>

      {/* 📌 Patient List (with LIVE Status/Notes + Print) */}
      <h3 className="font-semibold mb-3">📌 Patient List</h3>
      <table className="w-full border mt-2 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">ID</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Doctor</th>
            <th className="border p-2">Scheduled</th>
            <th className="border p-2">Join</th>
            <th className="border p-2">WhatsApp</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Notes</th>
            <th className="border p-2">Print</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => {
            const cons = latestByPatient[p.id];
            const status = cons?.status ?? "pending";
            const canPrint = cons && status === "completed" && !!cons.doctor_notes?.trim();
            const scheduledStr = cons?.scheduled_at ? new Date(cons.scheduled_at).toLocaleString() : "—";
            return (
              <tr key={p.id}>
                <td className="border p-2">{p.id}</td>
                <td className="border p-2">{p.name}</td>
                <td className="border p-2">{p.assigned_doctor_email || "Not Assigned"}</td>
                <td className="border p-2">{scheduledStr}</td>
                <td className="border p-2">
                  {cons?.video_url ? (
                    <a href={cons.video_url} target="_blank" className="text-blue-600 underline" rel="noreferrer">
                      Join
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="border p-2">
                  <button
                    disabled={!cons}
                    onClick={() => sendWhatsApp(p.id)}
                    className={`px-3 py-1 rounded ${cons ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
                  >
                    Send
                  </button>
                </td>
                <td className="border p-2">
                  <span
                    className={
                      "text-xs px-2 py-1 rounded " +
                      (status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-200 text-yellow-800")
                    }
                  >
                    {status === "completed" ? "Completed" : "Pending"}
                  </span>
                </td>
                <td className="border p-2">
                  {cons?.doctor_notes?.trim() ? (
                    <span className="text-gray-700 whitespace-pre-wrap">
                      {cons.doctor_notes}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="border p-2">
                  <button
                    onClick={() => printConsultation(p)}
                    disabled={!canPrint}
                    className={`px-3 py-1 rounded border ${canPrint ? "hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                    title={
                      canPrint ? "Print prescription" : "Complete status + notes required to print"
                    }
                  >
                    Print
                  </button>
                </td>
              </tr>
            );
          })}
          {patients.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center p-6 text-gray-500">
                No patients yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
