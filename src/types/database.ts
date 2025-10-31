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