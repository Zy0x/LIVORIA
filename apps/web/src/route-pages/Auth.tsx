import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

import { ROUTES } from '@/app/route-paths';
import { AuthCard, AuthLogo } from '@/features/auth/components/AuthCard';
import { verifyAdminCredentials } from '@/features/auth/services/admin-auth.repository';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const { signIn, signInWithGoogle, signUp, user } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const oauthInFlightRef = useRef(false);
  const oauthResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOauthResetTimer = useCallback(() => {
    if (oauthResetTimerRef.current) {
      clearTimeout(oauthResetTimerRef.current);
      oauthResetTimerRef.current = null;
    }
  }, []);

  const resetOauthLoading = useCallback(() => {
    if (!oauthInFlightRef.current) return;
    oauthInFlightRef.current = false;
    clearOauthResetTimer();
    setLoading(false);
  }, [clearOauthResetTimer]);

  const resetTransientState = useCallback(() => {
    oauthInFlightRef.current = false;
    clearOauthResetTimer();
    setLoading(false);
    setError('');
    setSuccess('');
  }, [clearOauthResetTimer]);

  useEffect(() => {
    if (user) navigate(ROUTES.HOME, { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const resetWhenReturned = () => {
      if (!document.hidden) {
        resetOauthLoading();
      }
    };

    window.addEventListener('pageshow', resetWhenReturned);
    window.addEventListener('focus', resetWhenReturned);
    document.addEventListener('visibilitychange', resetWhenReturned);

    return () => {
      window.removeEventListener('pageshow', resetWhenReturned);
      window.removeEventListener('focus', resetWhenReturned);
      document.removeEventListener('visibilitychange', resetWhenReturned);
      clearOauthResetTimer();
    };
  }, [clearOauthResetTimer, resetOauthLoading]);

  useEffect(() => {
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { opacity: 0, y: -30, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' },
      );
    }
    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7, delay: 0.3, ease: 'power2.out' },
      );
    }
  }, []);

  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        { opacity: 0, x: isLogin ? -20 : 20 },
        { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' },
      );
    }
  }, [isLogin]);

  const handleModeChange = (nextIsLogin: boolean) => {
    resetTransientState();
    setIsLogin(nextIsLogin);
  };

  const handleGoogleLogin = async () => {
    setError('');
    clearOauthResetTimer();
    oauthInFlightRef.current = true;
    setLoading(true);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      oauthInFlightRef.current = false;
      setError(googleError.message);
      setLoading(false);
      return;
    }

    oauthResetTimerRef.current = setTimeout(() => {
      resetOauthLoading();
    }, 15000);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    oauthInFlightRef.current = false;
    clearOauthResetTimer();
    setLoading(true);

    if (!email || !password) {
      setError('Email dan password harus diisi.');
      setLoading(false);
      return;
    }

    if (isLogin && password.length >= 20) {
      try {
        const adminAuthenticated = await verifyAdminCredentials(email, password);
        if (adminAuthenticated) {
          sessionStorage.setItem('livoria_admin', JSON.stringify({ email, key: password, ts: Date.now() }));
          toast({ title: 'Admin login berhasil', description: 'Selamat datang, Pengembang!' });
          navigate(ROUTES.ADMIN, { replace: true });
          setLoading(false);
          return;
        }
      } catch (adminError) {
        console.error('Admin auth check failed:', adminError);
      }
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message === 'Invalid login credentials'
          ? 'Email atau password salah.'
          : signInError.message);
      }
    } else {
      const { error: signUpError } = await signUp(email, password);
      if (signUpError) {
        setError(signUpError.message.includes('already registered')
          ? 'Email sudah terdaftar. Silakan login.'
          : signUpError.message);
      } else {
        setSuccess('Registrasi berhasil! Cek email untuk verifikasi.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <AuthLogo logoRef={logoRef} />
        <AuthCard
          formRef={formRef}
          isLogin={isLogin}
          email={email}
          password={password}
          showPassword={showPassword}
          error={error}
          success={success}
          loading={loading}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onShowPasswordChange={setShowPassword}
          onModeChange={handleModeChange}
          onSubmit={handleSubmit}
          onGoogleLogin={handleGoogleLogin}
        />
      </div>
    </div>
  );
};

export default Auth;
