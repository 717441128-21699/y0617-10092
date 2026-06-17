import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Space,
  Tag,
  Empty,
  message,
  Popconfirm,
  Badge,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { api } from '../api/client';
import { Notification } from '../types';
import dayjs from 'dayjs';

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.notifications.getList();
      if (response.data.success) {
        setNotifications(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await api.notifications.markAsRead(id);
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (error: any) {
      message.error(error.message || '标记失败');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      await Promise.all(unreadIds.map((id) => api.notifications.markAsRead(id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      message.success('已全部标记为已读');
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await api.notifications.delete(id);
      if (response.data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        message.success('删除成功');
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleClearAll = async () => {
    try {
      await Promise.all(notifications.map((n) => api.notifications.delete(n.id)));
      setNotifications([]);
      message.success('已清空所有通知');
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'visitor_arrival':
        return <TeamOutlined style={{ color: '#63b3ed' }} />;
      case 'visitor_confirmed':
        return <CheckCircleOutlined style={{ color: '#68d391' }} />;
      case 'visitor_cancelled':
        return <ExclamationCircleOutlined style={{ color: '#fc8181' }} />;
      case 'attendance_alert':
        return <ExclamationCircleOutlined style={{ color: '#f6ad55' }} />;
      default:
        return <BellOutlined />;
    }
  };

  const getTypeTag = (type: string) => {
    switch (type) {
      case 'visitor_arrival':
        return <Tag color="blue">访客到达</Tag>;
      case 'visitor_confirmed':
        return <Tag color="green">访客已确认</Tag>;
      case 'visitor_cancelled':
        return <Tag color="red">访客已取消</Tag>;
      case 'attendance_alert':
        return <Tag color="orange">考勤提醒</Tag>;
      default:
        return <Tag>通知</Tag>;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <Card
        title={
          <Space>
            <BellOutlined />
            通知中心
            {unreadCount > 0 && (
              <Badge count={unreadCount} offset={[0, 2]} />
            )}
          </Space>
        }
        className="dashboard-card"
        extra={
          <Space>
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead}>全部标记已读</Button>
            )}
            {notifications.length > 0 && (
              <Popconfirm title="确定清空所有通知？" onConfirm={handleClearAll}>
                <Button danger>清空全部</Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        {notifications.length > 0 ? (
          <List
            dataSource={notifications}
            loading={loading}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{
                  padding: '16px',
                  background: !item.read ? 'rgba(99, 179, 237, 0.05)' : 'transparent',
                  borderRadius: 8,
                  marginBottom: 8,
                  border: !item.read ? '1px solid rgba(99, 179, 237, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <List.Item.Meta
                  avatar={getIcon(item.type)}
                  title={
                    <Space>
                      <span style={{ fontWeight: 600 }}>{item.title}</span>
                      {getTypeTag(item.type)}
                      {!item.read && <Tag color="processing">未读</Tag>}
                    </Space>
                  }
                  description={
                    <div>
                      <p style={{ margin: '8px 0', color: '#cbd5e0' }}>{item.message}</p>
                      <span style={{ color: '#718096', fontSize: 12 }}>
                        {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </span>
                    </div>
                  }
                />
                <Space>
                  {!item.read && (
                    <Button
                      size="small"
                      onClick={() => handleMarkAsRead(item.id)}
                    >
                      标记已读
                    </Button>
                  )}
                  <Popconfirm title="确定删除？" onConfirm={() => handleDelete(item.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无通知" style={{ padding: 60 }} />
        )}
      </Card>
    </div>
  );
};

export default Notifications;
