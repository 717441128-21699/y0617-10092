import db from './database';

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

export async function getWorkRuleForEmployee(employeeId: string): Promise<any | null> {
  const employee = await db.prepare('SELECT workRuleId FROM employees WHERE id = ?').get(employeeId) as any;
  if (!employee) return null;

  if (employee.workRuleId) {
    const rule = await db.prepare('SELECT * FROM workRules WHERE id = ?').get(employee.workRuleId);
    if (rule) return rule;
  }

  const allRules = await db.prepare('SELECT * FROM workRules ORDER BY createdAt LIMIT 1').all();
  return allRules[0] || null;
}

export async function isHoliday(dateStr: string): Promise<any | null> {
  return await db.prepare('SELECT * FROM holidays WHERE date = ?').get(dateStr);
}

export function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
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
    if (holiday.type === 'makeup') {
      // 调休工作日，按正常工作日算
    } else {
      return { status: 'holiday', workHours: null };
    }
  }

  if (!holiday && isWeekend(dateStr)) {
    return { status: 'weekend', workHours: null };
  }

  if (!checkIn && !checkOut) {
    return { status: 'absent', workHours: null };
  }

  const rule = await getWorkRuleForEmployee(employeeId);
  if (!rule) {
    if (checkIn && checkOut) {
      const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
      return { status: 'normal', workHours: Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100 };
    }
    if (!checkIn && checkOut) {
      return { status: 'missing_checkin', workHours: null };
    }
    if (checkIn && !checkOut) {
      return { status: 'missing_checkout', workHours: null };
    }
    return { status: 'normal', workHours: null };
  }

  const isFlexible = !!rule.isFlexible;
  const { hours: startHour, minutes: startMin } = parseTime(rule.workStartTime);
  const { hours: endHour, minutes: endMin } = parseTime(rule.workEndTime);
  const tolerance = rule.toleranceMinutes || 0;

  let status = 'normal';
  let workHours: number | null = null;

  const effectiveStart = new Date(dateStr + 'T00:00:00');
  effectiveStart.setHours(startHour, startMin + tolerance, 0, 0);

  const effectiveEnd = new Date(dateStr + 'T00:00:00');
  effectiveEnd.setHours(endHour, endMin - tolerance, 0, 0);

  if (checkIn) {
    const checkInDate = new Date(checkIn);
    if (checkInDate > effectiveStart) {
      status = 'late';
    }
  } else {
    status = 'missing_checkin';
  }

  if (checkOut) {
    const checkOutDate = new Date(checkOut);
    if (checkOutDate < effectiveEnd) {
      if (status === 'normal') {
        status = 'early';
      }
    }
  } else {
    if (status !== 'missing_checkin') {
      status = 'missing_checkout';
    }
  }

  if (checkIn && checkOut) {
    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    if (isFlexible && rule.minWorkHours) {
      if (workHours < rule.minWorkHours && status === 'normal') {
        status = 'early';
      }
    }
  } else if (checkIn && !checkOut) {
    // only checkIn, no checkOut - missing_checkout
  } else if (!checkIn && checkOut) {
    // only checkOut, no checkIn - missing_checkin
  }

  return { status, workHours };
}

export async function validatePassCode(passCode: string, doorId: string): Promise<{
  valid: boolean;
  visitor?: any;
  reason?: string;
}> {
  const visitor = await db.prepare(`
    SELECT v.*, e.department as hostDepartment
    FROM visitors v
    LEFT JOIN employees e ON v.hostEmployeeId = e.id
    WHERE v.passCode = ? AND v.status IN ('confirmed', 'visited')
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
