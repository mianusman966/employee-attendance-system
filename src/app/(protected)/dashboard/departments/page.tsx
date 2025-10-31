'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '../../../../components/common/DataTable';
import { supabase } from '../../../../lib/supabase';
import { Department } from '../../../../types/database';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    try {
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*');

      if (departmentsError) throw departmentsError;

      // Get employee count for each department
      const departmentsWithCounts = await Promise.all(
        (departmentsData || []).map(async (dept) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id);

          return {
            ...dept,
            employeeCount: count || 0,
          };
        })
      );

      setDepartments(departmentsWithCounts);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
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
        <button
          onClick={() => console.log('Edit department:', row.original)}
          className="text-blue-600 hover:text-blue-900"
        >
          Edit
        </button>
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
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Add Department
        </button>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <DataTable columns={columns} data={departments} searchColumn="name" />
      </div>
    </div>
  );
}