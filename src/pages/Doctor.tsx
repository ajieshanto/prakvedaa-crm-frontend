// src/pages/Doctor.tsx
import { useEffect, useMemo, useState } from "react";
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

type PatientMap = Record<number, { name: string; contact?: string | null; assigned_doctor_email?: string | null }>;

export default function Doctor() {
  const { user, logout } = useAuth();
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
      const [consRes, patsRes] = await Promise.all([
        api.get<Consultation[]>("/consultations/list"),
        api.get("/patients/list"),
      ]);

      const patientMap: PatientMap = {};
      (patsRes.data as any[]).forEach((p) => {
        patientMap[p.id] = { name: p.name, contact: p.contact, assigned_doctor_email: p.assigned_doctor_email };
      });

      setPatients(patientMap);
      setRows(consRes.data);

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
    await api.patch(`/consultations/update`, body, { params: { consultation_id: c.id } });
    showToast("Saved ✅");
    await loadAll();
  }

  async function openWhatsApp(c: Consultation) {
    const { data } = await api.post("/consultations/whatsapp-link", { consultation_id: c.id });
    window.open(data.wa_link, "_blank");
  }

  function printConsultation(c: Consultation) {
    if (c.status !== "completed" || !c.doctor_notes?.trim()) {
      showToast("Complete consultation & add notes before printing.");
      return;
    }
    window.open(c.video_url, "_blank");
  }

  const enriched = useMemo(() => {
    return rows.map((c) => ({
      ...c,
      patientName: patients[c.patient_id]?.name ?? `#${c.patient_id}`,
    }));
  }, [rows, patients]);

  if (loading) return <div className="text-center text-gray-500 p-8">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* ✅ Toast */}
      {toast && <div className="fixed top-4 right-4 z-50 bg-black text-white px-3 py-2 rounded">{toast}</div>}

      {/* ✅ Header with Logout */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Doctor Dashboard</h2>
          <p className="text-sm text-gray-500">
            Welcome, <span className="font-semibold">{user?.email}</span>
          </p>
        </div>
        <button onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Logout
        </button>
      </div>

      {/* ✅ Table */}
      <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Patient</th>
              <th className="p-2">Video</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2 font-medium">{c.patientName}</td>
                <td className="p-2">
                  <a href={c.video_url} target="_blank" className="text-blue-600 underline">
                    Join
                  </a>
                </td>
                <td className="p-2">
                  <span className={`px-3 py-1 text-xs rounded ${c.status === "completed" ? "bg-green-200" : "bg-yellow-200"}`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-2 flex gap-2 flex-wrap">
                  <button onClick={() => openWhatsApp(c)} className="px-3 py-1 bg-green-500 text-white rounded">
                    WhatsApp
                  </button>
                  <button onClick={() => printConsultation(c)} className="px-3 py-1 border rounded">
                    Print
                  </button>
                  <button onClick={() => updateConsultation(c)} className="px-3 py-1 bg-blue-500 text-white rounded">
                    Save
                  </button>
                </td>
              </tr>
            ))}
            {enriched.length === 0 && <tr><td colSpan={4} className="text-center p-4">No consultations</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
