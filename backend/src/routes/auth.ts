import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import qrcode from 'qrcode';

const router = Router();

router.post('/login', async (req, res) => {
  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    return res.status(400).json({ success: false, error: '请输入工号和密码' });
  }

  const employee = await db.prepare('SELECT * FROM employees WHERE employeeId = ?').get(employeeId) as any;

  if (!employee) {
    return res.status(401).json({ success: false, error: '工号或密码错误' });
  }

  const isValid = bcrypt.compareSync(password, employee.password);
  if (!isValid) {
    return res.status(401).json({ success: false, error: '工号或密码错误' });
  }

  const token = generateToken({ id: employee.id });

  const { password: _, ...userWithoutPassword } = employee;

  res.json({
    success: true,
    data: {
      token,
      user: userWithoutPassword,
      role: employee.role,
    },
  });
});

router.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  const employee = await db.prepare('SELECT id, name, employeeId, department, position, phone, email, qrCode, qrCodeBoundAt, role, createdAt FROM employees WHERE id = ?').get(req.user!.id) as any;
  
  res.json({ success: true, data: employee });
});

router.post('/bind-qrcode', authMiddleware, async (req: AuthRequest, res) => {
  const employeeId = req.user!.id;
  const qrCodeData = `EMP-${employeeId}-${Date.now()}`;

  try {
    const qrCodeUrl = await qrcode.toDataURL(qrCodeData);

    await db.prepare(`
      UPDATE employees 
      SET qrCode = ?, qrCodeBoundAt = ?
      WHERE id = ?
    `).run(qrCodeData, new Date().toISOString(), employeeId);

    res.json({
      success: true,
      data: { qrCode: qrCodeData, qrCodeUrl, qrCodeBoundAt: new Date().toISOString() },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '二维码生成失败' });
  }
});

router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  const { oldPassword, newPassword } = req.body;
  const employeeId = req.user!.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: '请输入旧密码和新密码' });
  }

  const employee = await db.prepare('SELECT password FROM employees WHERE id = ?').get(employeeId) as any;
  
  if (!bcrypt.compareSync(oldPassword, employee.password)) {
    return res.status(401).json({ success: false, error: '旧密码错误' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  await db.prepare('UPDATE employees SET password = ? WHERE id = ?').run(hashedPassword, employeeId);

  res.json({ success: true, message: '密码修改成功' });
});

export default router;
