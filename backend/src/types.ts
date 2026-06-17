export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  qrCode: string | null;
  qrCodeBoundAt: string | null;
  createdAt: string;
}

export interface Visitor {
  id: string;
  name: string;
  phone: string;
  idCard: string;
  company: string;
  purpose: string;
  hostEmployeeId: string;
  hostName: string;
  status: 'pending' | 'confirmed' | 'visited' | 'cancelled';
  passCode: string | null;
  passCodeValidFrom: string | null;
  passCodeValidTo: string | null;
  allowedDoors: string | null;
  estimatedArrival: string;
  actualArrival: string | null;
  actualDeparture: string | null;
  createdAt: string;
}

export interface AccessRecord {
  id: string;
  userId: string;
  userType: 'employee' | 'visitor';
  userName: string;
  doorId: string;
  doorName: string;
  direction: 'in' | 'out';
  accessTime: string;
  success: boolean;
  reason: string | null;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'missing_checkin' | 'missing_checkout' | 'holiday' | 'weekend';
  workHours: number | null;
  createdAt: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'holiday' | 'workday';
  createdAt: string;
}

export interface WorkRule {
  id: string;
  name: string;
  department: string | null;
  workStartTime: string;
  workEndTime: string;
  flexibleMinutes: number;
  isDefault: boolean;
  createdAt: string;
}

export interface Door {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Notification {
  id: string;
  employeeId: string;
  type: 'visitor_arrival' | 'attendance_abnormal';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  relatedId: string | null;
}

export interface LoginResponse {
  token: string;
  user: Employee;
  role: 'employee' | 'admin' | 'hr' | 'reception';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
