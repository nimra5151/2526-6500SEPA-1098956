import nodemailer from "nodemailer";

// #21: HTML-escape user-supplied data before inserting into email templates
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// #26: Basic email address format validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// #168: Dark-mode email wrapper — uses @media prefers-color-scheme
function emailWrapper(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 0; background-color: #f8fafc; }
    .email-card { background-color: #ffffff; color: #334155; border: 1px solid #e2e8f0; }
    .email-muted { color: #64748b; }
    .email-footer { color: #94a3b8; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #0f172a !important; }
      .email-card { background-color: #1e293b !important; color: #e2e8f0 !important; border-color: #334155 !important; }
      .email-muted { color: #94a3b8 !important; }
      .email-footer { color: #64748b !important; }
    }
  </style>
</head>
<body style="font-family:Arial,sans-serif;background-color:#f8fafc;padding:24px 0;">
  <div style="max-width:600px;margin:0 auto;">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

// #25: Retry helper for transient SMTP failures
async function sendWithRetry(mailOptions: nodemailer.SendMailOptions, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      return;
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendBookingConfirmationEmail(to: string, studentName: string, className: string, date: string) {
  if (!process.env.SMTP_USER) return;
  if (!isValidEmail(to)) { console.warn(`[email] Invalid address skipped: ${to}`); return; } // #26
  try {
    await sendWithRetry({ // #25
      from: `"TutorBridge" <${process.env.SMTP_USER}>`,
      to,
      subject: "Booking Confirmed — TutorBridge",
      html: emailWrapper(`
          <div style="background:linear-gradient(135deg,#667EEA,#764BA2);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:28px;">Booking Confirmed!</h1>
          </div>
          <div class="email-card" style="padding:32px;border-radius:0 0 12px 12px;">
            <p style="font-size:16px;">Hi <strong>${escapeHtml(studentName)}</strong>,</p>
            <p style="font-size:16px;">Your booking for <strong>${escapeHtml(className)}</strong> has been confirmed!</p>
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:20px 0;">
              <p class="email-muted" style="margin:0;font-size:14px;">📅 Date: <strong>${escapeHtml(date)}</strong></p>
            </div>
            <p class="email-muted" style="font-size:14px;">Log in to TutorBridge to view your full booking details.</p>
            <p class="email-footer" style="font-size:12px;margin-top:24px;">TutorBridge — Empowering Learners, Inspiring Futures</p>
          </div>
      `),
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  if (!process.env.SMTP_USER) return;
  if (!isValidEmail(to)) throw new Error(`Invalid email address: ${to}`); // #26
  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  // #22: Re-throw so callers know if delivery failed
  await sendWithRetry({ // #25
    from: `"TutorBridge" <${process.env.SMTP_USER}>`,
    to,
    subject: "Reset your password — TutorBridge",
    html: emailWrapper(`
        <div style="background:linear-gradient(135deg,#667EEA,#764BA2);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;">Reset Your Password</h1>
        </div>
        <div class="email-card" style="padding:32px;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;">Hi <strong>${escapeHtml(name)}</strong>,</p>
          <p style="font-size:16px;">We received a request to reset your TutorBridge password. Click the button below to choose a new password.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#667EEA,#764BA2);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Reset Password</a>
          </div>
          <p class="email-muted" style="font-size:14px;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
          <p class="email-footer" style="font-size:12px;margin-top:24px;">TutorBridge — Empowering Learners, Inspiring Futures</p>
        </div>
    `),
  });
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  if (!process.env.SMTP_USER) return;
  if (!isValidEmail(to)) throw new Error(`Invalid email address: ${to}`); // #26
  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  const link = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  // #22: Re-throw so callers know if delivery failed
  await sendWithRetry({ // #25
    from: `"TutorBridge" <${process.env.SMTP_USER}>`,
    to,
    subject: "Verify your email — TutorBridge",
    html: emailWrapper(`
        <div style="background:linear-gradient(135deg,#667EEA,#764BA2);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;">Verify Your Email</h1>
        </div>
        <div class="email-card" style="padding:32px;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;">Hi <strong>${escapeHtml(name)}</strong>,</p>
          <p style="font-size:16px;">Thanks for joining TutorBridge! Click the button below to verify your email address.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#667EEA,#764BA2);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Verify Email</a>
          </div>
          <p class="email-muted" style="font-size:14px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          <p class="email-footer" style="font-size:12px;margin-top:24px;">TutorBridge — Empowering Learners, Inspiring Futures</p>
        </div>
    `),
  });
}

export async function sendWeeklyDigestEmail(
  to: string,
  coordinatorName: string,
  stats: {
    newEnrollments: number;
    completedCourses: number;
    activeTutors: number;
    newStudents: number;
    orphanage?: string;
  }
) {
  if (!process.env.SMTP_USER) return;
  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  const weeklyDigestHtml = emailWrapper(`
      <div style="background:linear-gradient(135deg,#667EEA,#764BA2);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">📊 Weekly Activity Digest</h1>
        <p style="color:#e2d9f3;margin:8px 0 0;font-size:14px;">${stats.orphanage ? stats.orphanage + ' · ' : ''}This Week's Summary</p>
      </div>
      <div class="email-card" style="padding:32px;border-radius:0 0 12px 12px;">
        <p style="font-size:16px;">Hi <strong>${escapeHtml(coordinatorName)}</strong>,</p>
        <p class="email-muted" style="font-size:14px;">Here's what happened on TutorBridge this week:</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0;">
          <div style="background:#f0f4ff;border-radius:10px;padding:20px;text-align:center;">
            <div style="font-size:36px;font-weight:bold;color:#4f46e5;">${stats.newEnrollments}</div>
            <div style="font-size:13px;color:#64748b;margin-top:4px;">New Enrollments</div>
          </div>
          <div style="background:#f0fdf4;border-radius:10px;padding:20px;text-align:center;">
            <div style="font-size:36px;font-weight:bold;color:#16a34a;">${stats.completedCourses}</div>
            <div style="font-size:13px;color:#64748b;margin-top:4px;">Courses Completed</div>
          </div>
          <div style="background:#fff7ed;border-radius:10px;padding:20px;text-align:center;">
            <div style="font-size:36px;font-weight:bold;color:#ea580c;">${stats.activeTutors}</div>
            <div style="font-size:13px;color:#64748b;margin-top:4px;">Active Tutors</div>
          </div>
          <div style="background:#fdf4ff;border-radius:10px;padding:20px;text-align:center;">
            <div style="font-size:36px;font-weight:bold;color:#9333ea;">${stats.newStudents}</div>
            <div style="font-size:13px;color:#64748b;margin-top:4px;">New Students</div>
          </div>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${baseUrl}/admin" style="display:inline-block;background:linear-gradient(135deg,#667EEA,#764BA2);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">View Admin Dashboard</a>
        </div>
        <p class="email-footer" style="font-size:12px;margin-top:24px;text-align:center;">TutorBridge — Empowering Learners, Inspiring Futures</p>
      </div>
  `);
  try {
    await sendWithRetry({
      from: `"TutorBridge" <${process.env.SMTP_USER}>`,
      to,
      subject: "Weekly Activity Digest - TutorBridge",
      html: weeklyDigestHtml,
    });
  } catch (err) {
    console.error("Weekly digest email failed:", err);
  }
}

export async function sendCourseCompletionEmail(to: string, studentName: string, courseName: string, verificationCode: string) {
  if (!process.env.SMTP_USER) return;
  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  try {
    await sendWithRetry({
      from: `"TutorBridge" <${process.env.SMTP_USER}>`,
      to,
      subject: `Congratulations! You completed "${courseName}" - TutorBridge`,
      html: emailWrapper(`
      <div style="background:linear-gradient(135deg,#16a34a,#10b981);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">Congratulations!</h1>
        <p style="color:#e2d9f3;margin:8px 0 0;font-size:14px;">You completed your course</p>
      </div>
      <div class="email-card" style="padding:32px;border-radius:0 0 12px 12px;">
        <p style="font-size:16px;">Hi <strong>${escapeHtml(studentName)}</strong>,</p>
        <p class="email-muted" style="font-size:14px;">You have completed <strong>${escapeHtml(courseName)}</strong> and a certificate has been issued to you.</p>
        <p style="font-size:14px;margin:16px 0;"><strong>Certificate Verification Code:</strong> ${escapeHtml(verificationCode)}</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${baseUrl}/verify/${escapeHtml(verificationCode)}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#10b981);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">View Certificate</a>
        </div>
        <p class="email-footer" style="font-size:12px;margin-top:24px;text-align:center;">TutorBridge - Empowering Learners, Inspiring Futures</p>
      </div>
  `),
    });
  } catch (err) {
    console.error("Course completion email failed:", err);
  }
}

export async function sendTutorApprovedEmail(to: string, tutorName: string) {
  if (!process.env.SMTP_USER) return;
  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  try {
    await sendWithRetry({
      from: `"TutorBridge" <${process.env.SMTP_USER}>`,
      to,
      subject: "Your tutor application has been approved - TutorBridge",
      html: emailWrapper(`
      <div style="background:linear-gradient(135deg,#16a34a,#10b981);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">Application Approved!</h1>
        <p style="color:#e2d9f3;margin:8px 0 0;font-size:14px;">Welcome to TutorBridge</p>
      </div>
      <div class="email-card" style="padding:32px;border-radius:0 0 12px 12px;">
        <p style="font-size:16px;">Hi <strong>${tutorName}</strong>,</p>
        <p class="email-muted" style="font-size:14px;">Congratulations! Your tutor application has been approved.</p>
        <p class="email-muted" style="font-size:14px;">You can now start creating classes and teaching students.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${baseUrl}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#10b981);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">Go to Dashboard</a>
        </div>
        <p class="email-footer" style="font-size:12px;margin-top:24px;text-align:center;">TutorBridge - Empowering Learners, Inspiring Futures</p>
      </div>
  `),
    });
  } catch (err) {
    console.error("Tutor approval email failed:", err);
  }
}

export async function sendTutorRejectedEmail(to: string, tutorName: string, reason?: string) {
  if (!process.env.SMTP_USER) return;
  try {
    await sendWithRetry({
      from: `"TutorBridge" <${process.env.SMTP_USER}>`,
      to,
      subject: "Tutor application update - TutorBridge",
      html: emailWrapper(`
      <div style="background:linear-gradient(135deg,#ea580c,#dc2626);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">Application Update</h1>
        <p style="color:#e2d9f3;margin:8px 0 0;font-size:14px;">Regarding your tutor application</p>
      </div>
      <div class="email-card" style="padding:32px;border-radius:0 0 12px 12px;">
        <p style="font-size:16px;">Hi <strong>${tutorName}</strong>,</p>
        <p class="email-muted" style="font-size:14px;">After review, we are unable to approve your tutor application at this time.</p>
        ${reason ? '<p class="email-muted" style="font-size:14px;">Reason: ' + escapeHtml(reason) + '</p>' : ''}
        <p class="email-muted" style="font-size:14px;">Please contact support if you have any questions.</p>
        <p class="email-footer" style="font-size:12px;margin-top:24px;text-align:center;">TutorBridge - Empowering Learners, Inspiring Futures</p>
      </div>
  `),
    });
  } catch (err) {
    console.error("Tutor rejection email failed:", err);
  }
}

export async function testEmailConnection(to: string): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.SMTP_USER) {
    return { ok: false, error: "SMTP_USER not set in .env — add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS" };
  }
  try {
    await transporter.sendMail({
      from: `"TutorBridge" <${process.env.SMTP_USER}>`,
      to,
      subject: "TutorBridge — Email configuration test",
      html: emailWrapper(`
          <div class="email-card" style="padding:32px;border-radius:12px;">
            <h2 style="color:#4f46e5;margin-top:0;">Email test successful!</h2>
            <p>If you received this, your SMTP configuration is working correctly.</p>
            <p class="email-footer" style="font-size:12px;margin-bottom:0;">TutorBridge — Empowering Learners, Inspiring Futures</p>
          </div>
      `),
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function sendAssignmentGradedEmail(to: string, studentName: string, assignmentTitle: string, grade: number, feedback: string) {
  if (!process.env.SMTP_USER) return;
  if (!isValidEmail(to)) { console.warn(`[email] Invalid address skipped: ${to}`); return; } // #26
  try {
    await sendWithRetry({ // #25
      from: `"TutorBridge" <${process.env.SMTP_USER}>`,
      to,
      subject: "Assignment Graded — TutorBridge",
      html: emailWrapper(`
          <div style="background:linear-gradient(135deg,#667EEA,#764BA2);padding:32px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:28px;">Assignment Graded</h1>
          </div>
          <div class="email-card" style="padding:32px;border-radius:0 0 12px 12px;">
            <p style="font-size:16px;">Hi <strong>${escapeHtml(studentName)}</strong>,</p>
            <p style="font-size:16px;">Your assignment <strong>${escapeHtml(assignmentTitle)}</strong> has been graded.</p>
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:20px 0;">
              <p class="email-muted" style="margin:0 0 8px;font-size:14px;">Score: <strong style="font-size:24px;color:#4f46e5">${grade}</strong></p>
              ${feedback ? '<p class="email-muted" style="margin:0;font-size:14px;">Feedback: ' + escapeHtml(feedback) + '</p>' : ''}
            </div>
            <p class="email-footer" style="font-size:12px;margin-top:24px;">TutorBridge — Empowering Learners, Inspiring Futures</p>
          </div>
      `),
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}
