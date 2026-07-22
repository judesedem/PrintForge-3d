// constants/boardData.ts
// All static data and types for the Lab Queue Kanban board.

export type JobStatus = 'SUBMITTED' | 'APPROVED' | 'PRINTING' | 'READY' | 'COLLECTED';
export type Material = 'PLA' | 'RESIN' | 'ABS' | 'PETG' | 'CARBON_FIBER';
export type PrinterStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'MAINTENANCE';

export interface BoardJob {
  id: string;
  user: string;
  email: string;
  file: string;
  material: Material;
  quality: string;
  infill: number;
  color: string;
  qty: number;
  status: JobStatus;
  submitted: string;
  cost: number;
  notes: string;
  assignedPrinter?: string;
  pickupLocation?: string;
}

export interface BoardPrinter {
  id: string;
  name: string;
  location: string;
  status: PrinterStatus;
  currentJob?: string;
}

export interface BoardColumn {
  status: JobStatus;
  label: string;
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { status: 'SUBMITTED',  label: 'Submitted' },
  { status: 'APPROVED',   label: 'Approved' },
  { status: 'PRINTING',   label: 'Printing' },
  { status: 'READY',      label: 'Ready for Pickup' },
  { status: 'COLLECTED',  label: 'Collected' },
];

export const BOARD_PRINTERS: BoardPrinter[] = [
  { id: 'PRN-001', name: 'Prusa-MK3-04',      location: 'Engineering Lab B',   status: 'BUSY',        currentJob: 'PF-2024-0051' },
  { id: 'PRN-002', name: 'Prusa-MK3-02',      location: 'Chemistry Lab',        status: 'BUSY',        currentJob: 'PF-2024-0050' },
  { id: 'PRN-003', name: 'Bambu-X1-02',       location: 'Design Studio',        status: 'AVAILABLE' },
  { id: 'PRN-004', name: 'Bambu-X1-01',       location: 'Robotics Lab',         status: 'MAINTENANCE' },
  { id: 'PRN-005', name: 'Creality-K2-01',    location: 'Architecture Studio',  status: 'AVAILABLE' },
  { id: 'PRN-006', name: 'Formlabs-Form3-01', location: 'Chemistry Lab',        status: 'OFFLINE' },
];

// printer name → lab location for pickup notification
export const LOCATION_MAP: Record<string, string> = {
  'Prusa-MK3-04':      'Engineering Lab B',
  'Prusa-MK3-02':      'Chemistry Lab',
  'Bambu-X1-02':       'Design Studio',
  'Bambu-X1-01':       'Robotics Lab',
  'Creality-K2-01':    'Architecture Studio',
  'Formlabs-Form3-01': 'Chemistry Lab',
};

export const INITIAL_BOARD_JOBS: BoardJob[] = [
  {
    id: 'PF-2024-0051', user: 'Kofi Mensah',   email: 'k.mensah@ug.edu.gh',
    file: 'turbine_blade_v2.stl',    material: 'RESIN', quality: 'HIGH',
    infill: 40, color: '#DC2626', qty: 3,
    status: 'PRINTING', submitted: '2024-06-25 09:42', cost: 127.80,
    notes: '', assignedPrinter: 'Prusa-MK3-04',
  },
  {
    id: 'PF-2024-0050', user: 'Kwame Asante',  email: 'k.asante@ug.edu.gh',
    file: 'gear_housing_v3.stl',     material: 'PLA',  quality: 'STANDARD',
    infill: 25, color: '#2563EB', qty: 2,
    status: 'PRINTING', submitted: '2024-06-25 08:14', cost: 48.50,
    notes: 'Rush order for thesis presentation.', assignedPrinter: 'Prusa-MK3-02',
  },
  {
    id: 'PF-2024-0049', user: 'Abena Darko',   email: 'a.darko@ug.edu.gh',
    file: 'arch_model_final.stl',    material: 'PLA',  quality: 'HIGH',
    infill: 20, color: '#FFFFFF', qty: 1,
    status: 'APPROVED', submitted: '2024-06-25 07:31', cost: 95.00,
    notes: '', assignedPrinter: 'Creality-K2-01',
  },
  {
    id: 'PF-2024-0048', user: 'Yaw Boateng',   email: 'y.boateng@ug.edu.gh',
    file: 'robot_arm_joint.stl',     material: 'ABS',  quality: 'STANDARD',
    infill: 60, color: '#000000', qty: 4,
    status: 'SUBMITTED', submitted: '2024-06-25 06:55', cost: 62.40,
    notes: '',
  },
  {
    id: 'PF-2024-0047', user: 'Ama Osei',      email: 'a.osei@ug.edu.gh',
    file: 'lab_clamp_v4.stl',        material: 'ABS',  quality: 'DRAFT',
    infill: 30, color: '#9333EA', qty: 6,
    status: 'SUBMITTED', submitted: '2024-06-24 16:20', cost: 38.40,
    notes: '',
  },
  {
    id: 'PF-2024-0046', user: 'Efua Sarpong',  email: 'e.sarpong@ug.edu.gh',
    file: 'pendant_shade.stl',       material: 'PLA',  quality: 'HIGH',
    infill: 15, color: '#F97316', qty: 1,
    status: 'READY', submitted: '2024-06-24 10:11', cost: 44.50,
    notes: 'Excellent surface finish achieved.',
    assignedPrinter: 'Bambu-X1-02', pickupLocation: 'Design Studio',
  },
  {
    id: 'PF-2024-0045', user: 'Kwesi Appiah',  email: 'k.appiah@ug.edu.gh',
    file: 'drone_frame_v1.stl',      material: 'ABS',  quality: 'STANDARD',
    infill: 45, color: '#16A34A', qty: 2,
    status: 'COLLECTED', submitted: '2024-06-23 14:30', cost: 76.00,
    notes: '', assignedPrinter: 'Prusa-MK3-04',
  },
];
