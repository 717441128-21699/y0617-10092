import React, { useState, useEffect } from 'react';
import { Card, Button, Descriptions, message, Space } from 'antd';
import { QrcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import dayjs from 'dayjs';

const QrCode: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrCodeBoundAt, setQrCodeBoundAt] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setQrCode(user.qrCode);
      setQrCodeBoundAt(user.qrCodeBoundAt);
    }
  }, [user]);

  const handleBindQrCode = async () => {
    setLoading(true);
    try {
      const response = await api.auth.bindQrCode();
      if (response.data.success) {
        setQrCode(response.data.data.qrCode);
        setQrCodeUrl(response.data.data.qrCodeUrl);
        setQrCodeBoundAt(response.data.data.qrCodeBoundAt);
        await refreshProfile();
        message.success('二维码绑定成功');
      }
    } catch (error: any) {
      message.error(error.message || '绑定失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="我的工牌" className="dashboard-card">
      <div className="qr-code-container">
        {qrCode ? (
          <div className="qr-code-wrapper">
            <QRCodeCanvas
              value={qrCode}
              size={256}
              level="H"
              includeMargin={true}
            />
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                {user?.name} · {user?.employeeId}
              </p>
              <p style={{ color: '#999', fontSize: 14 }}>
                绑定时间：{dayjs(qrCodeBoundAt).format('YYYY-MM-DD HH:mm:ss')}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <QrcodeOutlined style={{ fontSize: 120, color: '#d9d9d9' }} />
            <p style={{ marginTop: 20, fontSize: 16, color: '#666' }}>
              您还未绑定工牌二维码
            </p>
            <p style={{ color: '#999' }}>
              绑定后可用于门禁扫码进出
            </p>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Space>
            <Button
              type="primary"
              size="large"
              icon={qrCode ? <ReloadOutlined /> : <QrcodeOutlined />}
              onClick={handleBindQrCode}
              loading={loading}
            >
              {qrCode ? '重新绑定' : '绑定工牌'}
            </Button>
          </Space>
        </div>

        <Descriptions title="使用说明" style={{ marginTop: 32 }} column={1}>
          <Descriptions.Item label="1. 绑定工牌">
            点击上方按钮绑定您的工牌二维码
          </Descriptions.Item>
          <Descriptions.Item label="2. 扫码进出">
            在门禁设备上扫描二维码即可进出
          </Descriptions.Item>
          <Descriptions.Item label="3. 考勤记录">
            系统自动记录您的进出时间并生成考勤数据
          </Descriptions.Item>
          <Descriptions.Item label="4. 安全提示">
            请勿将二维码转借他人，如有遗失请立即重新绑定
          </Descriptions.Item>
        </Descriptions>
      </div>
    </Card>
  );
};

export default QrCode;
