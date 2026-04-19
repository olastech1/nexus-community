import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { certificates, courses, profiles, communities } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/certificates/[id]/pdf — generate a certificate PDF as HTML
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get certificate with related data
    const [cert] = await db.select({
      id: certificates.id,
      certificateNumber: certificates.certificateNumber,
      issuedAt: certificates.issuedAt,
      courseTitle: courses.title,
      userName: profiles.displayName,
      userEmail: profiles.email,
      communityId: courses.communityId,
    })
    .from(certificates)
    .leftJoin(courses, eq(certificates.courseId, courses.id))
    .leftJoin(profiles, eq(certificates.userId, profiles.id))
    .where(eq(certificates.id, id))
    .limit(1);

    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // Get community name
    let communityName = 'Nexus';
    if (cert.communityId) {
      const [community] = await db.select().from(communities).where(eq(communities.id, cert.communityId)).limit(1);
      if (community) communityName = community.name;
    }

    const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // Generate a beautiful HTML certificate
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certificate - ${cert.courseTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      width: 1056px;
      height: 816px;
      background: #0a0a0f;
      color: #fff;
      font-family: 'Inter', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .certificate {
      width: 980px;
      height: 740px;
      position: relative;
      background: linear-gradient(135deg, #0d0d14 0%, #1a1a2e 50%, #0d0d14 100%);
      border: 2px solid rgba(229, 115, 115, 0.3);
      border-radius: 12px;
      padding: 60px 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .certificate::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at 30% 20%, rgba(229, 115, 115, 0.06) 0%, transparent 50%),
                  radial-gradient(circle at 70% 80%, rgba(229, 115, 115, 0.04) 0%, transparent 50%);
      pointer-events: none;
    }

    .corner-decoration {
      position: absolute;
      width: 80px;
      height: 80px;
      border-color: rgba(229, 115, 115, 0.4);
      border-style: solid;
    }
    .corner-tl { top: 20px; left: 20px; border-width: 3px 0 0 3px; border-radius: 8px 0 0 0; }
    .corner-tr { top: 20px; right: 20px; border-width: 3px 3px 0 0; border-radius: 0 8px 0 0; }
    .corner-bl { bottom: 20px; left: 20px; border-width: 0 0 3px 3px; border-radius: 0 0 0 8px; }
    .corner-br { bottom: 20px; right: 20px; border-width: 0 3px 3px 0; border-radius: 0 0 8px 0; }

    .badge {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 4px;
      color: rgba(229, 115, 115, 0.8);
      font-weight: 600;
      margin-bottom: 16px;
    }

    .title {
      font-family: 'Playfair Display', serif;
      font-size: 48px;
      font-weight: 900;
      background: linear-gradient(135deg, #e57373, #ef9a9a, #e57373);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }

    .subtitle {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 40px;
      letter-spacing: 1px;
    }

    .presented-to {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: rgba(255, 255, 255, 0.4);
      margin-bottom: 8px;
    }

    .recipient {
      font-family: 'Playfair Display', serif;
      font-size: 36px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 24px;
    }

    .course-label {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: rgba(255, 255, 255, 0.4);
      margin-bottom: 8px;
    }

    .course-name {
      font-size: 22px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 40px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
      padding-top: 24px;
      border-top: 1px solid rgba(229, 115, 115, 0.15);
    }

    .footer-item {
      text-align: center;
    }

    .footer-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.3);
      margin-bottom: 4px;
    }

    .footer-value {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 500;
    }

    .cert-number {
      font-family: monospace;
      font-size: 11px;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="corner-decoration corner-tl"></div>
    <div class="corner-decoration corner-tr"></div>
    <div class="corner-decoration corner-bl"></div>
    <div class="corner-decoration corner-br"></div>

    <div class="badge">Certificate of Completion</div>
    <div class="title">Nexus Academy</div>
    <div class="subtitle">${communityName}</div>

    <div class="presented-to">This is to certify that</div>
    <div class="recipient">${cert.userName || 'Student'}</div>

    <div class="course-label">Has successfully completed</div>
    <div class="course-name">${cert.courseTitle || 'Course'}</div>

    <div class="footer">
      <div class="footer-item">
        <div class="footer-label">Date Issued</div>
        <div class="footer-value">${issuedDate}</div>
      </div>
      <div class="footer-item">
        <div class="footer-label">Platform</div>
        <div class="footer-value">Nexus Community</div>
      </div>
      <div class="footer-item">
        <div class="footer-label">Certificate ID</div>
        <div class="footer-value cert-number">${cert.certificateNumber}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
