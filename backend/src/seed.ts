import db from './database';
import { initDatabase } from './database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  await initDatabase();

  const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

  const employees = [
    {
      id: uuidv4(),
      name: '张三',
      employeeId: 'EMP001',
      department: 'tech',
      position: '高级工程师',
      phone: '13800138001',
      email: 'zhangsan@company.com',
      password: hashPassword('123456'),
      role: 'admin',
      workRuleId: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: '李四',
      employeeId: 'EMP002',
      department: 'hr',
      position: 'HR专员',
      phone: '13800138002',
      email: 'lisi@company.com',
      password: hashPassword('123456'),
      role: 'hr',
      workRuleId: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: '王五',
      employeeId: 'EMP003',
      department: 'admin',
      position: '前台接待',
      phone: '13800138003',
      email: 'wangwu@company.com',
      password: hashPassword('123456'),
      role: 'reception',
      workRuleId: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: '赵六',
      employeeId: 'EMP004',
      department: 'tech',
      position: '前端工程师',
      phone: '13800138004',
      email: 'zhaoliu@company.com',
      password: hashPassword('123456'),
      role: 'employee',
      workRuleId: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: '钱七',
      employeeId: 'EMP005',
      department: 'marketing',
      position: '市场经理',
      phone: '13800138005',
      email: 'qianqi@company.com',
      password: hashPassword('123456'),
      role: 'employee',
      workRuleId: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: '孙八',
      employeeId: 'EMP006',
      department: 'finance',
      position: '会计',
      phone: '13800138006',
      email: 'sunba@company.com',
      password: hashPassword('123456'),
      role: 'employee',
      workRuleId: null,
      createdAt: new Date().toISOString(),
    },
  ];

  const insertEmployee = db.prepare(`
    INSERT INTO employees (id, name, employeeId, department, position, phone, email, password, role, workRuleId, createdAt)
    VALUES (@id, @name, @employeeId, @department, @position, @phone, @email, @password, @role, @workRuleId, @createdAt)
  `);

  try {
    for (const emp of employees) {
      await insertEmployee.run(emp);
    }
    console.log('员工数据插入成功');
  } catch (e) {
    console.log('员工数据可能已存在');
  }

  const doors = [
    { id: uuidv4(), name: '正门', location: '1楼大厅', createdAt: new Date().toISOString() },
    { id: uuidv4(), name: '侧门', location: '1楼侧厅', createdAt: new Date().toISOString() },
    { id: uuidv4(), name: '技术部入口', location: '3楼东侧', createdAt: new Date().toISOString() },
    { id: uuidv4(), name: '财务部入口', location: '5楼西侧', createdAt: new Date().toISOString() },
    { id: uuidv4(), name: '会议室A', location: '2楼', createdAt: new Date().toISOString() },
  ];

  const insertDoor = db.prepare(`
    INSERT INTO doors (id, name, location, createdAt)
    VALUES (@id, @name, @location, @createdAt)
  `);

  try {
    for (const door of doors) {
      await insertDoor.run(door);
    }
    console.log('门禁数据插入成功');
  } catch (e) {
    console.log('门禁数据可能已存在');
  }

  const standardRuleId = uuidv4();
  const flexibleRuleId = uuidv4();

  const workRules = [
    {
      id: standardRuleId,
      name: '标准工时',
      isFlexible: 0,
      workStartTime: '09:00',
      workEndTime: '18:00',
      coreStartTime: null,
      coreEndTime: null,
      toleranceMinutes: 10,
      minWorkHours: 8,
      description: '标准固定工作时间，朝九晚六',
      createdAt: new Date().toISOString(),
    },
    {
      id: flexibleRuleId,
      name: '技术部弹性工时',
      isFlexible: 1,
      workStartTime: '09:00',
      workEndTime: '18:00',
      coreStartTime: '10:00',
      coreEndTime: '16:00',
      toleranceMinutes: 60,
      minWorkHours: 8,
      description: '弹性工作时间，核心工作时间10:00-16:00必须在岗',
      createdAt: new Date().toISOString(),
    },
  ];

  const insertWorkRule = db.prepare(`
    INSERT INTO workRules (id, name, isFlexible, workStartTime, workEndTime, coreStartTime, coreEndTime, toleranceMinutes, minWorkHours, description, createdAt)
    VALUES (@id, @name, @isFlexible, @workStartTime, @workEndTime, @coreStartTime, @coreEndTime, @toleranceMinutes, @minWorkHours, @description, @createdAt)
  `);

  try {
    for (const rule of workRules) {
      await insertWorkRule.run(rule);
    }
    console.log('工作规则数据插入成功');
  } catch (e) {
    console.log('工作规则数据可能已存在');
  }

  const today = new Date();
  const holidays = [
    { id: uuidv4(), date: '2026-01-01', name: '元旦', type: 'holiday', description: '新年第一天', createdAt: new Date().toISOString() },
    { id: uuidv4(), date: '2026-02-16', name: '春节', type: 'holiday', description: '农历新年', createdAt: new Date().toISOString() },
    { id: uuidv4(), date: '2026-02-17', name: '春节', type: 'holiday', description: '农历新年', createdAt: new Date().toISOString() },
    { id: uuidv4(), date: '2026-02-18', name: '春节', type: 'holiday', description: '农历新年', createdAt: new Date().toISOString() },
    { id: uuidv4(), date: '2026-04-06', name: '清明节', type: 'holiday', description: '传统节日', createdAt: new Date().toISOString() },
    { id: uuidv4(), date: '2026-05-01', name: '劳动节', type: 'holiday', description: '国际劳动节', createdAt: new Date().toISOString() },
    { id: uuidv4(), date: '2026-06-19', name: '端午节', type: 'holiday', description: '传统节日', createdAt: new Date().toISOString() },
    { id: uuidv4(), date: '2026-10-01', name: '国庆节', type: 'holiday', description: '国庆假期', createdAt: new Date().toISOString() },
    { id: uuidv4(), date: '2026-10-02', name: '国庆节', type: 'holiday', description: '国庆假期', createdAt: new Date().toISOString() },
    { id: uuidv4(), date: '2026-10-03', name: '国庆节', type: 'holiday', description: '国庆假期', createdAt: new Date().toISOString() },
  ];

  const insertHoliday = db.prepare(`
    INSERT INTO holidays (id, date, name, type, description, createdAt)
    VALUES (@id, @date, @name, @type, @description, @createdAt)
  `);

  try {
    for (const hol of holidays) {
      await insertHoliday.run(hol);
    }
    console.log('节假日数据插入成功');
  } catch (e) {
    console.log('节假日数据可能已存在');
  }

  console.log('数据初始化完成！');
  console.log('测试账号：');
  console.log('  管理员: EMP001 / 123456');
  console.log('  HR: EMP002 / 123456');
  console.log('  前台: EMP003 / 123456');
  console.log('  员工: EMP004 / 123456');
}

(async () => {
  await seed();
})();
