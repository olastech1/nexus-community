'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface SettingsSection {
  title: string;
  icon: string;
  description: string;
  fields: { key: string; label: string; type: 'text' | 'password' | 'number'; placeholder: string; help?: string }[];
}

const SECTIONS: SettingsSection[] = [
  {
    title: 'Stripe Payment Gateway',
    icon: '💳',
    description: 'Configure Stripe Connect to enable paid memberships and split payments.',
    fields: [
      { key: 'stripe_secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...', help: 'Found in your Stripe Dashboard → Developers → API keys' },
      { key: 'stripe_publishable_key', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...', help: 'The public key used for client-side Stripe.js' },
      { key: 'stripe_webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...', help: 'Found in Stripe Dashboard → Developers → Webhooks' },
      { key: 'platform_fee_percent', label: 'Platform Fee (%)', type: 'number', placeholder: '5', help: 'Percentage of each payment kept by the platform' },
    ],
  },
  {
    title: 'Application Settings',
    icon: '🌐',
    description: 'General platform configuration.',
    fields: [
      { key: 'app_url', label: 'App URL', type: 'text', placeholder: 'https://your-domain.com', help: 'Your deployed application URL (no trailing slash)' },
      { key: 'support_email', label: 'Support Email', type: 'text', placeholder: 'support@your-domain.com', help: 'Displayed in automated emails and error pages' },
    ],
  },
  {
    title: 'Google OAuth (SSO)',
    icon: '🔐',
    description: 'Enable "Sign in with Google" for your users.',
    fields: [
      { key: 'google_client_id', label: 'Client ID', type: 'text', placeholder: '123456789.apps.googleusercontent.com', help: 'From Google Cloud Console → Credentials' },
      { key: 'google_client_secret', label: 'Client Secret', type: 'password', placeholder: 'GOCSPX-...', help: 'Keep this secret. Never expose it client-side.' },
    ],
  },
  {
    title: 'Email (SMTP)',
    icon: '📧',
    description: 'Configure outgoing email for password resets, notifications, and digests.',
    fields: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.resend.com' },
      { key: 'smtp_port', label: 'SMTP Port', type: 'number', placeholder: '587' },
      { key: 'smtp_user', label: 'SMTP Username', type: 'text', placeholder: 'resend' },
      { key: 'smtp_pass', label: 'SMTP Password', type: 'password', placeholder: 're_...' },
      { key: 'smtp_from', label: 'From Address', type: 'text', placeholder: 'noreply@your-domain.com' },
    ],
  },
];

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/discover'); return; }
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      if (!data.error) setValues(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Settings saved', `${data.updated} setting(s) updated.`);
        // Refresh to get masked values
        const fresh = await fetch('/api/admin/settings').then(r => r.json());
        if (!fresh.error) setValues(fresh);
      } else {
        addToast('error', 'Save failed', data.error);
      }
    } catch {
      addToast('error', 'Save failed', 'Network error');
    }
    setSaving(false);
  };

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: 'var(--space-6)' }} />
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }} />)}
    </div>
  );

  return (
    <div className="animate-fadeIn" style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <button className="btn btn-ghost" onClick={() => router.push('/admin')}>← Back</button>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>🔑 API Keys & Configuration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Manage your platform&apos;s API keys and service integrations. Changes take effect immediately.
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="card" style={{ borderColor: 'var(--warning)', marginBottom: 'var(--space-6)', background: 'var(--warning-bg)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 'var(--space-1)' }}>Sensitive Information</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              API keys are encrypted and stored securely. Existing secrets are masked — only update a field if you need to change it.
              Leaving a masked field unchanged will preserve the existing value.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      {SECTIONS.map((section, si) => (
        <div key={section.title} className="card animate-fadeInUp" style={{
          animationDelay: `${si * 60}ms`, animationFillMode: 'both', marginBottom: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: '24px' }}>{section.icon}</span>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{section.title}</h2>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
            {section.description}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {section.fields.map(field => (
              <div key={field.key} className="input-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{field.label}</span>
                  {field.type === 'password' && (
                    <button className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                      onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}>
                      {showSecrets[field.key] ? '🙈 Hide' : '👁️ Show'}
                    </button>
                  )}
                </label>
                <input
                  className="input"
                  type={field.type === 'password' && !showSecrets[field.key] ? 'password' : field.type === 'number' ? 'number' : 'text'}
                  placeholder={field.placeholder}
                  value={values[field.key] || ''}
                  onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  style={{ fontFamily: field.type === 'password' ? 'var(--font-mono)' : 'inherit', fontSize: 'var(--text-sm)' }}
                />
                {field.help && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                    {field.help}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save Button */}
      <div style={{ position: 'sticky', bottom: 0, padding: 'var(--space-4) 0', background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-default)', zIndex: 10 }}>
        <button className="btn btn-gradient btn-lg" onClick={handleSave} disabled={saving}
          style={{ width: '100%' }}>
          {saving ? <><span className="spinner spinner-sm" /> Saving...</> : '💾 Save All Settings'}
        </button>
      </div>
    </div>
  );
}
