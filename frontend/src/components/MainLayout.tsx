import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Space } from 'antd';
import {
  DashboardOutlined,
  QrcodeOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  MonitorOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { api } from '../api/client';
import { roleMap } from '../types';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.notifications.getAll({ unread: 'true', pageSize: 1 });
        if (response.data.success) {
          setUnreadCount(response.data.data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const getMenuItems = (): MenuProps['items'] => {
    if (!user) return [];

    const items: MenuProps['items'] = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: '首页',
        onClick: () => navigate('/dashboard'),
      },
    ];

    if (['admin', 'hr', 'reception'].includes(user.role)) {
      items.push({
        key: '/display',
        icon: <MonitorOutlined />,
        label: '前台大屏',
        onClick: () => navigate('/display'),
      });
    }

    if (['admin', 'reception'].includes(user.role)) {
      items.push({
        key: '/visitors',
        icon: <TeamOutlined />,
        label: '访客管理',
        onClick: () => navigate('/visitors'),
      });
    }

    if (user.role === 'employee') {
      items.push({
        key: '/my-visitors',
        icon: <TeamOutlined />,
        label: '我的访客',
        onClick: () => navigate('/my-visitors'),
      });
    }

    items.push({
      key: '/qrcode',
      icon: <QrcodeOutlined />,
      label: '我的工牌',
      onClick: () => navigate('/qrcode'),
    });

    items.push({
      key: '/scan',
      icon: <QrcodeOutlined />,
      label: '扫码通行',
      onClick: () => navigate('/scan'),
    });

    items.push({
      key: '/attendance',
      icon: <CalendarOutlined />,
      label: user.role === 'employee' ? '我的考勤' : '考勤管理',
      onClick: () => navigate('/attendance'),
    });

    if (['admin', 'hr'].includes(user.role)) {
      items.push({
        key: '/hr-dashboard',
        icon: <BarChartOutlined />,
        label: 'HR报表',
        onClick: () => navigate('/hr-dashboard'),
      });
    }

    if (['admin', 'hr'].includes(user.role)) {
      items.push({
        key: '/employees',
        icon: <UserOutlined />,
        label: '员工管理',
        onClick: () => navigate('/employees'),
      });
    }

    if (['admin', 'hr'].includes(user.role)) {
      items.push({
        key: '/config',
        icon: <SettingOutlined />,
        label: '系统配置',
        onClick: () => navigate('/config'),
      });
    }

    items.push({
      key: '/notifications',
      icon: (
        <Badge count={unreadCount} size="small">
          <BellOutlined />
        </Badge>
      ),
      label: '通知中心',
      onClick: () => navigate('/notifications'),
    });

    return items;
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login', { replace: true });
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: collapsed ? 16 : 18, fontWeight: 600 }}>
          {collapsed ? '门禁' : '门禁管理系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: 'white',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 500 }}>
            欢迎回来，{user?.name}
          </div>
          <Space size={24}>
            <Badge count={unreadCount} size="small" onClick={() => navigate('/notifications')}>
              <BellOutlined style={{ fontSize: 20, cursor: 'pointer', color: '#666' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>
                  {user?.name} ({roleMap[user?.role || 'employee']?.text || user?.role})
                </span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '24px', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
