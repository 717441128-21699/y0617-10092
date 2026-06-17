import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { broadcastVisitorUpdate } from '../websocket';
import { formatDate } from '../utils';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const { date, status, hostEmployeeId, search } = req.query;
  const user = req.user!;

  let sql = 'SELECT * FROM visitors WHERE 1=1';
  const params: string[] = [];

  if (user.role === 'employee') {
    sql += ' AND hostEmployeeId = ?';
    params.push(user.id);
  } else if (hostEmployeeId) {
    sql += ' AND hostEmployeeId = ?';
    params.push(hostEmployeeId as string);
  }

  if (date) {
    sql += ' AND DATE(estimatedArrival) = ?';
    params.push(date as string);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status as string);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR phone LIKE ? OR company LIKE ?)';
    const searchStr = `%${search}%`;
    params.push(searchStr, searchStr, searchStr);
  }

  sql += ' ORDER BY createdAt DESC';

  const visitors = await db.prepare(sql).all(...params);
  res.json({ success: true, data: visitors });
});

router.get('/today', authMiddleware, async (req: AuthRequest, res) => {
  const today = formatDate(new Date());
  const visitors = await db.prepare(`
    SELECT v.*, e.department as hostDepartment
    FROM visitors v
    LEFT JOIN employees e ON v.hostEmployeeId = e.id
    WHERE DATE(estimatedArrival) = ?
    ORDER BY 
      CASE status 
        WHEN 'pending' THEN 1
        WHEN 'confirmed' THEN 2
        WHEN 'visited' THEN 3
        ELSE 4
      END,
      estimatedArrival ASC
  `).all(today);

  res.json({ success: true, data: visitors });
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const user = req.user!;

  const visitor = await db.prepare('SELECT * FROM visitors WHERE id = ?').get(id) as any;

  if (!visitor) {
    return res.status(404).json({ success: false, error: '访客不存在' });
  }

  if (user.role === 'employee' && visitor.hostEmployeeId !== user.id) {
    return res.status(403).json({ success: false, error: '权限不足' });
  }

  res.json({ success: true, data: visitor });
});

router.post('/', authMiddleware, requireRole('admin', 'reception'), async (req: AuthRequest, res) => {
  const {
    name, phone, idCard, company, purpose,
    hostEmployeeId, estimatedArrival,
    passCodeValidFrom, passCodeValidTo, allowedDoors
  } = req.body;

  if (!name || !phone || !idCard || !company || !purpose || !hostEmployeeId || !estimatedArrival) {
    return res.status(400).json({ success: false, error: '请填写完整信息' });
  }

  const host = await db.prepare('SELECT name FROM employees WHERE id = ?').get(hostEmployeeId) as any;
  if (!host) {
    return res.status(400).json({ success: false, error: '被访员工不存在' });
  }

  const id = uuidv4();
  const passCode = `VIS-${id.slice(0, 8).toUpperCase()}`;

  await db.prepare(`
    INSERT INTO visitors (
      id, name, phone, idCard, company, purpose,
      hostEmployeeId, hostName, status,
      passCode, passCodeValidFrom, passCodeValidTo, allowedDoors,
      estimatedArrival, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, phone, idCard, company, purpose,
    hostEmployeeId, host.name, 'pending',
    passCode, passCodeValidFrom || null, passCodeValidTo || null,
    allowedDoors ? JSON.stringify(allowedDoors) : null,
    estimatedArrival, new Date().toISOString()
  );

  await db.prepare(`
    INSERT INTO notifications (
      id, employeeId, type, title, content, relatedId, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(), hostEmployeeId, 'visitor_arrival',
    '访客来访通知',
    `您有一位访客等待确认：${name}（${company}），来访目的：${purpose}`,
    id, new Date().toISOString()
  );

  broadcastVisitorUpdate();

  res.json({ success: true, data: { id, passCode }, message: '访客登记成功，已通知被访员工' });
});

router.put('/:id/confirm', authMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const user = req.user!;
  const { passCodeValidFrom, passCodeValidTo, allowedDoors } = req.body;

  const visitor = await db.prepare('SELECT * FROM visitors WHERE id = ?').get(id) as any;

  if (!visitor) {
    return res.status(404).json({ success: false, error: '访客不存在' });
  }

  if (user.role === 'employee' && visitor.hostEmployeeId !== user.id) {
    return res.status(403).json({ success: false, error: '只能确认自己的访客' });
  }

  if (!passCodeValidFrom || !passCodeValidTo) {
    return res.status(400).json({ success: false, error: '请设置通行码有效期' });
  }

  await db.prepare(`
    UPDATE visitors 
    SET status = 'confirmed', passCodeValidFrom = ?, passCodeValidTo = ?, allowedDoors = ?
    WHERE id = ?
  `).run(
    passCodeValidFrom, passCodeValidTo,
    allowedDoors ? JSON.stringify(allowedDoors) : null,
    id
  );

  broadcastVisitorUpdate();

  res.json({ success: true, message: '已确认访客，通行码已生效' });
});

router.put('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const user = req.user!;

  const visitor = await db.prepare('SELECT * FROM visitors WHERE id = ?').get(id) as any;

  if (!visitor) {
    return res.status(404).json({ success: false, error: '访客不存在' });
  }

  if (user.role === 'employee' && visitor.hostEmployeeId !== user.id) {
    return res.status(403).json({ success: false, error: '只能取消自己的访客' });
  }

  await db.prepare("UPDATE visitors SET status = 'cancelled' WHERE id = ?").run(id);
  broadcastVisitorUpdate();

  res.json({ success: true, message: '已取消访客预约' });
});

router.post('/:id/checkin', authMiddleware, requireRole('admin', 'reception'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  const visitor = await db.prepare('SELECT * FROM visitors WHERE id = ?').get(id) as any;

  if (!visitor) {
    return res.status(404).json({ success: false, error: '访客不存在' });
  }

  await db.prepare(`
    UPDATE visitors 
    SET status = 'visited', actualArrival = ?
    WHERE id = ?
  `).run(new Date().toISOString(), id);

  broadcastVisitorUpdate();

  res.json({ success: true, message: '访客已签到' });
});

router.post('/:id/checkout', authMiddleware, requireRole('admin', 'reception'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  const visitor = await db.prepare('SELECT * FROM visitors WHERE id = ?').get(id) as any;

  if (!visitor) {
    return res.status(404).json({ success: false, error: '访客不存在' });
  }

  await db.prepare(`
    UPDATE visitors 
    SET actualDeparture = ?
    WHERE id = ?
  `).run(new Date().toISOString(), id);

  res.json({ success: true, message: '访客已签离' });
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  await db.prepare('DELETE FROM visitors WHERE id = ?').run(id);
  broadcastVisitorUpdate();
  res.json({ success: true, message: '访客记录已删除' });
});

export default router;
