'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AddDepartmentModal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') || '').trim();

    if (!name) {
      setError('Department name is required');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('departments')
        .insert({ name });

      if (insertError) throw insertError;

      setSuccess('Department added successfully!');
      (document.getElementById('add-department-form') as HTMLFormElement)?.reset();
      
      // Refresh page after 1 second
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to add department');
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog id="add-department-modal" className="rounded-lg p-0">
      <div className="w-96 rounded-lg bg-white p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Add New Department</h3>
          <button
            onClick={() => (document.getElementById('add-department-modal') as HTMLDialogElement)?.close()}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-3 rounded-md bg-green-50 border border-green-200 text-green-700 px-3 py-2 text-sm">
            {success}
          </div>
        )}

        <form id="add-department-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter department name"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => (document.getElementById('add-department-modal') as HTMLDialogElement)?.close()}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
