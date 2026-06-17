import db from './database';
import { WorkRule, Holiday } from './types';

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

export async function getWorkRuleForDepartment(department: string): Promise<WorkRule | null> {
  let rule = await db.prepare('SELECT * FROM workRules WHERE department = ?').get(department) as WorkRule | undefined;
  
  if (!rule) {
    rule = await db.prepare('SELECT * FROM workRules WHERE isDefault = 1').get() as WorkRule | undefined;
  }
  
  return rule || null;
}

export async function isHoliday(dateStr: string): Promise<Holiday | null> {
  return await db.prepare('SELECT * FROM holidays WHERE date = ?').get(dateStr) as Holiday | null;
}

export function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0 || day === 6;
}

export async function calculateAttendanceStatus(
  employeeId: string,
  department: string,
  dateStr: string,
  checkIn: string | null,
  checkOut: string | null
): Promise<{ status: string; workHours: number | null }> {
  const holiday = await isHoliday(dateStr);
  if (holiday) {
    return { status: holiday.type === 'holiday' ? 'holiday' : 'normal', workHours: null };
  }

  if (isWeekend(dateStr)) {
    return { status: 'weekend', workHours: null };
  }

  if (!checkIn && !checkOut) {
    return { status: 'absent', workHours: null };
  }

  const rule = await getWorkRuleForDepartment(department);
  if (!rule) {
    return { status: 'normal', workHours: null };
  }

  let status = 'normal';
  let workHours: number | null = null;

  const { hours: startHour, minutes: startMin } = parseTime(rule.workStartTime);
  const { hours: endHour, minutes: endMin } = parseTime(rule.workEndTime);

  const workStartDate = new Date(dateStr);
  workStartDate.setHours(startHour, startMin + rule.flexibleMinutes, 0, 0);

  const workEndDate = new Date(dateStr);
  workEndDate.setHours(endHour, endMin - rule.flexibleMinutes, 0, 0);

  if (checkIn) {
    const checkInDate = new Date(checkIn);
    if (checkInDate > workStartDate) {
      status = 'late';
    }
  } else {
    status = 'missing_checkin';
  }

  if (checkOut) {
    const checkOutDate = new Date(checkOut);
    if (checkOutDate < workEndDate && status === 'normal') {
      status = 'early_leave';
    } else if (checkOutDate < workEndDate && status === 'late') {
      status = 'late';
    }
  } else if (status !== 'missing_checkin') {
    status = 'missing_checkout';
  }

  if (checkIn && checkOut) {
    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  return { status, workHours };
}

export async function validatePassCode(passCode: string, doorId: string): Promise<{
  valid: boolean;
  visitor?: any;
  reason?: string;
}> {
  const visitor = await db.prepare(`
    SELECT * FROM visitors 
    WHERE passCode = ? AND status = 'confirmed'
  `).get(passCode) as any;

  if (!visitor) {
    return { valid: false, reason: '通行码无效或已过期' };
  }

  const now = new Date();
  const validFrom = new Date(visitor.passCodeValidFrom);
  const validTo = new Date(visitor.passCodeValidTo);

  if (now < validFrom) {
    return { valid: false, reason: '通行码尚未生效' };
  }

  if (now > validTo) {
    return { valid: false, reason: '通行码已过期' };
  }

  if (visitor.allowedDoors) {
    const allowedDoors = JSON.parse(visitor.allowedDoors);
    if (!allowedDoors.includes(doorId)) {
      return { valid: false, reason: '该通行码不允许通过此门禁' };
    }
  }

  return { valid: true, visitor };
}
