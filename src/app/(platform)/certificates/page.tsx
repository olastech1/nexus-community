'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Certificate {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  courseTitle: string;
  courseDescription: string | null;
  courseThumbnail: string | null;
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCerts = async () => {
      try {
        const res = await fetch('/api/certificates');
        if (res.ok) {
          const data = await res.json();
          setCerts(data.items || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchCerts();
  }, []);

  const handleView = (certId: string) => {
    window.open(`/api/certificates/${certId}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: 'var(--space-4)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>🎓 My Certificates</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Certificates earned from completed courses.
        </p>
      </div>

      {certs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>🎓</div>
          <h3 style={{ fontWeight: 700, fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
            No certificates yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            Complete all lessons and pass all quizzes in a course to earn your first certificate.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {certs.map(cert => (
            <div key={cert.id} className="cert-card">
              <div className="cert-card-header">
                <div className="cert-card-badge">Certificate of Completion</div>
                <div className="cert-card-icon">🎓</div>
              </div>
              <div className="cert-card-body">
                <h3 style={{ fontWeight: 700, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
                  {cert.courseTitle}
                </h3>
                {cert.courseDescription && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
                    {cert.courseDescription.slice(0, 100)}{cert.courseDescription.length > 100 ? '...' : ''}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  <span>Issued {new Date(cert.issuedAt).toLocaleDateString()}</span>
                  <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{cert.certificateNumber}</span>
                </div>
              </div>
              <div className="cert-card-footer">
                <button className="btn btn-primary btn-sm" onClick={() => handleView(cert.id)} style={{ width: '100%' }}>
                  📄 View & Print Certificate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
