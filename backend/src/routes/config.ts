import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/holidays', authMiddleware, async (req, res) => {
  const { year } = req.query;
  
  let sql = 'SELECT * FROM holidays';
  const params: string[] = [];

  if (year) {
    sql += ' WHERE date LIKE ?';
    params.push(`${year}%`);
  }

  sql += ' ORDER BY date';

  const holidays = await db.prepare(sql).all(...params);
  res.json({ success: true, data: holidays });
});

router.post('/holidays', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { date, name, type, description } = req.body;

  if (!date || !name || !type) {
    return res.status(400).json({ success: false, error: '请填写完整信息' });
  }

  const existing = await db.prepare('SELECT id FROM holidays WHERE date = ?').get(date);
  if (existing) {
    return res.status(400).json({ success: false, error: '该日期已配置' });
  }

  const id = uuidv4();
  await db.prepare(`
    INSERT INTO holidays (id, date, name, type, description, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, date, name, type, description || null, new Date().toISOString());

  res.json({ success: true, data: { id, date, name, type, description }, message: '配置添加成功' });
});

router.put('/holidays/:id', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { date, name, type, description } = req.body;

  const existing = await db.prepare('SELECT id FROM holidays WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: '配置不存在' });
  }

  await db.prepare(`
    UPDATE holidays SET date = ?, name = ?, type = ?, description = ? WHERE id = ?
  `).run(date, name, type, description || null, id);

  res.json({ success: true, message: '配置更新成功' });
});

router.delete('/holidays/:id', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  await db.prepare('DELETE FROM holidays WHERE id = ?').run(id);
  res.json({ success: true, message: '配置删除成功' });
});

router.get('/work-rules', authMiddleware, async (req, res) => {
  const rules = await db.prepare('SELECT * FROM workRules ORDER BY createdAt').all();
  res.json({ success: true, data: rules });
});

router.post('/work-rules', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { name, isFlexible, workStartTime, workEndTime, coreStartTime, coreEndTime, toleranceMinutes, minWorkHours, description } = req.body;

  if (!name || !workStartTime || !workEndTime) {
    return res.status(400).json({ success: false, error: '请填写完整信息' });
  }

  const id = uuidv4();
  await db.prepare(`
    INSERT INTO workRules (id, name, isFlexible, workStartTime, workEndTime, coreStartTime, coreEndTime, toleranceMinutes, minWorkHours, description, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name,
    isFlexible ? 1 : 0,
    workStartTime, workEndTime,
    coreStartTime || null, coreEndTime || null,
    toleranceMinutes || 0,
    minWorkHours || 8,
    description || null,
    new Date().toISOString()
  );

  res.json({ success: true, data: { id, name }, message: '规则添加成功' });
});

router.put('/work-rules/:id', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, isFlexible, workStartTime, workEndTime, coreStartTime, coreEndTime, toleranceMinutes, minWorkHours, description } = req.body;

  const existing = await db.prepare('SELECT id FROM workRules WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: '规则不存在' });
  }

  await db.prepare(`
    UPDATE workRules 
    SET name = ?, isFlexible = ?, workStartTime = ?, workEndTime = ?, coreStartTime = ?, coreEndTime = ?, toleranceMinutes = ?, minWorkHours = ?, description = ?
    WHERE id = ?
  `).run(
    name,
    isFlexible ? 1 : 0,
    workStartTime, workEndTime,
    coreStartTime || null, coreEndTime || null,
    toleranceMinutes || 0,
    minWorkHours || 8,
    description || null,
    id
  );

  res.json({ success: true, message: '规则更新成功' });
});

router.delete('/work-rules/:id', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  const existing = await db.prepare('SELECT id FROM workRules WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: '规则不存在' });
  }

  const employeesWithRule = await db.prepare('SELECT COUNT(*) as count FROM employees WHERE workRuleId = ?').get(id) as any;
  if (employeesWithRule && employeesWithRule.count > 0) {
    return res.status(400).json({ success: false, error: `该规则下有 ${employeesWithRule.count} 名员工关联，无法删除` });
  }

  await db.prepare('DELETE FROM workRules WHERE id = ?').run(id);
  res.json({ success: true, message: '规则删除成功' });
});

router.get('/work-rules/my', authMiddleware, async (req: AuthRequest, res) => {
  const employeeId = req.user!.id;
  
  const employee = await db.prepare('SELECT workRuleId, department FROM employees WHERE id = ?').get(employeeId) as any;
  if (!employee) {
    return res.json({ success: true, data: null });
  }

  let rule = null;
  if (employee.workRuleId) {
    rule = await db.prepare('SELECT * FROM workRules WHERE id = ?').get(employee.workRuleId);
  }
  
  if (!rule) {
    const allRules = await db.prepare('SELECT * FROM workRules ORDER BY createdAt LIMIT 1').all();
    rule = allRules[0] || null;
  }

  res.json({ success: true, data: rule });
});

export default router;
