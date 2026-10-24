import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import '../styles/Auth.css';

const time = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const deadline = data => Date.now() + Math.max(0, Date.parse(data.expiresAt) - Date.parse(data.serverTime));
const savedRequest = () => {
  try {
    const value = JSON.parse(sessionStorage.getItem('password-reset-request') || 'null');
    return value && typeof value.email === 'string' && typeof value.requestId === 'string' && /^[a-f\d]{64}$/.test(value.requestId) &&
      Number.isFinite(value.expiresAt) && value.expiresAt > Date.now() ? value : null;
  } catch { return null; }
};

export default function ResetPassword() {
  const [initial] = useState(savedRequest);
  const [email, setEmail] = useState(initial?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stage, setStage] = useState(initial ? 'code' : 'email');
  const [requestId, setRequestId] = useState(initial?.requestId || '');
  const [resetToken, setResetToken] = useState('');
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt || 0);
  const [resendAt, setResendAt] = useState(Number.isFinite(initial?.resendAt) ? initial.resendAt : 0);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inFlight = useRef(false);
  const { t } = useLanguage();
  const { user, checkAuth } = useContext(AuthContext);
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendRemaining = Math.max(0, Math.ceil((Math.max(resendAt, blockedUntil) - now) / 1000));
  const blocked = Math.max(0, Math.ceil((blockedUntil - now) / 1000));

  useEffect(() => {
    try {
      if (stage === 'code' && requestId) sessionStorage.setItem('password-reset-request', JSON.stringify({ email, requestId, expiresAt, resendAt }));
      else sessionStorage.removeItem('password-reset-request');
    } catch { /* Storage may be unavailable; the active page still works. */ }
    // Only the pending request is retained. Codes, passwords and reset grants are never persisted.
  }, [stage, requestId, email, expiresAt, resendAt]);

  useEffect(() => {
    if (stage === 'success') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [stage]);

  const post = async (action, body) => {
    const response = await fetch(`${API_URL}/auth/password-reset/${action}`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.message), { code: data.code, retryAfter: data.retryAfter });
    return data;
  };
  const fail = err => {
    const key = `resetPassword.errors.${err.code || 'UNAVAILABLE'}`;
    setError(t(key) === key ? t('resetPassword.errors.UNAVAILABLE') : t(key));
    if (err.retryAfter) setBlockedUntil(Date.now() + err.retryAfter * 1000);
    setNow(Date.now());
  };
  const run = async action => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try { await action(); } catch (err) { fail(err); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const sendCode = () => run(async () => {
    const data = await post('request', { email: email.trim() });
    setRequestId(data.requestId); setExpiresAt(deadline(data));
    setResendAt(Date.now() + data.resendAfter * 1000); setNow(Date.now());
    setCode(''); setResetToken(''); setPassword(''); setConfirmPassword(''); setStage('code');
  });
  const verifyCode = () => run(async () => {
    const data = await post('verify', { requestId, code });
    setResetToken(data.resetToken); setExpiresAt(deadline(data)); setNow(Date.now()); setCode(''); setStage('password');
  });
  const savePassword = () => run(async () => {
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) throw { code: 'INVALID_PASSWORD' };
    if (password !== confirmPassword) throw { code: 'PASSWORD_MISMATCH' };
    await post('complete', { requestId, resetToken, password, confirmPassword });
    setResetToken(''); setPassword(''); setConfirmPassword(''); setCode(''); setStage('success');
    if (user) await checkAuth();
  });
  const startOver = () => {
    setStage('email'); setRequestId(''); setResetToken(''); setCode(''); setPassword(''); setConfirmPassword(''); setExpiresAt(0); setError('');
  };
  const submit = event => {
    event.preventDefault();
    if (busy || blocked) return;
    if (stage === 'email') sendCode();
    else if (stage === 'code' && remaining) verifyCode();
    else if (stage === 'password' && remaining) savePassword();
  };
  const active = ['email', 'code', 'password'].indexOf(stage);

  return <main className="auth-page auth-reset-page">
    <div className="container"><div className="auth-container"><div className="auth-card">
      <header className="auth-header"><h1>{t('resetPassword.title')}</h1></header>
      {stage !== 'success' && <ol className="auth-reset-steps" aria-label={t('resetPassword.stepsLabel')}>
        {['emailStep', 'codeStep', 'passwordStep'].map((key, index) => <li key={key} className={index <= active ? 'active' : ''}
          aria-current={index === active ? 'step' : undefined}><span>{index < active ? <Check size={12} /> : index + 1}</span>{t(`resetPassword.${key}`)}</li>)}
      </ol>}
      {error && <div className="error-message" role="alert">{error}</div>}
      {stage === 'success' ? <div className="auth-reset-success" role="status">
        <Check size={28} /><h2>{t('resetPassword.successTitle')}</h2><p>{t('resetPassword.successMessage')}</p>
        <Link to="/login" className="btn btn-primary auth-submit">{t('resetPassword.backToLogin')}</Link>
      </div> : <form className="auth-form" onSubmit={submit}>
        {stage === 'email' && <div className="form-group">
          <label className="form-label" htmlFor="reset-email">{t('login.email')}</label>
          <input id="reset-email" className="form-input" type="email" name="email" autoComplete="email" required maxLength={254}
            placeholder={t('login.emailPlaceholder')} value={email} disabled={busy} onChange={event => { setEmail(event.target.value); setError(''); }} />
        </div>}
        {stage === 'code' && <>
          <p className="auth-reset-notice">{t('resetPassword.requestMessage')}</p>
          <div className="auth-reset-address"><span>{email.trim()}</span><button type="button" disabled={busy} onClick={startOver}>{t('resetPassword.changeEmail')}</button></div>
          <div className="form-group"><label className="form-label" htmlFor="reset-code">{t('resetPassword.codeLabel')}</label>
            <input id="reset-code" className="form-input auth-reset-code" type="text" inputMode="numeric" name="code" autoComplete="one-time-code"
              minLength={8} maxLength={8} pattern="[0-9]{8}" required value={code} disabled={busy || !remaining}
              placeholder="00000000" autoFocus onChange={event => { setCode(event.target.value.replace(/\D/g, '')); setError(''); }} />
          </div>
        </>}
        {stage === 'password' && <>
          <p className="auth-reset-notice">{t('resetPassword.passwordHint')}</p>
          {[['new-password', 'newPassword', password, setPassword], ['confirm-password', 'confirmPassword', confirmPassword, setConfirmPassword]].map(([id, label, value, setValue]) =>
            <div className="form-group" key={id}><label className="form-label" htmlFor={id}>{t(`resetPassword.${label}`)}</label>
              <div className="password-input-wrapper"><input id={id} name={id} type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                className="form-input" required minLength={8} maxLength={72} disabled={busy || !remaining} value={value}
                onChange={event => { setValue(event.target.value); setError(''); }} />
                <button type="button" className="password-toggle" disabled={busy} onClick={() => setShowPassword(!showPassword)}
                  aria-label={t(showPassword ? 'resetPassword.hidePassword' : 'resetPassword.showPassword')}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>)}
        </>}
        {stage !== 'email' && <p className="auth-reset-expiry">{remaining ? <>{t('resetPassword.expiresIn')} <time>{time(remaining)}</time></> : t('resetPassword.expired')}</p>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={busy || Boolean(blocked) || (stage !== 'email' && !remaining)}>
          {busy ? <Loader2 size={18} className="auth-spinner" aria-label={t('resetPassword.processing')} /> : t(stage === 'email' ? 'resetPassword.send' : stage === 'code' ? 'resetPassword.verify' : 'resetPassword.save')}
        </button>
        {Boolean(blocked) && <p className="auth-reset-notice" role="status">{t('resetPassword.tryAgainIn')} {time(blocked)}</p>}
        {stage === 'code' && <button className="auth-reset-text-button" type="button" disabled={busy || Boolean(resendRemaining)} onClick={sendCode}>
          {t('resetPassword.resend')}{resendRemaining ? ` (${time(resendRemaining)})` : ''}
        </button>}
        {stage === 'password' && !remaining && <button type="button" className="auth-reset-text-button" onClick={startOver}>{t('resetPassword.requestNew')}</button>}
      </form>}
      {stage !== 'success' && <div className="auth-reset-footer"><Link to="/login" className="auth-link">{t('resetPassword.backToLogin')}</Link></div>}
    </div></div></div>
  </main>;
}
