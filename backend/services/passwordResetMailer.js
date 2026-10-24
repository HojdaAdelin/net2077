export function resetMailConfigured() {
  return Boolean(process.env.EMAIL_FURNIZOR?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.EMAIL?.trim() || '') && process.env.JWT_SECRET);
}

export const passwordResetMailer = {
  async send({ to, code }) {
    if (!resetMailConfigured()) throw new Error('Password reset mail is not configured.');
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { 'api-key': process.env.EMAIL_FURNIZOR.trim(), 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'NET2077', email: process.env.EMAIL.trim() }, to: [{ email: to }],
        subject: 'NET2077 - Password reset code',
        htmlContent: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#242424">
          <h1 style="font-size:22px">Reset your NET2077 password</h1>
          <p>Enter this code on the password reset page:</p>
          <p style="font-size:32px;letter-spacing:6px;font-weight:bold">${code}</p>
          <p>This code expires in 15 minutes and can only be used once.</p>
          <p>If you did not request this reset, ignore this email. Your password has not changed.</p>
          <p><a href="https://net2077.com/reset-password">net2077.com/reset-password</a></p></div>`
      })
    });
    // Consume the response before the serverless invocation ends.
    await response.arrayBuffer();
    if (!response.ok) throw Object.assign(new Error('Password reset email delivery failed.'), { providerStatus: response.status });
  }
};
