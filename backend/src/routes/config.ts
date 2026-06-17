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
  const { date, name, type } = req.body;

  if (!date || !name || !type) {
    return res.status(400).json({ success: false, error: '请填写完整信息' });
  }

  const existing = await db.prepare('SELECT id FROM holidays WHERE date = ?').get(date);
  if (existing) {
    return res.status(400).json({ success: false, error: '该日期已配置' });
  }

  const id = uuidv4();
  await db.prepare(`
    INSERT INTO holidays (id, date, name, type, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, date, name, type, new Date().toISOString());

  res.json({ success: true, data: { id, date, name, type }, message: '配置添加成功' });
});

router.put('/holidays/:id', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { date, name, type } = req.body;

  const existing = await db.prepare('SELECT id FROM holidays WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: '配置不存在' });
  }

  await db.prepare(`
    UPDATE holidays SET date = ?, name = ?, type = ? WHERE id = ?
  `).run(date, name, type, id);

  res.json({ success: true, message: '配置更新成功' });
});

router.delete('/holidays/:id', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  await db.prepare('DELETE FROM holidays WHERE id = ?').run(id);
  res.json({ success: true, message: '配置删除成功' });
});

router.get('/work-rules', authMiddleware, async (req, res) => {
  const rules = await db.prepare('SELECT * FROM workRules ORDER BY isDefault DESC, createdAt').all();
  res.json({ success: true, data: rules });
});

router.post('/work-rules', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { name, department, workStartTime, workEndTime, flexibleMinutes, isDefault } = req.body;

  if (!name || !workStartTime || !workEndTime) {
    return res.status(400).json({ success: false, error: '请填写完整信息' });
  }

  if (department) {
    const existing = await db.prepare('SELECT id FROM workRules WHERE department = ?').get(department);
    if (existing) {
      return res.status(400).json({ success: false, error: '该部门已配置工时规则' });
    }
  }

  if (isDefault) {
    await db.prepare('UPDATE workRules SET isDefault = 0 WHERE isDefault = 1').run();
  }

  const id = uuidv4();
  await db.prepare(`
    INSERT INTO workRules (id, name, department, workStartTime, workEndTime, flexibleMinutes, isDefault, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, department || null, workStartTime, workEndTime, flexibleMinutes || 0, isDefault ? 1 : 0, new Date().toISOString());

  res.json({ success: true, data: { id, name, department, workStartTime, workEndTime, flexibleMinutes, isDefault }, message: '规则添加成功' });
});

router.put('/work-rules/:id', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, department, workStartTime, workEndTime, flexibleMinutes, isDefault } = req.body;

  const existing = await db.prepare('SELECT id FROM workRules WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: '规则不存在' });
  }

  if (isDefault) {
    await db.prepare('UPDATE workRules SET isDefault = 0 WHERE isDefault = 1 AND id != ?').run(id);
  }

  await db.prepare(`
    UPDATE workRules 
    SET name = ?, department = ?, workStartTime = ?, workEndTime = ?, flexibleMinutes = ?, isDefault = ?
    WHERE id = ?
  `).run(name, department || null, workStartTime, workEndTime, flexibleMinutes || 0, isDefault ? 1 : 0, id);

  res.json({ success: true, message: '规则更新成功' });
});

router.delete('/work-rules/:id', authMiddleware, requireRole('admin', 'hr'), async (req: AuthRequest, res) => {
  const { id } = req.params;

  const rule = await db.prepare('SELECT isDefault FROM workRules WHERE id = ?').get(id) as any;
  if (rule && rule.isDefault) {
    return res.status(400).json({ success: false, error: '不能删除默认规则' });
  }

  await db.prepare('DELETE FROM workRules WHERE id = ?').run(id);
  res.json({ success: true, message: '规则删除成功' });
});

router.get('/work-rules/my', authMiddleware, async (req: AuthRequest, res) => {
  const department = req.user!.department;
  
  let rule = await db.prepare('SELECT * FROM workRules WHERE department = ?').get(department);
  
  if (!rule) {
    rule = await db.prepare('SELECT * FROM workRules WHERE isDefault = 1').get();
  }

  res.json({ success: true, data: rule });
});

export default router;
