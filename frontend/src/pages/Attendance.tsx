import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  DatePicker,
  Select,
  Form,
  Button,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Modal,
  message,
} from 'antd';
import { DownloadOutlined, ReloadOutlined, CalendarOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Attendance as AttendanceType, attendanceStatusMap, departmentMap } from '../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [attendances, setAttendances] = useState<AttendanceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30, total: 0 });
  const [statistics, setStatistics] = useState<any>({});
  const [recalculateModal, setRecalculateModal] = useState(false);
  const [recalculateForm] = Form.useForm();
  const [recalcLoading, setRecalcLoading] = useState(false);

  const isEmployee = user?.role === 'employee';

  const fetchData = async (values?: any) => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...values,
      };

      const response = isEmployee
        ? await api.attendance.getMy(params)
        : await api.attendance.getAll(params);

      if (response.data.success) {
        setAttendances(response.data.data?.records || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data.data?.total || 0,
        }));
      }

      if (!isEmployee) {
        const statsRes = await api.attendance.getStatistics({
          startDate: values?.startDate,
          endDate: values?.endDate,
          department: values?.department,
        });
        if (statsRes.data.success) {
          setStatistics(statsRes.data.data?.overall || {});
        }
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize, isEmployee]);

  const handleSearch = (values: any) => {
    const formattedValues = {
      ...values,
      startDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
      date: values.date?.format('YYYY-MM-DD'),
    };
    delete formattedValues.dateRange;
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchData(formattedValues);
  };

  const handleExport = async () => {
    try {
      const now = dayjs();
      const response = await api.attendance.exportMonthly({
        year: now.year(),
        month: now.month() + 1,
        department: form.getFieldValue('department'),
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `考勤报表_${now.format('YYYYMM')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error: any) {
      message.error(error.message || '导出失败');
    }
  };

  const handleRecalculate = async (values: any) => {
    setRecalcLoading(true);
    try {
      const monthStr = values.month.format('YYYY-MM');
      const response = await api.attendance.recalculate(monthStr);
      if (response.data.success) {
        message.success(response.data.message);
        setRecalculateModal(false);
        recalculateForm.resetFields();
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || '重新计算失败');
    } finally {
      setRecalcLoading(false);
    }
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => {
        const d = dayjs(date);
        return (
          <div>
            <div>{d.format('YYYY-MM-DD')}</div>
            <div style={{ color: '#999', fontSize: 12 }}>
              {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.day()]}
            </div>
          </div>
        );
      },
    },
    ...(isEmployee
      ? []
      : [
          {
            title: '部门',
            dataIndex: 'department',
            key: 'department',
            width: 120,
          },
          {
            title: '姓名',
            dataIndex: 'employeeName',
            key: 'employeeName',
            width: 100,
          },
        ]),
    {
      title: '上班时间',
      dataIndex: 'checkIn',
      key: 'checkIn',
      width: 120,
      render: (time: string | null) => (time ? dayjs(time).format('HH:mm:ss') : '-'),
    },
    {
      title: '下班时间',
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
      render: (hours: number | null) => (hours !== null ? `${hours} 小时` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const info = attendanceStatusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color as any}>{info.text}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Card title="考勤查询" className="dashboard-card" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          {!isEmployee && (
            <Form.Item name="department" label="部门">
              <Select placeholder="全部部门" allowClear style={{ width: 150 }}>
                <Option value="技术部">技术部</Option>
                <Option value="人事部">人事部</Option>
                <Option value="行政部">行政部</Option>
                <Option value="市场部">市场部</Option>
                <Option value="财务部">财务部</Option>
              </Select>
            </Form.Item>
          )}
          <Form.Item name="date" label="日期">
            <DatePicker placeholder="选择日期" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="dateRange" label="日期范围">
            <RangePicker style={{ width: 280 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<CalendarOutlined />}>
                查询
              </Button>
              {!isEmployee && (
                <Button onClick={handleExport} icon={<DownloadOutlined />}>
                  导出报表
                </Button>
              )}
              {!isEmployee && (
                <Button
                  onClick={() => setRecalculateModal(true)}
                  icon={<ReloadOutlined />}
                >
                  重新计算
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {!isEmployee && statistics.totalDays !== undefined && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="总考勤记录" value={statistics.totalDays || 0} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="正常出勤"
                value={statistics.normalDays || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="迟到/早退"
                value={(statistics.lateDays || 0) + (statistics.earlyLeaveDays || 0)}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="旷工/漏打卡"
                value={(statistics.absentDays || 0) + (statistics.missingDays || 0)}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card className="dashboard-card">
        <Table
          columns={columns}
          dataSource={attendances}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) =>
              setPagination((prev) => ({ ...prev, current: page, pageSize })),
          }}
        />
      </Card>

      <Modal
        title="重新计算考勤"
        open={recalculateModal}
        onCancel={() => setRecalculateModal(false)}
        footer={null}
      >
        <Form form={recalculateForm} layout="vertical" onFinish={handleRecalculate}>
          <Form.Item
            name="month"
            label="选择月份"
            rules={[{ required: true, message: '请选择月份' }]}
          >
            <DatePicker picker="month" style={{ width: '100%' }} placeholder="请选择月份" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={recalcLoading}>
                确认重新计算
              </Button>
              <Button onClick={() => setRecalculateModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Attendance;
