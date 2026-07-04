import React, { useMemo, useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { post } from '../../services/api';
import Logo from '../../components/common/Logo';

const { Title, Text } = Typography;

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const onFinish = async (values: { password: string }) => {
    if (!token) {
      setError('The password reset link is missing a token. Please request a new reset link.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await post('/auth/reset-password', { token, password: values.password });
      setSuccess('Your password has been reset successfully. You can sign in with your new password.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to reset your password right now. Please try again.');
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
          <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>Choose a new password</Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
            Enter and confirm your new password below.
          </Text>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
          {success && <Alert message={success} type="success" showIcon style={{ marginBottom: 16 }} />}

          <Form onFinish={onFinish} layout="vertical" size="large">
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Password is required' }, { min: 8, message: 'Password must be at least 8 characters' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="New password" autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" autoComplete="new-password" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 46, fontWeight: 600 }}>
                Reset password
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

export default ResetPassword;
