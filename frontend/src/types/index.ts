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
  role: 'employee' | 'admin' | 'hr' | 'reception';
  workRuleId: string | null;
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
  hostDepartment?: string;
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
  status: 'normal' | 'late' | 'early' | 'absent' | 'missing_checkin' | 'missing_checkout' | 'weekend' | 'holiday';
  workHours: number | null;
  createdAt: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'holiday' | 'makeup';
  description: string | null;
  createdAt: string;
}

export interface WorkRule {
  id: string;
  name: string;
  isFlexible: boolean;
  workStartTime: string;
  workEndTime: string;
  coreStartTime: string | null;
  coreEndTime: string | null;
  toleranceMinutes: number;
  minWorkHours: number;
  description: string | null;
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
  type: 'visitor_arrival' | 'visitor_confirmed' | 'visitor_cancelled' | 'attendance_alert';
  title: string;
  message: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  relatedId: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginResponse {
  token: string;
  user: Employee;
  role: 'employee' | 'admin' | 'hr' | 'reception';
}

export const attendanceStatusMap: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'success' },
  late: { text: '迟到', color: 'warning' },
  early: { text: '早退', color: 'warning' },
  absent: { text: '旷工', color: 'error' },
  missing_checkin: { text: '漏打卡(上班)', color: 'warning' },
  missing_checkout: { text: '漏打卡(下班)', color: 'warning' },
  weekend: { text: '周末', color: 'default' },
  holiday: { text: '节假日', color: 'processing' },
};

export const visitorStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: 'warning' },
  confirmed: { text: '已确认', color: 'processing' },
  visited: { text: '已到访', color: 'success' },
  cancelled: { text: '已取消', color: 'default' },
};

export const roleMap: Record<string, { text: string; color: string }> = {
  admin: { text: '管理员', color: 'red' },
  hr: { text: 'HR', color: 'purple' },
  reception: { text: '前台', color: 'cyan' },
  employee: { text: '员工', color: 'blue' },
};

export const departmentMap: Record<string, string> = {
  tech: '技术部',
  product: '产品部',
  hr: '人力资源部',
  admin: '行政部',
  finance: '财务部',
  sales: '销售部',
  marketing: '市场部',
  operations: '运营部',
};
