import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './database';
import { initWebSocket } from './websocket';

import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import visitorRoutes from './routes/visitors';
import accessRoutes from './routes/access';
import attendanceRoutes from './routes/attendance';
import configRoutes from './routes/config';
import notificationRoutes from './routes/notifications';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

(async () => {
  await initDatabase();
  initWebSocket(server);
})();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/config', configRoutes);
app.use('/api/notifications', notificationRoutes);

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/ws')) {
    return;
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

server.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 WebSocket 运行在 ws://localhost:${PORT}/ws`);
});
