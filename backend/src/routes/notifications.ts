import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const employeeId = req.user!.id;
  const { unread, page = 1, pageSize = 20 } = req.query;

  let sql = 'SELECT * FROM notifications WHERE employeeId = ?';
  const params: string[] = [employeeId];

  if (unread === 'true') {
    sql += ' AND read = 0';
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = (await db.prepare(countSql).get(...params) as any).count;

  sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  const notifications = await db.prepare(sql).all(...params, Number(pageSize), (Number(page) - 1) * Number(pageSize));

  res.json({
    success: true,
    data: {
      notifications,
      total,
      unreadCount: (await db.prepare('SELECT COUNT(*) as count FROM notifications WHERE employeeId = ? AND read = 0').get(employeeId) as any).count,
      page: Number(page),
      pageSize: Number(pageSize),
    },
  });
});

router.put('/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const employeeId = req.user!.id;

  const notification = await db.prepare('SELECT * FROM notifications WHERE id = ? AND employeeId = ?').get(id, employeeId);
  
  if (!notification) {
    return res.status(404).json({ success: false, error: '通知不存在' });
  }

  await db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  res.json({ success: true, message: '已标记为已读' });
});

router.put('/read-all', authMiddleware, async (req: AuthRequest, res) => {
  const employeeId = req.user!.id;
  await db.prepare('UPDATE notifications SET read = 1 WHERE employeeId = ? AND read = 0').run(employeeId);
  res.json({ success: true, message: '已全部标记为已读' });
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const employeeId = req.user!.id;

  const notification = await db.prepare('SELECT * FROM notifications WHERE id = ? AND employeeId = ?').get(id, employeeId);
  
  if (!notification) {
    return res.status(404).json({ success: false, error: '通知不存在' });
  }

  await db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
  res.json({ success: true, message: '已删除通知' });
});

export default router;
