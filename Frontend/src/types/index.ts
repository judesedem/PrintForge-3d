// PrintForge 3D — Core Types

export type UserRole = 'student' | 'lab_staff' | 'admin';

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type JobStatus =
  | 'submitted'
  | 'approved'
  | 'queued'
  | 'printing'
  | 'completed'
  | 'rejected';

export interface PrintJob {
  job_id: string;
  user_id: string;
  user_name: string;
  file_name: string;
  material: string;
  color: string;
  quantity: number;
  status: JobStatus;
  submitted_at: string;
  estimated_cost?: number;
  estimated_time?: number; // in minutes
  printer_name?: string;
  queue_position?: number;
  notes?: string;
}

export interface Material {
  material_id: string;
  material_name: string;
  colors: string[];
  cost_per_unit: number;
  availability_status: 'available' | 'low' | 'out_of_stock';
  description: string;
}

export interface Printer {
  printer_id: string;
  printer_name: string;
  printer_status: 'idle' | 'printing' | 'maintenance' | 'offline';
  lab_location: string;
  current_job?: string;
}

export interface Notification {
  notification_id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
  job_id?: string;
}

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  JobDetail: { job_id: string };
  SubmitJob: undefined;
  EstimateResult: { estimate: { cost: number; time: number; job_id: string } };
  Notifications: undefined;
  Profile: undefined;
  AdminDashboard: undefined;
  StaffReview: { job_id: string };
  QueueManagement: undefined;
  PrinterManagement: undefined;
};
