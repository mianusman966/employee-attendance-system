'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '../../../../components/common/DataTable';
import { supabase } from '../../../../lib/supabase';
import { Employee } from '../../../../types/database';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments:department_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Add work_time to each employee if not already present
      const employeesWithWorkTime = (data || []).map(emp => ({
        ...emp,
        work_time: emp.work_time || (emp.start_time && emp.end_time ? `${emp.start_time} - ${emp.end_time}` : 'N/A')
      }));
      
      setEmployees(employeesWithWorkTime);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(employeeId: string, empId: string) {
    if (!confirm(`Are you sure you want to delete employee ${empId}? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(employeeId);
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;

      // Refresh the list
      await fetchEmployees();
      alert('Employee deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee: ' + error.message);
    } finally {
      setDeleteLoading(null);
    }
  }

  function handleEdit(employeeId: string) {
    router.push(`/dashboard/employees/edit/${employeeId}`);
  }

  const columns: ColumnDef<Employee, any>[] = [
    {
      accessorKey: 'emp_id',
      header: 'ID',
    },
    {
      accessorKey: 'full_name',
      header: 'Name',
    },
    {
      accessorKey: 'emp_cell_no',
      header: 'Phone',
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => (row.original as any).departments?.name || 'N/A',
    },
    {
      accessorKey: 'job_title',
      header: 'Job Title',
    },
    {
      accessorKey: 'emp_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.emp_status;
        const isActive = status === 'Active';
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            isActive 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            <span className={`h-2 w-2 rounded-full mr-2 ${
              isActive ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'join_date',
      header: 'Join Date',
      cell: ({ row }) => row.original.join_date ? format(new Date(row.original.join_date), 'MMM dd, yyyy') : 'N/A',
    },
    {
      accessorKey: 'work_time',
      header: 'Work Time',
      cell: ({ row }) => row.original.work_time || 'N/A',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const employee = row.original;
        const isDeleting = deleteLoading === employee.id;
        
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(employee.id)}
              className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors"
              title="Edit Employee"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
            <button
              onClick={() => handleDelete(employee.id, employee.emp_id)}
              disabled={isDeleting}
              className="inline-flex items-center px-3 py-1.5 border border-red-600 text-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete Employee"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
        <button
          type="button"
          onClick={() => router.push('/dashboard/employees/add')}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Add Employee
        </button>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <DataTable columns={columns} data={employees} searchColumns={['emp_id', 'full_name']} />
      </div>
    </div>
  );
}