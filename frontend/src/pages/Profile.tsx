import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Space, Descriptions, Tag, Divider, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { roleMap, departmentMap } from '../types';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateProfile = async (values: any) => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await api.employees.update(user.id, values);
      if (response.data.success) {
        message.success('个人信息更新成功');
        updateUser(response.data.data);
      }
    } catch (error: any) {
      message.error(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    if (!user) return;
    setPasswordLoading(true);
    try {
      const response = await api.auth.changePassword(values);
      if (response.data.success) {
        message.success('密码修改成功');
        passwordForm.resetFields();
      }
    } catch (error: any) {
      message.error(error.message || '密码修改失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return <Alert message="请先登录" type="warning" showIcon />;
  }

  return (
    <div>
      <Card title="个人信息" className="dashboard-card">
        <Descriptions column={2} bordered size="middle">
          <Descriptions.Item label="工号">{user.employeeId}</Descriptions.Item>
          <Descriptions.Item label="姓名">{user.name}</Descriptions.Item>
          <Descriptions.Item label="部门">{departmentMap[user.department] || user.department}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color={roleMap[user.role]?.color as any}>
              {roleMap[user.role]?.text || user.role}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="职位">{user.position || '-'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
          <Descriptions.Item label="手机号">{user.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="二维码状态">
            {user.qrCode ? <Tag color="success">已绑定</Tag> : <Tag color="warning">未绑定</Tag>}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleUpdateProfile}
          initialValues={{
            name: user.name,
            email: user.email,
            phone: user.phone,
            position: user.position,
          }}
        >
          <h3 style={{ marginBottom: 16 }}>
            <UserOutlined /> 修改个人信息
          </h3>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱格式' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="position" label="职位">
            <Input placeholder="请输入职位" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="修改密码" className="dashboard-card" style={{ marginTop: 16 }}>
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <h3 style={{ marginBottom: 16 }}>
            <LockOutlined /> 修改登录密码
          </h3>
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={passwordLoading}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Profile;
