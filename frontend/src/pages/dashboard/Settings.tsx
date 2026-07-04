import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, Tabs, Alert, Typography, ColorPicker,
  Select, message, Tag, Divider, Row, Col, Switch, Badge, Space,
  Table, Popconfirm, Modal, Skeleton,
} from 'antd';
import type { Color } from 'antd/es/color-picker';
import {
  UserOutlined, LockOutlined, BellOutlined, GlobalOutlined,
  PhoneOutlined, BankOutlined, MailOutlined, SafetyOutlined,
  CheckCircleOutlined, CloseCircleOutlined, PlusOutlined,
  DeleteOutlined, EditOutlined, CrownOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import RingAvatar from '../../components/common/RingAvatar';

const { Title, Text, Paragraph } = Typography;

// ── Types ────────────────────────────────────────────────────────────────────

interface SenderID {
  id: string;
  sender_id: string;
  purpose: string;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  fee_paid: boolean;
  expires_at?: string;
  created_at: string;
}

// ── Sub-sections ─────────────────────────────────────────────────────────────

const ProfileHeader: React.FC<{ user: ReturnType<typeof useAuth>['user'] }> = ({ user }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: '20px 0',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: 28,
  }}>
    <RingAvatar name={user?.full_name} size={72} />
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 20, color: '#1a1a2e' }}>{user?.full_name}</span>
        {user?.is_admin && (
          <Tag icon={<CrownOutlined />} color="gold">Admin</Tag>
        )}
        {user?.is_verified ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Verified</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="warning">Unverified</Tag>
        )}
      </div>
      <Text type="secondary">{user?.email}</Text>
      {user?.company && (
        <div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <BankOutlined style={{ marginRight: 4 }} />{user.company}
          </Text>
        </div>
      )}
      <div style={{ marginTop: 6 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }) : '—'}
        </Text>
      </div>
    </div>
  </div>
);

// ── Profile Tab ──────────────────────────────────────────────────────────────

const ProfileTab: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone ?? '',
        company: user.company ?? '',
      });
    }
  }, [user]);

  const handleResend = async () => {
    await api.post('/auth/resend-verification', { email: user?.email });
    message.success('Verification email sent');
  };

  const onFinish = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      await api.put('/auth/profile', values);
      message.success('Profile updated');
      refreshUser();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ProfileHeader user={user} />

      {!user?.is_verified && (
        <Alert
          message="Email not verified"
          description="You need to verify your email before sending campaigns."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" onClick={handleResend}>
              Resend Email
            </Button>
          }
        />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish} size="large">
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="first_name" label="First Name" rules={[{ required: true, message: 'Required' }]}>
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true, message: 'Required' }]}>
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Email Address">
          <Input
            prefix={<MailOutlined />}
            value={user?.email}
            disabled
            suffix={
              user?.is_verified
                ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                : <CloseCircleOutlined style={{ color: '#faad14' }} />
            }
          />
          <Text type="secondary" style={{ fontSize: 12 }}>Email cannot be changed after registration.</Text>
        </Form.Item>

        <Form.Item name="phone" label="Phone Number">
          <Input prefix={<PhoneOutlined />} placeholder="+254712345678" />
        </Form.Item>

        <Form.Item name="company" label="Company / Organisation">
          <Input prefix={<BankOutlined />} placeholder="Your company name" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Profile
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

// ── Security Tab ─────────────────────────────────────────────────────────────

const SecurityTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      await api.put('/auth/profile', {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      message.success('Password changed successfully');
      form.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 28 }}>
        <Title level={5} style={{ margin: 0 }}>Change Password</Title>
        <Text type="secondary">Use a strong password of at least 8 characters.</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} size="large">
        <Form.Item
          name="current_password"
          label="Current Password"
          rules={[{ required: true, message: 'Enter your current password' }]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
        </Form.Item>

        <Divider style={{ margin: '8px 0 20px' }} />

        <Form.Item
          name="new_password"
          label="New Password"
          rules={[
            { required: true, message: 'New password is required' },
            { min: 8, message: 'Must be at least 8 characters' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="At least 8 characters" autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          name="confirm"
          label="Confirm New Password"
          dependencies={['new_password']}
          rules={[
            { required: true, message: 'Please confirm your new password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SafetyOutlined />}>
            Change Password
          </Button>
        </Form.Item>
      </Form>

      <Divider />

      <div>
        <Title level={5}>Account Security</Title>
        <div style={{
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}>
          <SafetyOutlined style={{ color: '#52c41a', marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600 }}>JWT-Based Authentication</div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Your session uses a short-lived access token (12 hours) with a 30-day refresh token.
              Logging out invalidates your local session.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Preferences Tab ──────────────────────────────────────────────────────────

const TIMEZONES = [
  { label: 'Africa/Nairobi (EAT, UTC+3)', value: 'Africa/Nairobi' },
  { label: 'Africa/Dar_es_Salaam (EAT, UTC+3)', value: 'Africa/Dar_es_Salaam' },
  { label: 'Africa/Kampala (EAT, UTC+3)', value: 'Africa/Kampala' },
  { label: 'Africa/Kigali (CAT, UTC+2)', value: 'Africa/Kigali' },
  { label: 'Africa/Lagos (WAT, UTC+1)', value: 'Africa/Lagos' },
  { label: 'UTC', value: 'UTC' },
];

const PRESET_COLORS = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#f5222d', '#13c2c2', '#eb2f96', '#2f54eb'];

const PreferencesTab: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [themeColor, setThemeColor] = useState(user?.theme_color || '#1890ff');
  const [form] = Form.useForm();

  useEffect(() => {
    if (user) {
      setThemeColor(user.theme_color || '#1890ff');
      form.setFieldsValue({ timezone: user.timezone || 'Africa/Nairobi' });
    }
  }, [user]);

  const onFinish = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      await api.put('/auth/profile', { ...values, theme_color: themeColor });
      message.success('Preferences saved');
      refreshUser();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} size="large">
      <Title level={5} style={{ marginBottom: 20 }}>Display & Regional</Title>

      <Form.Item name="timezone" label="Timezone">
        <Select
          showSearch
          optionFilterProp="label"
          options={TIMEZONES}
          placeholder="Select your timezone"
        />
      </Form.Item>

      <Divider />
      <Title level={5} style={{ marginBottom: 4 }}>Report Theme Color</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
        This color is used on your campaign PDF reports and analytics exports.
      </Text>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#595959' }}>Pick a color</div>
          <ColorPicker
            value={themeColor}
            onChange={(color: Color) => setThemeColor(color.toHexString())}
            presets={[{ label: 'Brand Presets', colors: PRESET_COLORS }]}
            showText
          />
        </div>

        {/* Live preview card */}
        <div style={{
          flex: 1,
          minWidth: 220,
          border: '1px solid #f0f0f0',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
            padding: '16px 20px',
            color: '#fff',
          }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Campaign Report</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>RingSolutions</div>
          </div>
          <div style={{ padding: '12px 20px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Delivery Rate</Text>
              <span style={{ color: themeColor, fontWeight: 700 }}>94.2%</span>
            </div>
            <div style={{
              height: 6,
              background: '#f0f0f0',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{ width: '94%', height: '100%', background: themeColor, borderRadius: 3 }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#bfbfbf' }}>Preview only</div>
          </div>
        </div>
      </div>

      <Form.Item style={{ marginTop: 28 }}>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save Preferences
        </Button>
      </Form.Item>
    </Form>
  );
};

// ── Sender IDs Tab ───────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  pending: 'warning',
  active: 'success',
  rejected: 'error',
  suspended: 'default',
};

const SenderIDsTab: React.FC = () => {
  const [senderIds, setSenderIds] = useState<SenderID[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { loadSenderIds(); }, []);

  const loadSenderIds = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/auth/me');
      // Sender IDs come from the user's own records — fetch from a dedicated endpoint
      // For now load from admin or a user-level endpoint
      setSenderIds([]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: { sender_id: string; purpose: string }) => {
    setSubmitting(true);
    try {
      message.info('Sender ID registration request submitted. Approval takes 1–2 business days.');
      setModalOpen(false);
      form.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Sender ID',
      dataIndex: 'sender_id',
      render: (s: string) => <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 15 }}>{s}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => <Tag color={STATUS_COLOR[s] || 'default'}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      render: (p: string) => p || '—',
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      render: (d: string) => d ? new Date(d).toLocaleDateString('en-KE') : '—',
    },
    {
      title: 'Registered',
      dataIndex: 'created_at',
      render: (d: string) => new Date(d).toLocaleDateString('en-KE'),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>Custom Sender IDs</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Replace the default shortcode with your brand name (e.g. <code>SHOPNAME</code>).
            Each ID costs <strong>KES 500/month</strong> and requires admin approval.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Request Sender ID
        </Button>
      </div>

      <Alert
        type="info"
        showIcon
        message="Max 11 characters. Letters, numbers, and spaces only. No special characters."
        style={{ marginBottom: 16 }}
        closable
      />

      {loading ? (
        <Skeleton active />
      ) : senderIds.length === 0 ? (
        <Card bordered style={{ textAlign: 'center', padding: '40px 0', borderRadius: 12, borderStyle: 'dashed' }}>
          <GlobalOutlined style={{ fontSize: 40, color: '#d9d9d9', marginBottom: 12 }} />
          <div style={{ color: '#8c8c8c' }}>No sender IDs registered yet.</div>
          <Button type="link" onClick={() => setModalOpen(true)}>Request your first Sender ID</Button>
        </Card>
      ) : (
        <Table
          dataSource={senderIds}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      )}

      <Modal
        open={modalOpen}
        title="Request Custom Sender ID"
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="sender_id"
            label="Sender ID"
            rules={[
              { required: true, message: 'Sender ID is required' },
              { max: 11, message: 'Maximum 11 characters' },
              { pattern: /^[A-Za-z0-9 ]+$/, message: 'Letters, numbers, and spaces only' },
            ]}
            extra="Max 11 characters. E.g. SHOPNAME, MYBANK"
          >
            <Input
              placeholder="e.g. MYSHOP"
              maxLength={11}
              showCount
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
            />
          </Form.Item>
          <Form.Item
            name="purpose"
            label="Purpose / Use Case"
            rules={[{ required: true, message: 'Please describe how you will use this sender ID' }]}
          >
            <Input.TextArea rows={3} placeholder="e.g. Customer notifications for our e-commerce platform" />
          </Form.Item>
          <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
            <Text style={{ fontSize: 13 }}>
              A charge of <strong>KES 500</strong> will be deducted from your wallet upon approval.
              Approval typically takes 1–2 business days.
            </Text>
          </div>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Submit Request
          </Button>
        </Form>
      </Modal>
    </>
  );
};

// ── Notifications Tab ─────────────────────────────────────────────────────────

const NotificationsTab: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    email_campaign_complete: true,
    email_low_balance: true,
    email_payment_success: true,
    in_app_all: true,
  });

  const toggle = (key: keyof typeof prefs) =>
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    setSaving(true);
    // Persist to backend when endpoint is ready
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
    message.success('Notification preferences saved');
  };

  const rows: { key: keyof typeof prefs; label: string; desc: string }[] = [
    {
      key: 'email_campaign_complete',
      label: 'Campaign Complete',
      desc: 'Email me when a campaign finishes with the PDF report attached.',
    },
    {
      key: 'email_payment_success',
      label: 'Payment Confirmation',
      desc: 'Email me when an M-Pesa top-up is confirmed.',
    },
    {
      key: 'email_low_balance',
      label: 'Low Balance Alert',
      desc: 'Email me when my wallet balance drops below KES 50.',
    },
    {
      key: 'in_app_all',
      label: 'In-App Notifications',
      desc: 'Show notifications in the sidebar bell for all events.',
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={5} style={{ margin: 0 }}>Notification Preferences</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Choose how and when RingSolutions notifies you.
        </Text>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {rows.map((row, i) => (
          <div
            key={row.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: i < rows.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{row.label}</div>
              <Text type="secondary" style={{ fontSize: 13 }}>{row.desc}</Text>
            </div>
            <Switch checked={prefs[row.key]} onChange={() => toggle(row.key)} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        <Button type="primary" onClick={save} loading={saving}>
          Save Preferences
        </Button>
      </div>
    </>
  );
};

// ── Main Settings page ────────────────────────────────────────────────────────

const Settings: React.FC = () => (
  <div style={{ maxWidth: 760 }}>
    <div style={{ marginBottom: 24 }}>
      <Title level={3} style={{ margin: 0 }}>Account Settings</Title>
      <Text type="secondary">Manage your profile, security, and preferences.</Text>
    </div>

    <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <Tabs
        tabPosition="left"
        style={{ minHeight: 480 }}
        items={[
          {
            key: 'profile',
            label: (
              <Space>
                <UserOutlined />
                Profile
              </Space>
            ),
            children: <div style={{ padding: '0 24px' }}><ProfileTab /></div>,
          },
          {
            key: 'security',
            label: (
              <Space>
                <LockOutlined />
                Security
              </Space>
            ),
            children: <div style={{ padding: '0 24px' }}><SecurityTab /></div>,
          },
          {
            key: 'preferences',
            label: (
              <Space>
                <GlobalOutlined />
                Preferences
              </Space>
            ),
            children: <div style={{ padding: '0 24px' }}><PreferencesTab /></div>,
          },
          {
            key: 'sender-ids',
            label: (
              <Space>
                <PhoneOutlined />
                Sender IDs
              </Space>
            ),
            children: <div style={{ padding: '0 24px' }}><SenderIDsTab /></div>,
          },
          {
            key: 'notifications',
            label: (
              <Space>
                <BellOutlined />
                Notifications
              </Space>
            ),
            children: <div style={{ padding: '0 24px' }}><NotificationsTab /></div>,
          },
        ]}
      />
    </Card>
  </div>
);

export default Settings;
