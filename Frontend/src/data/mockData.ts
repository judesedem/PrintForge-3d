export type Role = 'student' | 'designer' | 'staff' | 'admin';
export type JobStatus = 'SUBMITTED' | 'APPROVED' | 'QUEUED' | 'PRINTING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REJECTED';
export type PrinterStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'MAINTENANCE';
export type Material = 'PLA' | 'RESIN' | 'ABS';
export type Quality = 'DRAFT' | 'STANDARD' | 'HIGH';

export type Job = {
  id: string;
  title: string;
  student: string;
  status: JobStatus;
  material: Material;
  quality: Quality;
  printer: string;
  location: string;
  cost: number;
  qty: number;
  submittedAt: string;
  tracking: string;
  notes?: string;
};

export type Listing = {
  id: string;
  title: string;
  designer: string;
  material: Material;
  price: number;
  rating: number;
  downloads: number;
  image: string;
};

export type Printer = {
  id: string;
  name: string;
  status: PrinterStatus;
  location: string;
  currentJob?: string;
  progress?: number;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
  unread: boolean;
};

export const JOBS: Job[] = [
  {
    id: 'PF-2024-0041',
    title: 'Prototype Gear Housing',
    student: 'Kwame Mensah',
    status: 'IN_PROGRESS',
    material: 'PLA',
    quality: 'STANDARD',
    printer: 'Formbot V2',
    location: 'Lab B',
    cost: 75.5,
    qty: 2,
    submittedAt: '2026-06-20',
    tracking: 'TRK-8841',
    notes: 'Please verify the support structures before starting.',
  },
  {
    id: 'PF-2024-0039',
    title: 'Resin Jewelry Mold',
    student: 'Ama Ofori',
    status: 'COMPLETED',
    material: 'RESIN',
    quality: 'HIGH',
    printer: 'Elegoo Mars X',
    location: 'Studio 3',
    cost: 142.75,
    qty: 1,
    submittedAt: '2026-06-18',
    tracking: 'TRK-6729',
  },
  {
    id: 'PF-2024-0044',
    title: 'Custom Phone Stand',
    student: 'Yaw Boateng',
    status: 'SUBMITTED',
    material: 'ABS',
    quality: 'DRAFT',
    printer: 'Ultimaker S5',
    location: 'Lab A',
    cost: 38.4,
    qty: 3,
    submittedAt: '2026-06-22',
    tracking: 'TRK-1183',
  },
  {
    id: 'PF-2024-0035',
    title: 'Workshop Badge Holder',
    student: 'Efua Asante',
    status: 'COMPLETED',
    material: 'PLA',
    quality: 'STANDARD',
    printer: 'Prusa i3 MK3S',
    location: 'Lab C',
    cost: 24.0,
    qty: 5,
    submittedAt: '2026-06-15',
    tracking: 'TRK-3392',
  },
  {
    id: 'PF-2024-0047',
    title: 'Drone Landing Gear',
    student: 'Nana Boateng',
    status: 'APPROVED',
    material: 'ABS',
    quality: 'STANDARD',
    printer: 'FlashForge Adventurer 3',
    location: 'Workshop 1',
    cost: 98.2,
    qty: 1,
    submittedAt: '2026-06-21',
    tracking: 'TRK-5520',
  },
  {
    id: 'PF-2024-0031',
    title: 'Prototype Lens Cover',
    student: 'Kofi Amoah',
    status: 'FAILED',
    material: 'RESIN',
    quality: 'HIGH',
    printer: 'Anycubic Photon M3',
    location: 'Studio 2',
    cost: 67.95,
    qty: 1,
    submittedAt: '2026-06-12',
    tracking: 'TRK-2247',
    notes: 'Resin cured unevenly; review support orientation.',
  },
];

export const LISTINGS: Listing[] = [
  {
    id: 'listing-1',
    title: 'Minimalist Desk Organizer',
    designer: 'Kojo Asante',
    material: 'PLA',
    price: 45,
    rating: 4.8,
    downloads: 132,
    image: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'listing-2',
    title: 'Stackable Planter Set',
    designer: 'Adjoa Owusu',
    material: 'RESIN',
    price: 65,
    rating: 4.9,
    downloads: 87,
    image: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'listing-3',
    title: 'Precision Tool Holder',
    designer: 'Yaw Ofori',
    material: 'ABS',
    price: 58,
    rating: 4.7,
    downloads: 105,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'listing-4',
    title: 'Curved Wall Lamp Bracket',
    designer: 'Ama Serwaa',
    material: 'PLA',
    price: 72,
    rating: 4.9,
    downloads: 119,
    image: 'https://images.unsplash.com/photo-1490655796793-0f1ff390f7a7?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'listing-5',
    title: 'Travel Cable Organizer',
    designer: 'Kofi Ababio',
    material: 'ABS',
    price: 37,
    rating: 4.6,
    downloads: 94,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'listing-6',
    title: 'Custom Earbud Stand',
    designer: 'Esi Nkrumah',
    material: 'RESIN',
    price: 52,
    rating: 4.8,
    downloads: 138,
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
  },
];

export const PRINTERS: Printer[] = [
  {
    id: 'printer-1',
    name: 'Formbot V2',
    status: 'BUSY',
    location: 'Lab B',
    currentJob: 'Prototype Gear Housing',
    progress: 68,
  },
  {
    id: 'printer-2',
    name: 'Elegoo Mars X',
    status: 'BUSY',
    location: 'Studio 3',
    currentJob: 'Resin Jewelry Mold',
    progress: 100,
  },
  {
    id: 'printer-3',
    name: 'Prusa i3 MK3S',
    status: 'AVAILABLE',
    location: 'Lab C',
  },
  {
    id: 'printer-4',
    name: 'FlashForge Adventurer 3',
    status: 'MAINTENANCE',
    location: 'Workshop 1',
  },
  {
    id: 'printer-5',
    name: 'Ultimaker S5',
    status: 'AVAILABLE',
    location: 'Lab A',
  },
  {
    id: 'printer-6',
    name: 'Anycubic Photon M3',
    status: 'OFFLINE',
    location: 'Studio 2',
  },
];

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'Job Approved',
    body: 'Your print job PF-2024-0047 has been approved and queued for print.',
    type: 'success',
    timestamp: '2h ago',
    unread: true,
  },
  {
    id: 'notif-2',
    title: 'Payment Received',
    body: 'Your Paystack payment for PF-2024-0041 was successful.',
    type: 'info',
    timestamp: '5h ago',
    unread: false,
  },
  {
    id: 'notif-3',
    title: 'Printer Maintenance',
    body: 'FlashForge Adventurer 3 is under maintenance until tomorrow.',
    type: 'warning',
    timestamp: '1d ago',
    unread: true,
  },
  {
    id: 'notif-4',
    title: 'Job Failed',
    body: 'PF-2024-0031 failed during printing. Please review the notes.',
    type: 'error',
    timestamp: '2d ago',
    unread: false,
  },
  {
    id: 'notif-5',
    title: 'New Listing Live',
    body: 'A new Marketplace design is available in the PLA collection.',
    type: 'info',
    timestamp: '3d ago',
    unread: true,
  },
];
