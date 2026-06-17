import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

const dbPath = path.join(__dirname, '..', 'access-control.db');

class Database {
  private db: sqlite3.Database;

  constructor(filePath: string) {
    this.db = new sqlite3.Database(filePath);
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err: Error | null) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    return {
      run: async (...params: any[]) => {
        return new Promise((resolve, reject) => {
          stmt.run(...params, function (this: { lastID: number; changes: number }, err: Error | null) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      },
      get: async (...params: any[]) => {
        return new Promise((resolve, reject) => {
          stmt.get(...params, (err: Error | null, row: any) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      all: async (...params: any[]) => {
        return new Promise((resolve, reject) => {
          stmt.all(...params, (err: Error | null, rows: any[]) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      },
    };
  }

  async pragma(setting: string): Promise<void> {
    await this.run(`PRAGMA ${setting}`);
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

const db = new Database(dbPath);

export async function initDatabase() {
  await db.pragma('journal_mode = WAL');
  await db.pragma('foreign_keys = ON');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      employeeId TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      position TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      qrCode TEXT,
      qrCodeBoundAt TEXT,
      workRuleId TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS doors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      idCard TEXT NOT NULL,
      company TEXT NOT NULL,
      purpose TEXT NOT NULL,
      hostEmployeeId TEXT NOT NULL,
      hostName TEXT NOT NULL,
      hostDepartment TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      passCode TEXT,
      passCodeValidFrom TEXT,
      passCodeValidTo TEXT,
      allowedDoors TEXT,
      estimatedArrival TEXT NOT NULL,
      actualArrival TEXT,
      actualDeparture TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (hostEmployeeId) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS accessRecords (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userType TEXT NOT NULL,
      userName TEXT NOT NULL,
      doorId TEXT NOT NULL,
      doorName TEXT NOT NULL,
      direction TEXT NOT NULL,
      accessTime TEXT NOT NULL,
      success INTEGER NOT NULL,
      reason TEXT,
      FOREIGN KEY (doorId) REFERENCES doors(id)
    );

    CREATE TABLE IF NOT EXISTS attendances (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      employeeName TEXT NOT NULL,
      department TEXT NOT NULL,
      date TEXT NOT NULL,
      checkIn TEXT,
      checkOut TEXT,
      status TEXT NOT NULL DEFAULT 'absent',
      workHours REAL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      UNIQUE(employeeId, date)
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workRules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isFlexible INTEGER NOT NULL DEFAULT 0,
      workStartTime TEXT NOT NULL,
      workEndTime TEXT NOT NULL,
      coreStartTime TEXT,
      coreEndTime TEXT,
      toleranceMinutes INTEGER NOT NULL DEFAULT 0,
      minWorkHours REAL NOT NULL DEFAULT 8,
      description TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      readAt TEXT,
      createdAt TEXT NOT NULL,
      relatedId TEXT,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    );

    CREATE INDEX IF NOT EXISTS idx_accessRecords_user ON accessRecords(userId, userType);
    CREATE INDEX IF NOT EXISTS idx_accessRecords_time ON accessRecords(accessTime);
    CREATE INDEX IF NOT EXISTS idx_attendances_employee_date ON attendances(employeeId, date);
    CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
    CREATE INDEX IF NOT EXISTS idx_visitors_date ON visitors(estimatedArrival);
    CREATE INDEX IF NOT EXISTS idx_visitors_host ON visitors(hostEmployeeId);
    CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employeeId, read);
  `);
}

export default db;
