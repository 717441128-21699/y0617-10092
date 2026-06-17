import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { formatDate, calculateAttendanceStatus } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

const router = Router();

router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  const { startDate, endDate, page = 1, pageSize = 30 } = req.query;
  const employeeId = req.user!.id;

  let sql = 'SELECT * FROM attendances WHERE employeeId = ?';
  const params: string[] = [employeeId];

  if (startDate) {
    sql += ' AND date >= ?';
    params.push(startDate as string);
  }

  if (endDate) {
    sql += ' AND date <= ?';
    params.push(endDate as string);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = (await db.prepare(countSql).get(...params) as any).count;

  sql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  const records = await db.prepare(sql).all(...params, Number(pageSize), (Number(page) - 1) * Number(pageSize));

  res.json({
    success: true,
    data: {
      records,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    },
  });
});

router.get('/my/today', authMiddleware, async (req: AuthRequest, res) => {
  const employeeId = req.user!.id;
  const today = formatDate(new Date());

  const attendance = await db.prepare('SELECT * FROM attendances WHERE employeeId = ? AND date = ?').get(employeeId, today) as any;
  
  if (!attendance) {
    return res.json({ success: true, data: null });
  }

  res.json({ success: true, data: attendance });
});

router.get('/', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { date, department, employeeId, status, month, startDate, endDate, page = 1, pageSize = 50 } = req.query;

  let sql = 'SELECT * FROM attendances WHERE 1=1';
  const params: string[] = [];

  if (month) {
    const [year, mon] = (month as string).split('-').map(Number);
    const mStart = `${year}-${String(mon).padStart(2, '0')}-01`;
    const mEnd = new Date(year, mon, 0).toISOString().split('T')[0];
    sql += ' AND date >= ? AND date <= ?';
    params.push(mStart, mEnd);
  } else {
    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate as string);
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate as string);
    }
  }

  if (date) {
    sql += ' AND date = ?';
    params.push(date as string);
  }

  if (department) {
    sql += ' AND department = ?';
    params.push(department as string);
  }

  if (employeeId) {
    sql += ' AND employeeId = ?';
    params.push(employeeId as string);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status as string);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = (await db.prepare(countSql).get(...params) as any).count;

  sql += ' ORDER BY date DESC, department, employeeName LIMIT ? OFFSET ?';
  const records = await db.prepare(sql).all(...params, Number(pageSize), (Number(page) - 1) * Number(pageSize));

  res.json({
    success: true,
    data: {
      records,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    },
  });
});

router.get('/statistics', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { month, startDate, endDate, department } = req.query;

  let dateFilter = '';
  const params: string[] = [];

  if (month) {
    const [year, mon] = (month as string).split('-').map(Number);
    const mStart = `${year}-${String(mon).padStart(2, '0')}-01`;
    const mEnd = new Date(year, mon, 0).toISOString().split('T')[0];
    dateFilter = ' AND date >= ? AND date <= ?';
    params.push(mStart, mEnd);
  } else {
    if (startDate) {
      dateFilter += ' AND date >= ?';
      params.push(startDate as string);
    }
    if (endDate) {
      dateFilter += ' AND date <= ?';
      params.push(endDate as string);
    }
  }

  if (department) {
    dateFilter += ' AND department = ?';
    params.push(department as string);
  }

  const deptSql = `
    SELECT 
      department,
      COUNT(*) as totalDays,
      SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
      SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
      SUM(CASE WHEN status = 'early' THEN 1 ELSE 0 END) as early,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN status IN ('missing_checkin', 'missing_checkout') THEN 1 ELSE 0 END) as missing,
      AVG(workHours) as avgWorkHours
    FROM attendances 
    WHERE status NOT IN ('holiday', 'weekend')${dateFilter}
    GROUP BY department ORDER BY department
  `;

  const byDepartment = await db.prepare(deptSql).all(...params);

  const overallSql = `
    SELECT 
      COUNT(*) as totalDays,
      COUNT(DISTINCT employeeId) as totalEmployees,
      SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
      SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
      SUM(CASE WHEN status = 'early' THEN 1 ELSE 0 END) as early,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN status IN ('missing_checkin', 'missing_checkout') THEN 1 ELSE 0 END) as missing,
      AVG(workHours) as avgWorkHours
    FROM attendances 
    WHERE status NOT IN ('holiday', 'weekend')${dateFilter}
  `;

  const overall = await db.prepare(overallSql).get(...params) as any;

  const byStatus = {
    normal: overall?.normal || 0,
    late: overall?.late || 0,
    early: overall?.early || 0,
    absent: overall?.absent || 0,
    missing: overall?.missing || 0,
    weekend: 0,
    holiday: 0,
  };

  const weekendHolidaySql = `
    SELECT 
      SUM(CASE WHEN status = 'weekend' THEN 1 ELSE 0 END) as weekend,
      SUM(CASE WHEN status = 'holiday' THEN 1 ELSE 0 END) as holiday
    FROM attendances WHERE 1=1${dateFilter.replace('AND', 'AND')}
  `;

  const weekendParams = [...params];
  const whResult = await db.prepare(weekendHolidaySql).get(...weekendParams) as any;
  if (whResult) {
    byStatus.weekend = whResult.weekend || 0;
    byStatus.holiday = whResult.holiday || 0;
  }

  res.json({
    success: true,
    data: {
      byDepartment,
      overall,
      byStatus,
      totalDays: overall?.totalDays || 0,
      totalEmployees: overall?.totalEmployees || 0,
    },
  });
});

