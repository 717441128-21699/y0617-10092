import React, { useState, useEffect } from 'react';
import { Statistic, Row, Col, Badge, List } from 'antd';
import { TeamOutlined, CheckOutlined, ClockCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { Visitor } from '../types';
import dayjs from 'dayjs';

const Display: React.FC = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    visited: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.visitors.getToday();
      if (response.data.success) {
        const data = response.data.data || [];
        setVisitors(data);
        setStats({
          total: data.length,
          pending: data.filter((v: Visitor) => v.status === 'pending').length,
          confirmed: data.filter((v: Visitor) => v.status === 'confirmed').length,
          visited: data.filter((v: Visitor) => v.status === 'visited').length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch visitors:', error);
    }
  };

  useEffect(() => {
    fetchData();

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'visitor-update' || data.type === 'access-record') {
          fetchData();
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    const interval = setInterval(fetchData, 10000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: <ClockCircleOutlined />, color: '#f6ad55', text: '待确认' };
      case 'confirmed':
        return { icon: <CheckOutlined />, color: '#63b3ed', text: '已确认' };
      case 'visited':
        return { icon: <CheckOutlined />, color: '#68d391', text: '已到访' };
      case 'cancelled':
        return { icon: <CloseOutlined />, color: '#fc8181', text: '已取消' };
      default:
        return { icon: null, color: '#a0aec0', text: status };
    }
  };

  return (
    <div className="big-display">
      <div className="display-header">
        <h1 className="display-title">今日访客名单</h1>
        <div className="display-date">
          {dayjs(currentTime).format('YYYY年MM月DD日 dddd HH:mm:ss')}
        </div>
      </div>

      <Row gutter={[32, 32]} style={{ marginBottom: 40 }}>
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center', padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
            <TeamOutlined style={{ fontSize: 48, color: '#00d4ff', marginBottom: 10 }} />
            <Statistic
              title={<span style={{ color: '#a0aec0', fontSize: 16 }}>今日预约</span>}
              value={stats.total}
              valueStyle={{ color: 'white', fontSize: 48, fontWeight: 700 }}
            />
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center', padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
            <ClockCircleOutlined style={{ fontSize: 48, color: '#f6ad55', marginBottom: 10 }} />
            <Statistic
              title={<span style={{ color: '#a0aec0', fontSize: 16 }}>待确认</span>}
              value={stats.pending}
              valueStyle={{ color: '#f6ad55', fontSize: 48, fontWeight: 700 }}
            />
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center', padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
            <CheckOutlined style={{ fontSize: 48, color: '#63b3ed', marginBottom: 10 }} />
            <Statistic
              title={<span style={{ color: '#a0aec0', fontSize: 16 }}>已确认</span>}
              value={stats.confirmed}
              valueStyle={{ color: '#63b3ed', fontSize: 48, fontWeight: 700 }}
            />
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center', padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
            <CheckOutlined style={{ fontSize: 48, color: '#68d391', marginBottom: 10 }} />
            <Statistic
              title={<span style={{ color: '#a0aec0', fontSize: 16 }}>已到访</span>}
              value={stats.visited}
              valueStyle={{ color: '#68d391', fontSize: 48, fontWeight: 700 }}
            />
          </div>
        </Col>
      </Row>

      <div className="visitor-list">
        {visitors.length > 0 ? (
          <List
            dataSource={visitors}
            renderItem={(visitor) => {
              const statusInfo = getStatusInfo(visitor.status);
              return (
                <div className="visitor-item" key={visitor.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                        <h3 style={{ color: 'white', fontSize: 22, margin: 0, marginRight: 16 }}>
                          {visitor.name}
                        </h3>
                        <Badge
                          status={
                            visitor.status === 'pending'
                              ? 'warning'
                              : visitor.status === 'confirmed'
                              ? 'processing'
                              : visitor.status === 'visited'
                              ? 'success'
                              : 'error'
                          }
                          text={
                            <span className={`visitor-status status-${visitor.status}`}>
                              {statusInfo.icon} {statusInfo.text}
                            </span>
                          }
                        />
                      </div>
                      <div style={{ color: '#a0aec0', fontSize: 16, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                        <span>
                          <strong style={{ color: '#cbd5e0' }}>公司：</strong>
                          {visitor.company}
                        </span>
                        <span>
                          <strong style={{ color: '#cbd5e0' }}>来访目的：</strong>
                          {visitor.purpose}
                        </span>
                        <span>
                          <strong style={{ color: '#cbd5e0' }}>被访人：</strong>
                          {visitor.hostName}
                        </span>
                        <span>
                          <strong style={{ color: '#cbd5e0' }}>部门：</strong>
                          {visitor.hostDepartment || '-'}
                        </span>
                        <span>
                          <strong style={{ color: '#cbd5e0' }}>预约时间：</strong>
                          {dayjs(visitor.estimatedArrival).format('HH:mm')}
                        </span>
                        {visitor.actualArrival && (
                          <span>
                            <strong style={{ color: '#68d391' }}>到达时间：</strong>
                            {dayjs(visitor.actualArrival).format('HH:mm:ss')}
                          </span>
                        )}
                      </div>
                    </div>
                    {visitor.passCode && visitor.status === 'confirmed' && (
                      <div
                        style={{
                          background: 'rgba(0,212,255,0.1)',
                          padding: '12px 24px',
                          borderRadius: 8,
                          border: '1px solid #00d4ff',
                          marginLeft: 20,
                        }}
                      >
                        <div style={{ color: '#00d4ff', fontSize: 12, marginBottom: 4 }}>通行码</div>
                        <div
                          style={{
                            color: '#00d4ff',
                            fontSize: 24,
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            letterSpacing: 2,
                          }}
                        >
                          {visitor.passCode}
                        </div>
                        <div style={{ color: '#718096', fontSize: 12, marginTop: 4 }}>
                          {dayjs(visitor.passCodeValidFrom).format('HH:mm')} -{' '}
                          {dayjs(visitor.passCodeValidTo).format('HH:mm')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 80, color: '#a0aec0' }}>
            <TeamOutlined style={{ fontSize: 80, marginBottom: 20, opacity: 0.3 }} />
            <p style={{ fontSize: 24 }}>今日暂无访客预约</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Display;
