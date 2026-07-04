import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { post } from '../../services/api';
import Logo from '../../components/common/Logo';

const { Title, Text } = Typography;

const ForgotPassword: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await post('/auth/forgot-password', { email: values.email.trim().toLowerCase() });
      setSuccess('If the email exists in our system, a password reset link has been sent. Please check your inbox.');
      form.resetFields();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to send a reset link right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size={52} showText light />
        </div>
        <Card bordered={false} style={{ borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>Reset your password</Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
            Enter the email you use for RingSolutions and we’ll send a reset link.
          </Text>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
          {success && <Alert message={success} type="success" showIcon style={{ marginBottom: 16 }} />}

          <Form form={form} onFinish={onFinish} layout="vertical" size="large">
            <Form.Item
              name="email"
              rules={[{ required: true, type: 'email', message: 'Please enter a valid email address' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="Email address" autoComplete="email" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 46, fontWeight: 600 }}>
                Send reset link
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Link to="/login">Back to sign in</Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