router.get('/monthly-report', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { year, month, department } = req.query;

  if (!year || !month) {
    return res.status(400).json({ success: false, error: '请指定年份和月份' });
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

  let sql = `
    SELECT 
      a.employeeId,
      a.employeeName,
      a.department,
      COUNT(*) as totalWorkDays,
      SUM(CASE WHEN a.status = 'normal' THEN 1 ELSE 0 END) as normalDays,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as lateDays,
      SUM(CASE WHEN a.status = 'early' THEN 1 ELSE 0 END) as earlyLeaveDays,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absentDays,
      SUM(CASE WHEN a.status IN ('missing_checkin', 'missing_checkout') THEN 1 ELSE 0 END) as missingDays,
      SUM(CASE WHEN a.status = 'holiday' THEN 1 ELSE 0 END) as holidays,
      SUM(CASE WHEN a.status = 'weekend' THEN 1 ELSE 0 END) as weekends,
      AVG(a.workHours) as avgWorkHours
    FROM attendances a
    WHERE a.date >= ? AND a.date <= ?
  `;

  const params: string[] = [startDate, endDate];

  if (department) {
    sql += ' AND a.department = ?';
    params.push(department as string);
  }

  sql += ' GROUP BY a.employeeId, a.employeeName, a.department ORDER BY a.department, a.employeeName';

  const report = await db.prepare(sql).all(...params);

  res.json({
    success: true,
    data: {
      period: `${year}年${month}月`,
      startDate,
      endDate,
      records: report,
    },
  });
});

