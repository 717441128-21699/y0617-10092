import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { department, search } = req.query;
  
  let sql = 'SELECT id, name, employeeId, department, position, phone, email, role, qrCodeBoundAt, createdAt FROM employees WHERE 1=1';
  const params: string[] = [];

  if (department) {
    sql += ' AND department = ?';
    params.push(department as string);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR employeeId LIKE ? OR phone LIKE ?)';
    const searchStr = `%${search}%`;
    params.push(searchStr, searchStr, searchStr);
  }

  sql += ' ORDER BY department, employeeId';

  const employees = await db.prepare(sql).all(...params);
  res.json({ success: true, data: employees });
});

router.get('/departments', authMiddleware, async (req, res) => {
  const departments = (await db.prepare('SELECT DISTINCT department FROM employees ORDER BY department').all() as any[]).map((row: any) => row.department);
  res.json({ success: true, data: departments });
});

router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  const { name, employeeId, department, position, phone, email, role } = req.body;

  if (!name || !employeeId || !department || !position || !phone || !email) {
    return res.status(400).json({ success: false, error: '请填写完整信息' });
  }

  const existing = await db.prepare('SELECT id FROM employees WHERE employeeId = ?').get(employeeId);
  if (existing) {
    return res.status(400).json({ success: false, error: '工号已存在' });
  }

  const id = uuidv4();
  const password = bcrypt.hashSync('123456', 10);

  await db.prepare(`
    INSERT INTO employees (id, name, employeeId, department, position, phone, email, password, role, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, employeeId, department, position, phone, email, password, role || 'employee', new Date().toISOString());

  res.json({ success: true, data: { id, name, employeeId, department, position, phone, email, role: role || 'employee' }, message: '员工创建成功，初始密码123456' });
});

router.put('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, department, position, phone, email, role } = req.body;

  const existing = await db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: '员工不存在' });
  }

  await db.prepare(`
    UPDATE employees 
    SET name = ?, department = ?, position = ?, phone = ?, email = ?, role = ?
    WHERE id = ?
  `).run(name, department, position, phone, email, role || 'employee', id);

  res.json({ success: true, message: '员工信息更新成功' });
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  if (id === req.user!.id) {
    return res.status(400).json({ success: false, error: '不能删除自己' });
  }

  await db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  res.json({ success: true, message: '员工删除成功' });
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  if (req.user!.role === 'employee' && id !== req.user!.id) {
    return res.status(403).json({ success: false, error: '员工不存在' });
  }

  const employee = await db.prepare('SELECT id, name, employeeId, department, position, phone, email, role, qrCode, qrCodeBoundAt, createdAt FROM employees WHERE id = ?').get(id);
  
  if (!employee) {
    return res.status(404).json({ success: false, error: '员工不存在' });
  }

  res.json({ success: true, data: employee });
});

router.post('/:id/reset-password', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  const existing = await db.prepare('SELECT id, name FROM employees WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: '员工不存在' });
  }

  const newPassword = Math.random().toString(36).substring(2, 10);
  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  await db.prepare('UPDATE employees SET password = ? WHERE id = ?').run(hashedPassword, id);

  res.json({ success: true, data: { password: newPassword }, message: '密码重置成功' });
});

export default router;
