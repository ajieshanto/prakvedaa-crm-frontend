import { Outlet } from "react-router-dom";
import { useAuth } from "./auth";

export default function App() {
  const { user, logout } = useAuth(); // ✅ Extract user here

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r shadow-sm p-6 flex flex-col">
        <div className="mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-full mb-3"></div>
          <h1 className="text-lg font-bold text-gray-700">Prakvedaa CRM</h1>
          <p className="text-xs text-gray-400 mt-1">Empowering Digital Healthcare</p>
        </div>
        <nav className="flex flex-col gap-2 mt-4">
          <a className="text-gray-700 hover:bg-indigo-50 px-3 py-2 rounded transition">Dashboard</a>
          <a className="text-gray-700 hover:bg-indigo-50 px-3 py-2 rounded transition">Patients</a>
          <a className="text-gray-700 hover:bg-indigo-50 px-3 py-2 rounded transition">Consultations</a>
        </nav>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* 🔹 Top Header Bar */}
        <header className="flex justify-end items-center bg-white border-b p-4 shadow-sm">
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          )}
        </header>

        {/* Content Wrapper */}
        <main className="p-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
