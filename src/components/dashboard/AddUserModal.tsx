"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AddUserModal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const full_name = String(form.get("full_name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const role = String(form.get("role") || "employee");
    const password = String(form.get("password") || "");

    try {
      // Get current session to send auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to create users");
      }

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ full_name, email, role, password }),
      });
      
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to create user");
      
      setSuccess(body?.message || "User created successfully!");
      (document.getElementById("add-user-form") as HTMLFormElement)?.reset();
      
      // Refresh the page after 1.5 seconds to show new user
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog id="add-user-modal" className="rounded-lg p-0">
      <div className="max-w-lg w-[92vw] sm:w-[32rem] rounded-lg bg-white p-5 shadow-xl">
        <form method="dialog">
          <button className="absolute right-3 top-3 text-gray-500 hover:text-gray-700">✕</button>
        </form>
        <h3 className="font-semibold text-lg mb-4">Add New User</h3>
        {error && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-3 rounded-md bg-green-50 border border-green-200 text-green-700 px-3 py-2 text-sm">{success}</div>
        )}
  <form id="add-user-form" onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <input name="full_name" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Temporary password</label>
            <input name="password" type="password" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select name="role" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" className="inline-flex items-center rounded-md border px-3 py-2 text-sm" onClick={() => (document.getElementById("add-user-modal") as HTMLDialogElement)?.close()}>Cancel</button>
            <button disabled={loading} className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
