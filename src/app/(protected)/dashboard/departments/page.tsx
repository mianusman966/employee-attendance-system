'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '../../../../components/common/DataTable';
import { supabase } from '../../../../lib/supabase';
import { Department } from '../../../../types/database';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const AddDepartmentModal = dynamic(() => import('../../../../components/dashboard/AddDepartmentModal'), { ssr: false });

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<(Department & { employeeCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editName, setEditName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    try {
      // ✅ OPTIMIZATION: Use PostgreSQL aggregation instead of N+1 queries
      // Old approach: 1 query for departments + N queries for employee counts = N+1 queries
      // New approach: 1 single query with JOIN and GROUP BY = 1 query only!
      
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select(`
          *,
          employees:employees(count)
        `);

      if (departmentsError) throw departmentsError;

      // Transform the data to match expected format
      const departmentsWithCounts = (departmentsData || []).map(dept => ({
        ...dept,
        employeeCount: dept.employees?.[0]?.count || 0
      }));

      setDepartments(departmentsWithCounts);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(department: Department) {
    setEditingDepartment(department);
    setEditName(department.name);
    setShowEditModal(true);
  }

  async function handleUpdateDepartment() {
    if (!editingDepartment || !editName.trim()) return;

    try {
      const { error } = await supabase
        .from('departments')
        .update({ name: editName.trim() })
        .eq('id', editingDepartment.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingDepartment(null);
      setEditName('');
      fetchDepartments();
    } catch (error: any) {
      alert('Error updating department: ' + error.message);
    }
  }

  async function handleDelete(department: Department) {
    if (!confirm(`Are you sure you want to delete the department "${department.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', department.id);

      if (error) throw error;

      fetchDepartments();
    } catch (error: any) {
      alert('Error deleting department: ' + error.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns: ColumnDef<Department & { employeeCount: number }, any>[] = [
    {
      accessorKey: 'name',
      header: 'Department Name',
    },
    {
      accessorKey: 'employeeCount',
      header: 'Employees',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM dd, yyyy'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row.original)}
            className="text-blue-600 hover:text-blue-900 p-1"
            title="Edit Department"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            disabled={deleteLoading}
            className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50"
            title="Delete Department"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
        <button
          type="button"
          onClick={() => (document.getElementById('add-department-modal') as HTMLDialogElement)?.showModal()}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Add Department
        </button>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <DataTable columns={columns} data={departments} searchColumn="name" />
      </div>

      <AddDepartmentModal />

      {/* Edit Department Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Department</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Department Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Enter department name"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDepartment(null);
                    setEditName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateDepartment}
                  disabled={!editName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}