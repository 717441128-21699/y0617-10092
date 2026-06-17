import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database';

const JWT_SECRET = 'access-control-secret-key-2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    employeeId: string;
    name: string;
    role: string;
    department: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const employee = db.prepare('SELECT id, employeeId, name, role, department FROM employees WHERE id = ?').get(decoded.id);
    
    if (!employee) {
      return res.status(401).json({ success: false, error: '用户不存在' });
    }

    req.user = employee as any;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: '认证令牌无效' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: '权限不足' });
    }
    next();
  };
}

export function generateToken(user: { id: string }) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
}
