export type UserRole = 'admin' | 'employee';
export type AttendanceStatus = 'checked_in' | 'checked_out';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  department_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  emp_id: string;
  
  // Personal Information
  full_name: string;
  father_guardian_name: string | null;
  father_guardian_occupation: string | null;
  father_guardian_relation: string | null;
  email: string | null;
  social_address: string | null;
  emp_cnic: string | null;
  emp_cell_no: string | null;
  father_guardian_cnic: string | null;
  father_guardian_cell_no: string | null;
  dob: string | null;
  gender: string | null;
  marital_status: string | null;
  emp_status: string | null;
  qualification: string | null;
  id_status: string | null;
  emergency_contact: string | null;
  age: number | null;
  guardian: string | null;
  address: string | null;
  
  // Work Information
  join_date: string | null;
  job_status: string | null;
  department_id: string | null;
  job_title: string | null;
  monthly_salary: number | null;
  daily_salary: number | null;
  weekly_salary: number | null;
  total_salary: number | null;
  working_hours: string | null;
  start_time: string | null;
  end_time: string | null;
  work_time: string | null;
  
  // Image
  image_url: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Department {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  status: AttendanceStatus;
  timestamp: string;
  location_lat: number | null;
  location_long: number | null;
  shift_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}