router.get('/export-monthly', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { year, month, department } = req.query;

  if (!year || !month) {
    return res.status(400).json({ success: false, error: '请指定年份和月份' });
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

  let sql = `
    SELECT 
      a.employeeId as 工号,
      a.employeeName as 姓名,
      a.department as 部门,
      a.date as 日期,
      a.checkIn as 上班时间,
      a.checkOut as 下班时间,
      CASE a.status
        WHEN 'normal' THEN '正常'
        WHEN 'late' THEN '迟到'
        WHEN 'early' THEN '早退'
        WHEN 'absent' THEN '旷工'
        WHEN 'missing_checkin' THEN '漏打卡(上班)'
        WHEN 'missing_checkout' THEN '漏打卡(下班)'
        WHEN 'holiday' THEN '节假日'
        WHEN 'weekend' THEN '周末'
        ELSE a.status
      END as 状态,
      a.workHours as 工作时长
    FROM attendances a
    WHERE a.date >= ? AND a.date <= ?
  `;

  const params: string[] = [startDate, endDate];

  if (department) {
    sql += ' AND a.department = ?';
    params.push(department as string);
  }

  sql += ' ORDER BY a.department, a.employeeId, a.date';

  const records = await db.prepare(sql).all(...params) as any[];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(records);
  XLSX.utils.book_append_sheet(wb, ws, '考勤明细');

  let summarySql = `
    SELECT 
      a.employeeId as 工号,
      a.employeeName as 姓名,
      a.department as 部门,
      COUNT(*) as 总天数,
      SUM(CASE WHEN a.status = 'normal' THEN 1 ELSE 0 END) as 正常,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as 迟到,
      SUM(CASE WHEN a.status = 'early' THEN 1 ELSE 0 END) as 早退,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as 旷工,
      SUM(CASE WHEN a.status IN ('missing_checkin', 'missing_checkout') THEN 1 ELSE 0 END) as 漏打卡,
      SUM(CASE WHEN a.status = 'holiday' THEN 1 ELSE 0 END) as 节假日,
      SUM(CASE WHEN a.status = 'weekend' THEN 1 ELSE 0 END) as 周末,
      ROUND(AVG(a.workHours), 2) as 平均工时
    FROM attendances a
    WHERE a.date >= ? AND a.date <= ?
  `;

  const summaryParams = [startDate, endDate];
  if (department) {
    summarySql += ' AND a.department = ?';
    summaryParams.push(department as string);
  }

  summarySql += ' GROUP BY a.employeeId, a.employeeName, a.department ORDER BY a.department, a.employeeId';

  const summary = await db.prepare(summarySql).all(...summaryParams) as any[];
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, wsSummary, '汇总统计');

  let deptSummarySql = `
    SELECT 
      a.department as 部门,
      COUNT(DISTINCT a.employeeId) as 人数,
      COUNT(*) as 总考勤记录,
      SUM(CASE WHEN a.status = 'normal' THEN 1 ELSE 0 END) as 正常,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as 迟到,
      SUM(CASE WHEN a.status = 'early' THEN 1 ELSE 0 END) as 早退,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as 旷工,
      SUM(CASE WHEN a.status IN ('missing_checkin', 'missing_checkout') THEN 1 ELSE 0 END) as 漏打卡,
      ROUND(AVG(a.workHours), 2) as 平均工时
    FROM attendances a
    WHERE a.date >= ? AND a.date <= ? AND a.status NOT IN ('holiday', 'weekend')
  `;

  const deptParams = [startDate, endDate];
  if (department) {
    deptSummarySql += ' AND a.department = ?';
    deptParams.push(department as string);
  }

  deptSummarySql += ' GROUP BY a.department ORDER BY a.department';

  const deptSummary = await db.prepare(deptSummarySql).all(...deptParams) as any[];
  const wsDept = XLSX.utils.json_to_sheet(deptSummary);
  XLSX.utils.book_append_sheet(wb, wsDept, '部门汇总');

  const fileName = `考勤报表_${year}${String(month).padStart(2, '0')}.xlsx`;
  const filePath = `/tmp/${fileName}`;
  
  XLSX.writeFile(wb, filePath);

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error('Download error:', err);
    }
  });
});

router.post('/recalculate', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { month, startDate, endDate } = req.body;

  let calcStartDate: string;
  let calcEndDate: string;

  if (month) {
    const [year, mon] = month.split('-').map(Number);
    calcStartDate = `${year}-${String(mon).padStart(2, '0')}-01`;
    calcEndDate = new Date(year, mon, 0).toISOString().split('T')[0];
  } else if (startDate && endDate) {
    calcStartDate = startDate;
    calcEndDate = endDate;
  } else {
    return res.status(400).json({ success: false, error: '请指定月份或日期范围' });
  }

  const employees = await db.prepare('SELECT id, name, department FROM employees').all() as any[];

  let updatedCount = 0;

  for (const emp of employees) {
    const currentDate = new Date(calcStartDate + 'T00:00:00');
    const end = new Date(calcEndDate + 'T00:00:00');
    while (currentDate <= end) {
      const dateStr = formatDate(currentDate);
      
      const attendance = await db.prepare('SELECT * FROM attendances WHERE employeeId = ? AND date = ?').get(emp.id, dateStr) as any;
      
      if (attendance) {
        const { status, workHours } = await calculateAttendanceStatus(emp.id, emp.department, dateStr, attendance.checkIn, attendance.checkOut);
        
        await db.prepare(`
          UPDATE attendances SET status = ?, workHours = ? WHERE id = ?
        `).run(status, workHours, attendance.id);
        
        updatedCount++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  res.json({ success: true, message: `已重新计算 ${updatedCount} 条考勤记录` });
});

router.get('/abnormal/today', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const today = formatDate(new Date());
  
  const abnormal = await db.prepare(`
    SELECT * FROM attendances 
    WHERE date = ? AND status IN ('late', 'early', 'absent', 'missing_checkin', 'missing_checkout')
    ORDER BY department, employeeName
  `).all(today);

  res.json({ success: true, data: abnormal });
});

export default router;
