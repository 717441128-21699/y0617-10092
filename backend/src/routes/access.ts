import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { validatePassCode, formatDate, calculateAttendanceStatus } from '../utils';
import { broadcastAccessRecord, broadcastVisitorUpdate } from '../websocket';

const router = Router();

router.get('/doors', authMiddleware, async (req, res) => {
  const doors = await db.prepare('SELECT * FROM doors WHERE status = ? ORDER BY location, name').all('active');
  res.json({ success: true, data: doors });
});

router.post('/doors', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  const { name, location } = req.body;

  if (!name || !location) {
    return res.status(400).json({ success: false, error: '请填写完整信息' });
  }

  const id = uuidv4();
  await db.prepare(`
    INSERT INTO doors (id, name, location, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(id, name, location, new Date().toISOString());

  res.json({ success: true, data: { id, name, location }, message: '门禁添加成功' });
});

router.get('/records', authMiddleware, async (req: AuthRequest, res) => {
  const { date, userType, page = 1, pageSize = 50 } = req.query;
  const user = req.user!;

  let sql = 'SELECT * FROM accessRecords WHERE 1=1';
  const params: string[] = [];

  if (user.role === 'employee') {
    sql += ' AND userId = ? AND userType = ?';
    params.push(user.id, 'employee');
  }

  if (date) {
    sql += ' AND DATE(accessTime) = ?';
    params.push(date as string);
  }

  if (userType) {
    sql += ' AND userType = ?';
    params.push(userType as string);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = (await db.prepare(countSql).get(...params) as any).count;

  sql += ' ORDER BY accessTime DESC LIMIT ? OFFSET ?';
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

router.post('/scan', authMiddleware, async (req: AuthRequest, res) => {
  const { qrCode, doorId, direction } = req.body;

  if (!qrCode || !doorId || !direction) {
    return res.status(400).json({ success: false, error: '缺少必要参数' });
  }

  const door = await db.prepare('SELECT * FROM doors WHERE id = ? AND status = ?').get(doorId, 'active') as any;
  if (!door) {
    return res.status(400).json({ success: false, error: '门禁不存在或未启用' });
  }

  let userId: string;
  let userType: 'employee' | 'visitor';
  let userName: string;
  let success = true;
  let reason: string | null = null;

  if (qrCode.startsWith('EMP-')) {
    userType = 'employee';
    const employee = await db.prepare('SELECT * FROM employees WHERE qrCode = ?').get(qrCode) as any;

    if (!employee) {
      success = false;
      reason = '工牌二维码无效';
      userId = 'unknown';
      userName = '未知用户';
    } else {
      userId = employee.id;
      userName = employee.name;

      const accessTime = new Date().toISOString();
      const dateStr = formatDate(new Date());

      const existingAttendance = await db.prepare('SELECT * FROM attendances WHERE employeeId = ? AND date = ?').get(employee.id, dateStr) as any;

      if (direction === 'in') {
        if (!existingAttendance) {
          const { status, workHours } = await calculateAttendanceStatus(employee.id, employee.department, dateStr, accessTime, null);
          await db.prepare(`
            INSERT INTO attendances (id, employeeId, employeeName, department, date, checkIn, status, workHours, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(uuidv4(), employee.id, employee.name, employee.department, dateStr, accessTime, status, workHours, new Date().toISOString());
        } else if (!existingAttendance.checkIn) {
          const { status, workHours } = await calculateAttendanceStatus(employee.id, employee.department, dateStr, accessTime, existingAttendance.checkOut);
          await db.prepare(`
            UPDATE attendances SET checkIn = ?, status = ?, workHours = ? WHERE id = ?
          `).run(accessTime, status, workHours, existingAttendance.id);
        }
      } else if (direction === 'out') {
        if (existingAttendance) {
          const { status, workHours } = await calculateAttendanceStatus(employee.id, employee.department, dateStr, existingAttendance.checkIn, accessTime);
          await db.prepare(`
            UPDATE attendances SET checkOut = ?, status = ?, workHours = ? WHERE id = ?
          `).run(accessTime, status, workHours, existingAttendance.id);
        } else {
          const { status, workHours } = await calculateAttendanceStatus(employee.id, employee.department, dateStr, null, accessTime);
          await db.prepare(`
            INSERT INTO attendances (id, employeeId, employeeName, department, date, checkIn, checkOut, status, workHours, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(uuidv4(), employee.id, employee.name, employee.department, dateStr, null, accessTime, status, workHours, new Date().toISOString());
        }
      }
    }
  } else if (qrCode.startsWith('VIS-')) {
    userType = 'visitor';
    const validation = await validatePassCode(qrCode, doorId);

    if (!validation.valid) {
      success = false;
      reason = validation.reason || '通行码无效';
      userId = 'unknown';
      userName = '未知访客';
    } else {
      userId = validation.visitor!.id;
      userName = validation.visitor!.name;

      if (direction === 'in' && !validation.visitor!.actualArrival) {
        await db.prepare('UPDATE visitors SET actualArrival = ?, status = ? WHERE id = ?')
          .run(new Date().toISOString(), 'visited', validation.visitor!.id);
        broadcastVisitorUpdate();
      } else if (direction === 'out' && !validation.visitor!.actualDeparture) {
        await db.prepare('UPDATE visitors SET actualDeparture = ? WHERE id = ?')
          .run(new Date().toISOString(), validation.visitor!.id);
      }
    }
  } else {
    return res.status(400).json({ success: false, error: '无效的二维码格式' });
  }

  const recordId = uuidv4();
  const accessTime = new Date().toISOString();

  await db.prepare(`
    INSERT INTO accessRecords (
      id, userId, userType, userName, doorId, doorName,
      direction, accessTime, success, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    recordId, userId, userType, userName, doorId, door.name,
    direction, accessTime, success ? 1 : 0, reason
  );

  const record = {
    id: recordId,
    userId,
    userType,
    userName,
    doorId,
    doorName: door.name,
    direction,
    accessTime,
    success,
    reason,
  };

  broadcastAccessRecord(record);

  if (!success) {
    return res.status(403).json({ success: false, error: reason, data: record });
  }

  res.json({
    success: true,
    message: direction === 'in' ? '进门成功' : '出门成功',
    data: record,
  });
});

router.post('/scan-public', async (req, res) => {
  const { qrCode, doorId, direction } = req.body;

  if (!qrCode || !doorId || !direction) {
    return res.status(400).json({ success: false, error: '缺少必要参数' });
  }

  const door = await db.prepare('SELECT * FROM doors WHERE id = ? AND status = ?').get(doorId, 'active') as any;
  if (!door) {
    return res.status(400).json({ success: false, error: '门禁不存在或未启用' });
  }

  let userId: string;
  let userType: 'employee' | 'visitor';
  let userName: string;
  let success = true;
  let reason: string | null = null;

  if (qrCode.startsWith('EMP-')) {
    userType = 'employee';
    const employee = await db.prepare('SELECT * FROM employees WHERE qrCode = ?').get(qrCode) as any;

    if (!employee) {
      success = false;
      reason = '工牌二维码无效';
      userId = 'unknown';
      userName = '未知用户';
    } else {
      userId = employee.id;
      userName = employee.name;

      const accessTime = new Date().toISOString();
      const dateStr = formatDate(new Date());

      const existingAttendance = await db.prepare('SELECT * FROM attendances WHERE employeeId = ? AND date = ?').get(employee.id, dateStr) as any;

      if (direction === 'in') {
        if (!existingAttendance) {
          const { status, workHours } = await calculateAttendanceStatus(employee.id, employee.department, dateStr, accessTime, null);
          await db.prepare(`
            INSERT INTO attendances (id, employeeId, employeeName, department, date, checkIn, status, workHours, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(uuidv4(), employee.id, employee.name, employee.department, dateStr, accessTime, status, workHours, new Date().toISOString());
        } else if (!existingAttendance.checkIn) {
          const { status, workHours } = await calculateAttendanceStatus(employee.id, employee.department, dateStr, accessTime, existingAttendance.checkOut);
          await db.prepare(`
            UPDATE attendances SET checkIn = ?, status = ?, workHours = ? WHERE id = ?
          `).run(accessTime, status, workHours, existingAttendance.id);
        }
      } else if (direction === 'out') {
        if (existingAttendance) {
          const { status, workHours } = await calculateAttendanceStatus(employee.id, employee.department, dateStr, existingAttendance.checkIn, accessTime);
          await db.prepare(`
            UPDATE attendances SET checkOut = ?, status = ?, workHours = ? WHERE id = ?
          `).run(accessTime, status, workHours, existingAttendance.id);
        } else {
          const { status, workHours } = await calculateAttendanceStatus(employee.id, employee.department, dateStr, null, accessTime);
          await db.prepare(`
            INSERT INTO attendances (id, employeeId, employeeName, department, date, checkIn, checkOut, status, workHours, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(uuidv4(), employee.id, employee.name, employee.department, dateStr, null, accessTime, status, workHours, new Date().toISOString());
        }
      }
    }
  } else if (qrCode.startsWith('VIS-')) {
    userType = 'visitor';
    const validation = await validatePassCode(qrCode, doorId);

    if (!validation.valid) {
      success = false;
      reason = validation.reason || '通行码无效';
      userId = 'unknown';
      userName = '未知访客';
    } else {
      userId = validation.visitor!.id;
      userName = validation.visitor!.name;

      if (direction === 'in' && !validation.visitor!.actualArrival) {
        await db.prepare('UPDATE visitors SET actualArrival = ?, status = ? WHERE id = ?')
          .run(new Date().toISOString(), 'visited', validation.visitor!.id);
        broadcastVisitorUpdate();
      } else if (direction === 'out' && !validation.visitor!.actualDeparture) {
        await db.prepare('UPDATE visitors SET actualDeparture = ? WHERE id = ?')
          .run(new Date().toISOString(), validation.visitor!.id);
      }
    }
  } else {
    return res.status(400).json({ success: false, error: '无效的二维码格式' });
  }

  const recordId = uuidv4();
  const accessTime = new Date().toISOString();

  await db.prepare(`
    INSERT INTO accessRecords (
      id, userId, userType, userName, doorId, doorName,
      direction, accessTime, success, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    recordId, userId, userType, userName, doorId, door.name,
    direction, accessTime, success ? 1 : 0, reason
  );

  const record = {
    id: recordId,
    userId,
    userType,
    userName,
    doorId,
    doorName: door.name,
    direction,
    accessTime,
    success,
    reason,
  };

  broadcastAccessRecord(record);

  if (!success) {
    return res.status(403).json({ success: false, error: reason, data: record });
  }

  res.json({
    success: true,
    message: direction === 'in' ? '进门成功' : '出门成功',
    data: record,
  });
});

export default router;
