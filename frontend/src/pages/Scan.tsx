import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Radio, message, Row, Col } from 'antd';
import { QrcodeOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { Door, AccessRecord } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;

const Scan: React.FC = () => {
  const [form] = Form.useForm();
  const [doors, setDoors] = useState<Door[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; record?: AccessRecord } | null>(null);

  useEffect(() => {
    const fetchDoors = async () => {
      try {
        const response = await api.access.getDoors();
        if (response.data.success) {
          setDoors(response.data.data || []);
          if (response.data.data?.length > 0) {
            form.setFieldsValue({ doorId: response.data.data[0].id });
          }
        }
      } catch (error) {
        console.error('Failed to fetch doors:', error);
      }
    };
    fetchDoors();
  }, [form]);

  const handleScan = async (values: { qrCode: string; doorId: string; direction: 'in' | 'out' }) => {
    setLoading(true);
    setScanResult(null);
    try {
      const response = await api.access.scanPublic(values.qrCode, values.doorId, values.direction);
      if (response.data.success) {
        setScanResult({
          success: true,
          message: response.data.message || '扫码成功',
          record: response.data.data,
        });
        message.success(response.data.message || '扫码成功');
      }
    } catch (error: any) {
      setScanResult({
        success: false,
        message: error.message || '扫码失败',
      });
      message.error(error.message || '扫码失败');
    } finally {
      setLoading(false);
    }
  };

  const simulateEmployeeIn = () => {
    const empQr = 'EMP-00000000-0000-0000-0000-000000000000-1234567890000';
    form.setFieldsValue({ qrCode: empQr, direction: 'in' });
  };

  const simulateEmployeeOut = () => {
    const empQr = 'EMP-00000000-0000-0000-0000-000000000000-1234567890000';
    form.setFieldsValue({ qrCode: empQr, direction: 'out' });
  };

  return (
    <Card title="扫码通行" className="dashboard-card">
      <div className="scan-container">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleScan}
          initialValues={{ direction: 'in' }}
        >
          <Form.Item
            name="qrCode"
            label="二维码内容"
            rules={[{ required: true, message: '请输入或扫描二维码内容' }]}
          >
            <Input
              prefix={<QrcodeOutlined />}
              placeholder="请输入二维码内容或扫描二维码"
              size="large"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="doorId"
                label="选择门禁"
                rules={[{ required: true, message: '请选择门禁' }]}
              >
                <Select size="large" placeholder="请选择门禁">
                  {doors.map((door) => (
                    <Option key={door.id} value={door.id}>
                      {door.name} - {door.location}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="direction"
                label="通行方向"
                rules={[{ required: true, message: '请选择通行方向' }]}
              >
                <Radio.Group size="large" style={{ width: '100%' }}>
                  <Radio.Button value="in" style={{ width: '50%', textAlign: 'center' }}>
                    <LoginOutlined style={{ marginRight: 8 }} />进门
                  </Radio.Button>
                  <Radio.Button value="out" style={{ width: '50%', textAlign: 'center' }}>
                    <LogoutOutlined style={{ marginRight: 8 }} />出门
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              <QrcodeOutlined /> 扫码通行
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
          <p style={{ marginBottom: 12, color: '#666' }}>快捷测试（模拟员工工牌）：</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={simulateEmployeeIn}>员工进门</Button>
            <Button onClick={simulateEmployeeOut}>员工出门</Button>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
            提示：员工二维码格式为 EMP-{`{员工ID}`}-{`{时间戳}`}，访客二维码格式为 VIS-{`{8位随机码}`}
          </p>
        </div>

        {scanResult && (
          <div className={`scan-result ${scanResult.success ? 'scan-success' : 'scan-error'}`}>
            <p style={{ marginBottom: 8, fontSize: 20 }}>
              {scanResult.success ? '✓ 通行成功' : '✗ 通行失败'}
            </p>
            <p>{scanResult.message}</p>
            {scanResult.record && (
              <div style={{ marginTop: 12, fontSize: 14, textAlign: 'left' }}>
                <p><strong>姓名：</strong>{scanResult.record.userName}</p>
                <p><strong>类型：</strong>{scanResult.record.userType === 'employee' ? '员工' : '访客'}</p>
                <p><strong>门禁：</strong>{scanResult.record.doorName}</p>
                <p><strong>方向：</strong>{scanResult.record.direction === 'in' ? '进门' : '出门'}</p>
                <p><strong>时间：</strong>{dayjs(scanResult.record.accessTime).format('YYYY-MM-DD HH:mm:ss')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default Scan;
