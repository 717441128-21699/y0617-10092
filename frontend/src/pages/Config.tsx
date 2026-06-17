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
  DatePicker,
  Select,
  TimePicker,
  Switch,
  message,
  Popconfirm,
  Tabs,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, SettingOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { Holiday, WorkRule } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;

const Config: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [workRules, setWorkRules] = useState<WorkRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [holidayModal, setHolidayModal] = useState(false);
  const [ruleModal, setRuleModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [editingRule, setEditingRule] = useState<WorkRule | null>(null);
  const [holidayForm] = Form.useForm();
  const [ruleForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [holidaysRes, rulesRes] = await Promise.all([
        api.config.getHolidays(),
        api.config.getWorkRules(),
      ]);
      if (holidaysRes.data.success) {
        setHolidays(holidaysRes.data.data || []);
      }
      if (rulesRes.data.success) {
        setWorkRules(rulesRes.data.data || []);
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

  const handleAddHoliday = () => {
    setEditingHoliday(null);
    holidayForm.resetFields();
    setHolidayModal(true);
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    holidayForm.setFieldsValue({
      ...holiday,
      date: dayjs(holiday.date),
    });
    setHolidayModal(true);
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      const response = await api.config.deleteHoliday(id);
      if (response.data.success) {
        message.success(response.data.message || '删除成功');
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleSubmitHoliday = async (values: any) => {
    try {
      const data = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      };
      let response;
      if (editingHoliday) {
        response = await api.config.updateHoliday(editingHoliday.id, data);
      } else {
        response = await api.config.createHoliday(data);
      }
      if (response.data.success) {
        message.success(response.data.message || (editingHoliday ? '更新成功' : '创建成功'));
        setHolidayModal(false);
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || (editingHoliday ? '更新失败' : '创建失败'));
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    ruleForm.resetFields();
    ruleForm.setFieldsValue({
      isFlexible: false,
      coreStartTime: dayjs('09:30', 'HH:mm'),
      coreEndTime: dayjs('15:30', 'HH:mm'),
      workStartTime: dayjs('09:00', 'HH:mm'),
      workEndTime: dayjs('18:00', 'HH:mm'),
      toleranceMinutes: 10,
      minWorkHours: 8,
    });
    setRuleModal(true);
  };

  const handleEditRule = (rule: WorkRule) => {
    setEditingRule(rule);
    ruleForm.setFieldsValue({
      ...rule,
      coreStartTime: dayjs(rule.coreStartTime, 'HH:mm'),
      coreEndTime: dayjs(rule.coreEndTime, 'HH:mm'),
      workStartTime: dayjs(rule.workStartTime, 'HH:mm'),
      workEndTime: dayjs(rule.workEndTime, 'HH:mm'),
    });
    setRuleModal(true);
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const response = await api.config.deleteWorkRule(id);
      if (response.data.success) {
        message.success(response.data.message || '删除成功');
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleSubmitRule = async (values: any) => {
    try {
      const data = {
        ...values,
        coreStartTime: values.coreStartTime.format('HH:mm'),
        coreEndTime: values.coreEndTime.format('HH:mm'),
        workStartTime: values.workStartTime.format('HH:mm'),
        workEndTime: values.workEndTime.format('HH:mm'),
      };
      let response;
      if (editingRule) {
        response = await api.config.updateWorkRule(editingRule.id, data);
      } else {
        response = await api.config.createWorkRule(data);
      }
      if (response.data.success) {
        message.success(response.data.message || (editingRule ? '更新成功' : '创建成功'));
        setRuleModal(false);
        fetchData();
      }
    } catch (error: any) {
      message.error(error.message || (editingRule ? '更新失败' : '创建失败'));
    }
  };

  const holidayColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) =>
        type === 'holiday' ? (
          <Tag color="red">节假日</Tag>
        ) : (
          <Tag color="orange">调休工作日</Tag>
        ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Holiday) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditHoliday(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteHoliday(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const ruleColumns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '类型',
      dataIndex: 'isFlexible',
      key: 'isFlexible',
      width: 120,
      render: (flexible: boolean) =>
        flexible ? <Tag color="blue">弹性工时</Tag> : <Tag color="green">固定工时</Tag>,
    },
    {
      title: '工作时间',
      key: 'workTime',
      width: 180,
      render: (_: any, record: WorkRule) => (
        <span>
          {record.workStartTime} - {record.workEndTime}
        </span>
      ),
    },
    {
      title: '核心工作时间',
      key: 'coreTime',
      width: 180,
      render: (_: any, record: WorkRule) =>
        record.isFlexible ? (
          <span>
            {record.coreStartTime} - {record.coreEndTime}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '最小工作时长',
      dataIndex: 'minWorkHours',
      key: 'minWorkHours',
      width: 120,
      render: (hours: number) => `${hours} 小时`,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: WorkRule) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditRule(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteRule(record.id)}>
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
      <Tabs defaultActiveKey="holidays" className="config-tabs">
        <TabPane
          tab={
            <span>
              <CalendarOutlined />
              节假日管理
            </span>
          }
          key="holidays"
        >
          <Card
            className="dashboard-card"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddHoliday}>
                新增节假日
              </Button>
            }
          >
            <Table
              columns={holidayColumns}
              dataSource={holidays}
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
        </TabPane>

        <TabPane
          tab={
            <span>
              <SettingOutlined />
              工作规则配置
            </span>
          }
          key="rules"
        >
          <Card
            className="dashboard-card"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRule}>
                新增规则
              </Button>
            }
          >
            <Table
              columns={ruleColumns}
              dataSource={workRules}
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
        </TabPane>
      </Tabs>

      <Modal
        title={editingHoliday ? '编辑节假日' : '新增节假日'}
        open={holidayModal}
        onCancel={() => setHolidayModal(false)}
        footer={null}
        width={450}
      >
        <Form form={holidayForm} layout="vertical" onFinish={handleSubmitHoliday}>
          <Form.Item
            name="date"
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
          </Form.Item>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例如：元旦、春节" />
          </Form.Item>
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="请选择类型">
              <Option value="holiday">节假日（休息）</Option>
              <Option value="makeup">调休（上班）</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选描述" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingHoliday ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setHolidayModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingRule ? '编辑工作规则' : '新增工作规则'}
        open={ruleModal}
        onCancel={() => setRuleModal(false)}
        footer={null}
        width={600}
      >
        <Form form={ruleForm} layout="vertical" onFinish={handleSubmitRule}>
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如：技术部弹性工作规则" />
          </Form.Item>
          <Form.Item name="isFlexible" label="是否弹性工时" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.isFlexible !== curr.isFlexible}>
            {({ getFieldValue }) => (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="workStartTime"
                      label="上班时间"
                      rules={[{ required: true, message: '请选择上班时间' }]}
                    >
                      <TimePicker style={{ width: '100%' }} format="HH:mm" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="workEndTime"
                      label="下班时间"
                      rules={[{ required: true, message: '请选择下班时间' }]}
                    >
                      <TimePicker style={{ width: '100%' }} format="HH:mm" />
                    </Form.Item>
                  </Col>
                </Row>
                {getFieldValue('isFlexible') && (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="coreStartTime"
                          label="核心工作开始时间"
                          rules={[{ required: true, message: '请选择核心工作开始时间' }]}
                        >
                          <TimePicker style={{ width: '100%' }} format="HH:mm" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="coreEndTime"
                          label="核心工作结束时间"
                          rules={[{ required: true, message: '请选择核心工作结束时间' }]}
                        >
                          <TimePicker style={{ width: '100%' }} format="HH:mm" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      name="toleranceMinutes"
                      label="弹性时间（分钟）"
                      rules={[{ required: true, message: '请输入弹性时间' }]}
                    >
                      <Input type="number" placeholder="例如：60" />
                    </Form.Item>
                  </>
                )}
              </>
            )}
          </Form.Item>
          <Form.Item
            name="minWorkHours"
            label="最小工作时长（小时）"
            rules={[{ required: true, message: '请输入最小工作时长' }]}
          >
            <Input type="number" step="0.5" placeholder="例如：8" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选描述" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRule ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setRuleModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Config;
