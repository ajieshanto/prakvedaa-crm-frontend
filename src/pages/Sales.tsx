import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../auth";
import { toast } from "react-toastify";

export default function Sales() {
  const { token } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", age: "", contact: "", notes: "" });
  const [assign, setAssign] = useState({ patient_id: "", doctor_email: "" });
  const [schedule, setSchedule] = useState({ patient_id: "", scheduled_at: "" });

  async function loadData() {
    try {
      const usersRes = await api.get("/users?role=doctor");
      const patientsRes = await api.get("/patients/list", {
        headers: { Authorization: token! },
      });
      setDoctors(usersRes.data);
      setPatients(patientsRes.data);
    } catch {
      toast.error("Failed to load data. Check your login/token and backend.");
    }
  }

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  async function createPatient() {
    try {
      await api.post("/patients/create", form, { headers: { Authorization: token! } });
      toast.success("Patient created!");
      loadData();
      setForm({ name: "", age: "", contact: "", notes: "" });
    } catch {
      toast.error("Failed to create patient");
    }
  }

  async function assignDoctor() {
    if (!assign.patient_id || !assign.doctor_email) return toast.error("Select both fields");
    try {
      await api.post("/patients/assign", assign, { headers: { Authorization: token! } });
      toast.success("Doctor assigned!");
      loadData();
    } catch {
      toast.error("Failed to assign doctor");
    }
  }

  async function scheduleConsultation() {
    if (!schedule.patient_id || !schedule.scheduled_at)
      return toast.error("Select patient and date/time");
    try {
      await api.post("/consultations/schedule", schedule, {
        headers: { Authorization: token! },
      });
      toast.success("Appointment scheduled!");
      loadData();
    } catch {
      toast.error("Failed to schedule");
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
            placeholder="Contact"
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

      {/* --- Patients Table --- */}
      <h3 className="font-semibold mb-3">📌 Patient List</h3>
      <table className="w-full border mt-2">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">ID</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Doctor</th>
            <th className="border p-2">Video Call</th>
            <th className="border p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id}>
              <td className="border p-2">{p.id}</td>
              <td className="border p-2">{p.name}</td>
              <td className="border p-2">{p.assigned_doctor_email || "Not Assigned"}</td>
              <td className="border p-2">
                <a
                  href={p.video_url}
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  Join
                </a>
              </td>
              <td className="border p-2">
                <span className="text-xs px-2 py-1 rounded bg-yellow-200 text-yellow-800">
                  Pending
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
