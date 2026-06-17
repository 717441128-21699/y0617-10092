import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Popconfirm,
  Checkbox,
  Row,
  Col,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  LoginOutlined,
  LogoutOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { api } from '../api/client';
import { Visitor, Employee, visitorStatusMap, Door } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const Visitors: React.FC = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [doors, setDoors] = useState<Door[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [addForm] = Form.useForm();
  const [confirmForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitorsRes, employeesRes, doorsRes] = await Promise.all([
        api.visitors.getAll(),
        api.employees.getAll(),
        api.access.getDoors(),
      ]);

      if (visitorsRes.data.success) {
        setVisitors(visitorsRes.data.data || []);
      }
      if (employeesRes.data.success) {
        setEmployees(employeesRes.data.data || []);
      }
      if (doorsRes.data.success) {
        setDoors(doorsRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (values: any) => {
    try {
      const data = {
        ...values,
        estimatedArrival: values.estimatedArrival.toISOString(),
      };
      const response = await api.visitors.create(data);
      if (response.data.success) {
        message.success(response.data.message || '登记成功');
        setAddModal(false);
        addForm.resetFields();
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || '登记失败');
    }
  };

  const handleConfirm = async (values: any) => {
    if (!selectedVisitor) return;
    try {
      const data = {
        passCodeValidFrom: values.validTime[0].toISOString(),
        passCodeValidTo: values.validTime[1].toISOString(),
        allowedDoors: values.allowedDoors,
      };
      const response = await api.visitors.confirm(selectedVisitor.id, data);
      if (response.data.success) {
        message.success(response.data.message || '确认成功');
        setConfirmModal(false);
        confirmForm.resetFields();
        setSelectedVisitor(null);
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || '确认失败');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const response = await api.visitors.cancel(id);
      if (response.data.success) {
        message.success(response.data.message || '取消成功');
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || '取消失败');
    }
  };

  const handleCheckin = async (id: string) => {
    try {
      const response = await api.visitors.checkin(id);
      if (response.data.success) {
        message.success(response.data.message || '签到成功');
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || '签到失败');
    }
  };

  const handleCheckout = async (id: string) => {
    try {
      const response = await api.visitors.checkout(id);
      if (response.data.success) {
        message.success(response.data.message || '签离成功');
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || '签离失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await api.visitors.delete(id);
      if (response.data.success) {
        message.success(response.data.message || '删除成功');
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const openConfirmModal = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    confirmForm.setFieldsValue({
      validTime: [dayjs().add(1, 'hour'), dayjs().add(4, 'hour')],
      allowedDoors: doors.slice(0, 2).map((d) => d.id),
    });
    setConfirmModal(true);
  };

  const openDetailModal = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setDetailModal(true);
  };

  const columns = [
    {
      title: '访客姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
      width: 150,
    },
    {
      title: '来访目的',
      dataIndex: 'purpose',
      key: 'purpose',
      width: 120,
    },
    {
      title: '被访人',
      key: 'host',
      width: 120,
      render: (_: any, record: Visitor) => (
        <div>
          <div>{record.hostName}</div>
          <div style={{ color: '#999', fontSize: 12 }}>{record.hostDepartment}</div>
        </div>
      ),
    },
    {
      title: '预约时间',
      dataIndex: 'estimatedArrival',
      key: 'estimatedArrival',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const info = visitorStatusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color as any}>{info.text}</Tag>;
      },
    },
    {
      title: '通行码',
      dataIndex: 'passCode',
      key: 'passCode',
      width: 140,
      render: (code: string | null, record: Visitor) =>
        code && record.status === 'confirmed' ? (
          <Tag color="blue" style={{ fontSize: 12, fontFamily: 'monospace' }}>
            {code}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: any, record: Visitor) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetailModal(record)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => openConfirmModal(record)}>
              确认
            </Button>
          )}
          {record.status === 'pending' && (
            <Popconfirm title="确定取消该访客预约？" onConfirm={() => handleCancel(record.id)}>
              <Button size="small" danger icon={<CloseOutlined />}>
                取消
              </Button>
            </Popconfirm>
          )}
          {record.status === 'confirmed' && !record.actualArrival && (
            <Button size="small" type="primary" icon={<LoginOutlined />} onClick={() => handleCheckin(record.id)}>
              签到
            </Button>
          )}
          {record.status === 'visited' && !record.actualDeparture && (
            <Button size="small" icon={<LogoutOutlined />} onClick={() => handleCheckout(record.id)}>
              签离
            </Button>
          )}
          <Popconfirm title="确定删除该访客记录？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="访客管理"
        className="dashboard-card"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModal(true)}>
            登记访客
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={visitors}
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

      <Modal
        title="登记访客"
        open={addModal}
        onCancel={() => setAddModal(false)}
        footer={null}
        width={600}
      >
        <Form form={addForm} layout="vertical" onFinish={handleAdd}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="访客姓名"
                rules={[{ required: true, message: '请输入访客姓名' }]}
              >
                <Input placeholder="请输入访客姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="手机号"
                rules={[{ required: true, message: '请输入手机号' }]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="idCard"
                label="身份证号"
                rules={[{ required: true, message: '请输入身份证号' }]}
              >
                <Input placeholder="请输入身份证号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="company"
                label="公司"
                rules={[{ required: true, message: '请输入公司名称' }]}
              >
                <Input placeholder="请输入公司名称" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="purpose"
            label="来访目的"
            rules={[{ required: true, message: '请输入来访目的' }]}
          >
            <Input placeholder="请输入来访目的" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="hostEmployeeId"
                label="被访员工"
                rules={[{ required: true, message: '请选择被访员工' }]}
              >
                <Select placeholder="请选择被访员工" showSearch optionFilterProp="children">
                  {employees.map((emp) => (
                    <Option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.department}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="estimatedArrival"
                label="预计到达时间"
                rules={[{ required: true, message: '请选择预计到达时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                登记
              </Button>
              <Button onClick={() => setAddModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="确认访客并生成通行码"
        open={confirmModal}
        onCancel={() => {
          setConfirmModal(false);
          setSelectedVisitor(null);
        }}
        footer={null}
        width={600}
      >
        {selectedVisitor && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>访客：</strong>{selectedVisitor.name}（{selectedVisitor.company}）</p>
            <p><strong>来访目的：</strong>{selectedVisitor.purpose}</p>
            <p><strong>被访人：</strong>{selectedVisitor.hostName}</p>
          </div>
        )}
        <Form form={confirmForm} layout="vertical" onFinish={handleConfirm}>
          <Form.Item
            name="validTime"
            label="通行码有效期"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="allowedDoors"
            label="可通行门禁"
            rules={[{ required: true, message: '请选择可通行门禁' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Row>
                {doors.map((door) => (
                  <Col span={12} key={door.id}>
                    <Checkbox value={door.id}>
                      {door.name} - {door.location}
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认并生成通行码
              </Button>
              <Button
                onClick={() => {
                  setConfirmModal(false);
                  setSelectedVisitor(null);
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="访客详情"
        open={detailModal}
        onCancel={() => {
          setDetailModal(false);
          setSelectedVisitor(null);
        }}
        footer={null}
      >
        {selectedVisitor && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="访客姓名">{selectedVisitor.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{selectedVisitor.phone}</Descriptions.Item>
            <Descriptions.Item label="身份证号">{selectedVisitor.idCard}</Descriptions.Item>
            <Descriptions.Item label="公司">{selectedVisitor.company}</Descriptions.Item>
            <Descriptions.Item label="来访目的">{selectedVisitor.purpose}</Descriptions.Item>
            <Descriptions.Item label="被访人">
              {selectedVisitor.hostName}（{selectedVisitor.hostDepartment}）
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={visitorStatusMap[selectedVisitor.status]?.color as any}>
                {visitorStatusMap[selectedVisitor.status]?.text}
              </Tag>
            </Descriptions.Item>
            {selectedVisitor.passCode && (
              <Descriptions.Item label="通行码">
                <Tag color="blue" style={{ fontFamily: 'monospace' }}>
                  {selectedVisitor.passCode}
                </Tag>
              </Descriptions.Item>
            )}
            {selectedVisitor.passCodeValidFrom && (
              <Descriptions.Item label="有效期">
                {dayjs(selectedVisitor.passCodeValidFrom).format('YYYY-MM-DD HH:mm')} ~{' '}
                {dayjs(selectedVisitor.passCodeValidTo).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="预计到达">
              {dayjs(selectedVisitor.estimatedArrival).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            {selectedVisitor.actualArrival && (
              <Descriptions.Item label="实际到达">
                {dayjs(selectedVisitor.actualArrival).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {selectedVisitor.actualDeparture && (
              <Descriptions.Item label="实际离开">
                {dayjs(selectedVisitor.actualDeparture).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Visitors;
