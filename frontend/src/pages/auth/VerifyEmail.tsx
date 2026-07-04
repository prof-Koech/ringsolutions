import React, { useEffect, useState } from 'react';
import { Card, Result, Button, Spin } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Logo from '../../components/common/Logo';

const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('No verification token found.'); return; }

    api.post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((e) => {
        setStatus('error');
        setMessage(e.response?.data?.error || 'Verification failed.');
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001529, #003a70)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <Card bordered={false} style={{ maxWidth: 440, width: '100%', borderRadius: 20, textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}><Logo size={44} /></div>
        {status === 'loading' && <Spin size="large" tip="Verifying your email..." />}
        {status === 'success' && (
          <Result
            status="success"
            title="Email Verified!"
            subTitle="Your account is now active. You can sign in and start sending messages."
            extra={<Button type="primary" onClick={() => navigate('/login')}>Sign In Now</Button>}
          />
        )}
        {status === 'error' && (
          <Result
            status="error"
            title="Verification Failed"
            subTitle={message}
            extra={<Button onClick={() => navigate('/login')}>Back to Login</Button>}
          />
        )}
      </Card>
    </div>
  );
};

export default VerifyEmail;
