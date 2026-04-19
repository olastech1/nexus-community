'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSearchParams } from 'next/navigation';

export default function PaymentsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const [connectStatus, setConnectStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (searchParams.get('onboarding') === 'complete') {
      addToast('success', 'Stripe connected!', 'Your account is now ready to receive payments.');
    }

    fetch('/api/stripe/connect').then(r => r.json()).then(data => {
      setConnectStatus(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [searchParams, addToast]);

  const startOnboarding = async () => {
    setConnecting(true);
    const res = await fetch('/api/stripe/connect', { method: 'POST' });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      addToast('error', 'Failed', data.error || 'Could not start Stripe onboarding');
      setConnecting(false);
    }
  };

  if (loading) return <div><div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} /></div>;

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>💰 Payments</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your Stripe Connect account and view earnings.</p>
      </div>

      {/* Connect Status */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', maxWidth: '600px' }}>
        <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Stripe Connect</h3>

        {connectStatus?.onboardingComplete ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--success-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>✅</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--success)' }}>Connected</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  Account: {connectStatus.accountId?.slice(0, 20)}...
                </div>
              </div>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Your Stripe account is active. Payments from subscribers will be automatically deposited to your bank account.
            </p>
          </div>
        ) : connectStatus?.connected ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--warning-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⏳</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--warning)' }}>Onboarding Incomplete</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Complete setup to start receiving payments</div>
              </div>
            </div>
            <button className="btn btn-gradient" onClick={startOnboarding} disabled={connecting}>
              {connecting ? <span className="spinner spinner-sm" /> : 'Continue Stripe Setup →'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💳</div>
              <div>
                <div style={{ fontWeight: 700 }}>Not Connected</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Connect Stripe to accept paid memberships</div>
              </div>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Connect your Stripe account to start accepting payments. The platform takes a {process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT || '5'}% fee from each transaction.
            </p>
            <button className="btn btn-gradient" onClick={startOnboarding} disabled={connecting}>
              {connecting ? <span className="spinner spinner-sm" /> : 'Connect Stripe →'}
            </button>
          </div>
        )}
      </div>

      {/* Revenue Dashboard */}
      {connectStatus?.onboardingComplete && (
        <div>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Revenue Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            {[
              { label: 'MRR', value: '$0.00', icon: '📈', desc: 'Monthly Recurring Revenue' },
              { label: 'Active Subs', value: '0', icon: '👥', desc: 'Active subscribers' },
              { label: 'Churn Rate', value: '0%', icon: '📉', desc: 'Monthly churn' },
              { label: 'Total Earned', value: '$0.00', icon: '💵', desc: 'Lifetime earnings' },
            ].map((stat, i) => (
              <div key={stat.label} className="glass-card animate-fadeInUp" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
                <div style={{ fontSize: '24px', marginBottom: 'var(--space-2)' }}>{stat.icon}</div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>{stat.value}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{stat.label}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>{stat.desc}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Detailed revenue analytics will appear here once you have active subscribers.</p>
          </div>
        </div>
      )}
    </div>
  );
}
