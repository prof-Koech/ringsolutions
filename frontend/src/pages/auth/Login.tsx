import React, { useEffect } from 'react';
import { Form, Input, Button, Card, Divider, Alert, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login, clearError } from '../../store/authSlice';
import { AppDispatch } from '../../store';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../../components/common/Logo';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isAuthenticated } = useAuth();
  const [form] = Form.useForm();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
    return () => { dispatch(clearError()); };
  }, [isAuthenticated]);

  const onFinish = async (values: { email: string; password: string }) => {
    const result = await dispatch(login(values));
    if (login.fulfilled.match(result)) navigate('/dashboard');
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
        <Card
          bordered={false}
          style={{ borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        >
          <Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>Welcome back</Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 28 }}>
            Sign in to your RingSolutions account
          </Text>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}

          <Form form={form} onFinish={onFinish} layout="vertical" size="large">
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
              <Input prefix={<MailOutlined />} placeholder="Email address" autoComplete="email" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Password required' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Password" autoComplete="current-password" />
            </Form.Item>
            <div style={{ textAlign: 'right', marginTop: -16, marginBottom: 16 }}>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 46, fontWeight: 600 }}>
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Divider />
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">Don't have an account? </Text>
            <Link to="/register"><strong>Create one free</strong></Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
