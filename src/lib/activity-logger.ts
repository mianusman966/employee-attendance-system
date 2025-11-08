/**
 * Activity Logger Utility
 * 
 * Centralized logging for all database operations
 * Tracks: Login/Logout, CRUD operations on employees/departments/attendance
 */

import { supabase } from './supabase';

export type ActivityAction = 
  | 'login' | 'logout'
  | 'create_employee' | 'update_employee' | 'delete_employee'
  | 'create_department' | 'update_department' | 'delete_department'
  | 'create_attendance' | 'update_attendance' | 'delete_attendance'
  | 'create_backup' | 'delete_backup'
  | 'ai_query'
  | 'friday_auto_submit' | 'friday_auto_submit_failed';

export interface ActivityDetails {
  [key: string]: any;
}

/**
 * Log any activity to the activity_logs table
 * Uses the correct log_activity RPC function signature from 14_create_system_tables.sql
 */
export async function logActivity(
  action: ActivityAction,
  resourceType: string,
  description: string,
  details?: {
    resourceId?: string;
    resourceName?: string;
    beforeData?: any;
    afterData?: any;
  }
): Promise<boolean> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // Silent fail - user might be logged out
      return false;
    }

    const { error } = await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_user_email: user.email || 'unknown',
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: details?.resourceId || null,
      p_resource_name: details?.resourceName || null,
      p_description: description,
      p_before_data: details?.beforeData || null,
      p_after_data: details?.afterData || null
    });

    if (error) {
      console.error('Activity logging error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to log activity:', error);
    return false;
  }
}

// Convenience functions for specific operations

export async function logLogin(role: string) {
  return logActivity('login', 'auth', `User logged in with role: ${role}`, {
    afterData: { role, timestamp: new Date().toISOString() }
  });
}

export async function logLogout(role: string) {
  return logActivity('logout', 'auth', `User logged out with role: ${role}`, {
    afterData: { role, timestamp: new Date().toISOString() }
  });
}

export async function logEmployeeCreated(employeeData: any) {
  return logActivity('create_employee', 'employee', `Created employee: ${employeeData.full_name}`, {
    resourceId: employeeData.emp_id,
    resourceName: employeeData.full_name,
    afterData: {
      emp_id: employeeData.emp_id,
      full_name: employeeData.full_name,
      department_id: employeeData.department_id
    }
  });
}

export async function logEmployeeUpdated(empId: string, changes: any) {
  return logActivity('update_employee', 'employee', `Updated employee: ${changes.full_name || empId}`, {
    resourceId: empId,
    resourceName: changes.full_name,
    afterData: {
      emp_id: empId,
      changes: changes
    }
  });
}

export async function logEmployeeDeleted(empId: string, name: string) {
  return logActivity('delete_employee', 'employee', `Deleted employee: ${name}`, {
    resourceId: empId,
    resourceName: name,
    beforeData: {
      emp_id: empId,
      full_name: name
    }
  });
}

export async function logDepartmentCreated(deptData: any) {
  return logActivity('create_department', 'department', `Created department: ${deptData.department_name}`, {
    resourceId: deptData.department_id?.toString(),
    resourceName: deptData.department_name,
    afterData: {
      department_id: deptData.department_id,
      department_name: deptData.department_name
    }
  });
}

export async function logDepartmentUpdated(deptId: string, changes: any) {
  return logActivity('update_department', 'department', `Updated department: ${changes.department_name || deptId}`, {
    resourceId: deptId,
    resourceName: changes.department_name,
    afterData: {
      department_id: deptId,
      changes: changes
    }
  });
}

export async function logDepartmentDeleted(deptId: string, name: string) {
  return logActivity('delete_department', 'department', `Deleted department: ${name}`, {
    resourceId: deptId,
    resourceName: name,
    beforeData: {
      department_id: deptId,
      department_name: name
    }
  });
}

export async function logAttendanceMarked(attendanceData: any) {
  return logActivity('create_attendance', 'attendance', `Marked attendance for ${attendanceData.emp_id}`, {
    resourceId: attendanceData.emp_id,
    resourceName: `Attendance - ${attendanceData.date}`,
    afterData: {
      emp_id: attendanceData.emp_id,
      date: attendanceData.date,
      status: attendanceData.status,
      check_in: attendanceData.check_in_time,
      check_out: attendanceData.check_out_time
    }
  });
}

export async function logAttendanceUpdated(recordId: string, changes: any) {
  return logActivity('update_attendance', 'attendance', `Updated attendance record`, {
    resourceId: recordId,
    afterData: {
      record_id: recordId,
      changes: changes
    }
  });
}

export async function logAttendanceDeleted(recordId: string, empId: string) {
  return logActivity('delete_attendance', 'attendance', `Deleted attendance record`, {
    resourceId: recordId,
    beforeData: {
      record_id: recordId,
      emp_id: empId
    }
  });
}

/**
 * Batch log multiple activities (for bulk operations)
 */
export async function logBulkActivity(
  action: ActivityAction,
  resourceType: string,
  count: number,
  description?: string
) {
  return logActivity(action, resourceType, description || `Bulk ${action} operation (${count} items)`, {
    afterData: {
      bulk_operation: true,
      count: count
    }
  });
}
