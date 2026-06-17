import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Select, Button, Table, Tag, message, Space } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../api/client';
import { Attendance, attendanceStatusMap, departmentMap } from '../types';
import dayjs from 'dayjs';

const { MonthPicker } = DatePicker;
const { Option } = Select;

const HRDashboard: React.FC = () => {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [department, setDepartment] = useState<string | undefined>();
  const [stats, setStats] = useState<any>(null);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);

  const COLORS = ['#68d391', '#f6ad55', '#fc8181', '#a0aec0', '#4fd1c5'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, deptRes] = await Promise.all([
        api.attendance.getStats({ month, department }),
        api.employees.getDepartments(),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (deptRes.data.success) {
        setDepartments(deptRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await api.attendance.getAll({ month, department });
      if (response.data.success) {
        setRecords(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchRecords();
  }, [month, department]);

  const handleExport = async () => {
    try {
      const response = await api.attendance.exportExcel({ month, department });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `考勤报表_${month}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('导出成功');
    } catch (error: any) {
      message.error(error.message || '导出失败');
    }
  };

  const handleRecalculate = async () => {
    try {
      const response = await api.attendance.recalculate(month);
      if (response.data.success) {
        message.success(response.data.message || '重新计算成功');
        fetchData();
        fetchRecords();
      }
    } catch (error: any) {
      message.error(error.message || '重新计算失败');
    }
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '员工姓名',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 100,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120,
      render: (dept: string) => departmentMap[dept] || dept,
    },
    {
      title: '上班打卡',
      dataIndex: 'checkIn',
      key: 'checkIn',
      width: 120,
      render: (time: string | null) => (time ? dayjs(time).format('HH:mm:ss') : '-'),
    },
    {
      title: '下班打卡',
      dataIndex: 'checkOut',
      key: 'checkOut',
      width: 120,
      render: (time: string | null) => (time ? dayjs(time).format('HH:mm:ss') : '-'),
    },
    {
      title: '工作时长',
      dataIndex: 'workHours',
      key: 'workHours',
      width: 100,
      render: (hours: number | null) => (hours !== null ? `${hours.toFixed(1)}h` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = attendanceStatusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color as any}>{info.text}</Tag>;
      },
    },
  ];

  const pieData = stats
    ? [
        { name: '正常', value: stats.byStatus?.normal || 0 },
        { name: '迟到', value: stats.byStatus?.late || 0 },
        { name: '早退', value: stats.byStatus?.early || 0 },
        { name: '旷工', value: stats.byStatus?.absent || 0 },
        { name: '周末/节假日', value: stats.byStatus?.weekend || 0 },
      ]
    : [];

  return (
    <div>
      <Card className="dashboard-card">
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }} align="middle">
          <Col>
            <span style={{ marginRight: 8 }}>月份：</span>
            <MonthPicker
              value={dayjs(month)}
              onChange={(date) => date && setMonth(date.format('YYYY-MM'))}
              allowClear={false}
            />
          </Col>
          <Col>
            <span style={{ marginRight: 8 }}>部门：</span>
            <Select
              style={{ width: 150 }}
              value={department}
              onChange={setDepartment}
              allowClear
              placeholder="全部部门"
            >
              {departments.map((dept) => (
                <Option key={dept} value={dept}>
                  {departmentMap[dept] || dept}
                </Option>
              ))}
            </Select>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRecalculate}>
                重新计算
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                导出报表
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card className="stat-card">
              <Statistic
                title={<span style={{ color: '#a0aec0' }}>总出勤天数</span>}
                value={stats?.totalDays || 0}
                prefix={<TeamOutlined style={{ color: '#00d4ff' }} />}
                valueStyle={{ color: '#00d4ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card">
              <Statistic
                title={<span style={{ color: '#a0aec0' }}>正常出勤</span>}
                value={stats?.byStatus?.normal || 0}
                prefix={<CheckCircleOutlined style={{ color: '#68d391' }} />}
                valueStyle={{ color: '#68d391' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card">
              <Statistic
                title={<span style={{ color: '#a0aec0' }}>异常次数</span>}
                value={(stats?.byStatus?.late || 0) + (stats?.byStatus?.early || 0) + (stats?.byStatus?.absent || 0)}
                prefix={<WarningOutlined style={{ color: '#f6ad55' }} />}
                valueStyle={{ color: '#f6ad55' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card">
              <Statistic
                title={<span style={{ color: '#a0aec0' }}>出勤率</span>}
                value={stats?.totalDays ? ((stats.byStatus?.normal || 0) / stats.totalDays * 100).toFixed(1) : 0}
                suffix="%"
                prefix={<UserOutlined style={{ color: '#63b3ed' }} />}
                valueStyle={{ color: '#63b3ed' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Card title="考勤状态分布" className="dashboard-card">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="部门出勤统计" className="dashboard-card">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.byDepartment || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="department" tick={{ fill: '#a0aec0' }} />
                  <YAxis tick={{ fill: '#a0aec0' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#2d3748', border: 'none', color: 'white' }}
                  />
                  <Legend />
                  <Bar dataKey="normal" name="正常" fill="#68d391" />
                  <Bar dataKey="late" name="迟到" fill="#f6ad55" />
                  <Bar dataKey="early" name="早退" fill="#fc8181" />
                  <Bar dataKey="absent" name="旷工" fill="#a0aec0" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title="考勤明细" className="dashboard-card" style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default HRDashboard;
