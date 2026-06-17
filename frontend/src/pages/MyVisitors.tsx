import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, DatePicker, Checkbox, message, Descriptions, Row, Col } from 'antd';
import { CheckOutlined, CloseOutlined, LoginOutlined, LogoutOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { Visitor, visitorStatusMap, Door } from '../types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const MyVisitors: React.FC = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [doors, setDoors] = useState<Door[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [confirmForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitorsRes, doorsRes] = await Promise.all([
        api.visitors.getAll(),
        api.access.getDoors(),
      ]);

      if (visitorsRes.data.success) {
        setVisitors(visitorsRes.data.data || []);
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
      width: 200,
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
            <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleCancel(record.id)}>
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="我的访客" className="dashboard-card">
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
            <Descriptions.Item label="公司">{selectedVisitor.company}</Descriptions.Item>
            <Descriptions.Item label="来访目的">{selectedVisitor.purpose}</Descriptions.Item>
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

export default MyVisitors;
