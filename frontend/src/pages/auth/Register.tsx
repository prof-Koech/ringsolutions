import React, { useState } from 'react';
import { Form, Input, Button, Card, Row, Col, Alert, Typography, Divider, Result } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, BankOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../components/common/Logo';
import api from '../../services/api';

const { Title, Text } = Typography;

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const onFinish = async (values: Record<string, string>) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', {
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || undefined,
        company: values.company || undefined,
      });
      setSuccess(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <Card bordered={false} style={{ maxWidth: 480, width: '100%', borderRadius: 20, textAlign: 'center' }}>
          <Result
            status="success"
            title="Account Created!"
            subTitle="Check your email inbox for a verification link. Verify your email to activate your account."
            extra={[
              <Button type="primary" key="login" onClick={() => navigate('/login')}>Go to Sign In</Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size={52} showText light />
        </div>
        <Card bordered={false} style={{ borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>Create Account</Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 28 }}>
            Start sending bulk messages today
          </Text>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}

          <Form form={form} onFinish={onFinish} layout="vertical" size="large">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="first_name" rules={[{ required: true, message: 'Required' }]}>
                  <Input prefix={<UserOutlined />} placeholder="First name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="last_name" rules={[{ required: true, message: 'Required' }]}>
                  <Input prefix={<UserOutlined />} placeholder="Last name" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
              <Input prefix={<MailOutlined />} placeholder="Email address" />
            </Form.Item>
            <Form.Item name="phone">
              <Input prefix={<PhoneOutlined />} placeholder="Phone number (e.g. 0712345678)" />
            </Form.Item>
            <Form.Item name="company">
              <Input prefix={<BankOutlined />} placeholder="Company name (optional)" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Password required' },
                { min: 8, message: 'At least 8 characters' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password (min 8 characters)" />
            </Form.Item>
            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject('Passwords do not match');
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 46, fontWeight: 600 }}>
                Create Account
              </Button>
            </Form.Item>
          </Form>

          <Divider />
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">Already have an account? </Text>
            <Link to="/login"><strong>Sign in</strong></Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;
