import React, { useState, useEffect } from 'react';
import { Row, Col, Card, List, Tag, Statistic } from 'antd';
import {
  LoginOutlined,
  LogoutOutlined,
  TeamOutlined,
  WarningOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Attendance, Visitor, AccessRecord, attendanceStatusMap, visitorStatusMap } from '../types';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [todayVisitors, setTodayVisitors] = useState<Visitor[]>([]);
  const [recentRecords, setRecentRecords] = useState<AccessRecord[]>([]);
  const [workRule, setWorkRule] = useState<any>(null);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attendanceRes, visitorsRes, recordsRes, ruleRes] = await Promise.all([
          api.attendance.getMyToday(),
          api.visitors.getToday(),
          api.access.getRecords({ pageSize: 10 }),
          api.config.getMyWorkRule(),
        ]);

        if (attendanceRes.data.success) {
          setTodayAttendance(attendanceRes.data.data);
        }
        if (visitorsRes.data.success) {
          setTodayVisitors(visitorsRes.data.data || []);
        }
        if (recordsRes.data.success) {
          setRecentRecords(recordsRes.data.data?.records || []);
        }
        if (ruleRes.data.success) {
          setWorkRule(ruleRes.data.data);
        }

        if (user?.role !== 'employee') {
          const statsRes = await api.attendance.getStatistics({
            startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
            endDate: dayjs().format('YYYY-MM-DD'),
          });
          if (statsRes.data.success) {
            setStats(statsRes.data.data?.overall || {});
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };

    fetchData();
  }, [user?.role]);

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <Statistic
              title="今日签到"
              value={todayAttendance?.checkIn ? dayjs(todayAttendance.checkIn).format('HH:mm:ss') : '未签到'}
              prefix={<LoginOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: todayAttendance?.checkIn ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <Statistic
              title="今日签退"
              value={todayAttendance?.checkOut ? dayjs(todayAttendance.checkOut).format('HH:mm:ss') : '未签退'}
              prefix={<LogoutOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: todayAttendance?.checkOut ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <Statistic
              title="今日访客"
              value={todayVisitors.length}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <Statistic
              title="今日状态"
              value={todayAttendance ? attendanceStatusMap[todayAttendance.status]?.text || todayAttendance.status : '无数据'}
              prefix={<WarningOutlined />}
              valueStyle={{ color: todayAttendance ? (attendanceStatusMap[todayAttendance.status]?.color === 'success' ? '#3f8600' : '#cf1322') : '#999' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="我的考勤规则" className="dashboard-card">
            {workRule && (
              <div style={{ fontSize: 16 }}>
                <p><strong>规则名称：</strong>{workRule.name}</p>
                <p><strong>上班时间：</strong>{workRule.workStartTime}</p>
                <p><strong>下班时间：</strong>{workRule.workEndTime}</p>
                <p><strong>弹性时间：</strong>{workRule.flexibleMinutes} 分钟</p>
                {workRule.isDefault && <Tag color="blue">默认规则</Tag>}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="今日访客" className="dashboard-card">
            {todayVisitors.length > 0 ? (
              <List
                dataSource={todayVisitors.slice(0, 5)}
                renderItem={(visitor) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<UserOutlined />}
                      title={`${visitor.name} - ${visitor.company}`}
                      description={`来访目的：${visitor.purpose} | 被访人：${visitor.hostName}`}
                    />
                    <Tag color={visitorStatusMap[visitor.status]?.color}>
                      {visitorStatusMap[visitor.status]?.text}
                    </Tag>
                  </List.Item>
                )}
              />
            ) : (
              <p style={{ color: '#999', textAlign: 'center' }}>今日暂无访客</p>
            )}
          </Card>
        </Col>
      </Row>

      {user?.role !== 'employee' && stats.totalDays !== undefined && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="本月总考勤" value={stats.totalDays || 0} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="正常出勤" value={stats.normalDays || 0} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="迟到/早退" value={(stats.lateDays || 0) + (stats.earlyLeaveDays || 0)} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="旷工/漏打卡" value={(stats.absentDays || 0) + (stats.missingDays || 0)} valueStyle={{ color: '#f5222d' }} />
            </Card>
          </Col>
        </Row>
      )}

      <Card title="最近通行记录" className="dashboard-card" style={{ marginTop: 16 }}>
        <List
          dataSource={recentRecords}
          renderItem={(record) => (
            <List.Item>
              <List.Item.Meta
                avatar={record.direction === 'in' ? <LoginOutlined style={{ color: '#52c41a' }} /> : <LogoutOutlined style={{ color: '#1890ff' }} />}
                title={`${record.userName} - ${record.doorName}`}
                description={
                  <span>
                    {record.direction === 'in' ? '进门' : '出门'} · {dayjs(record.accessTime).format('YYYY-MM-DD HH:mm:ss')}
                    {!record.success && <Tag color="red" style={{ marginLeft: 8 }}>{record.reason}</Tag>}
                  </span>
                }
              />
              <Tag color={record.success ? 'green' : 'red'}>
                {record.success ? '成功' : '失败'}
              </Tag>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
