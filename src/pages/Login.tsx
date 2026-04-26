import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Lock, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import loginDarkBg from '@/assets/astana-login-dark-bg.png';
import loginLightBg from '@/assets/astana-login-light-bg.png';

type LoginStep = 'credentials' | 'otp';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<LoginStep>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const { signIn, verify2FA } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cardClassName = cn(
    'relative overflow-hidden rounded-2xl border backdrop-blur-xl',
    isDark
      ? 'border-white/15 bg-slate-950/72 text-white shadow-[0_24px_70px_hsl(222_47%_4%/0.64),0_0_80px_hsl(207_85%_32%/0.16)]'
      : 'border-white/70 bg-white/82 text-slate-950 shadow-[0_16px_46px_hsl(218_44%_34%/0.12)]'
  );
  const labelClassName = cn('flex items-center gap-2', isDark ? 'text-slate-100' : 'text-slate-800');
  const inputClassName = cn(
    'transition-all duration-300',
    isDark
      ? 'border-white/12 bg-white/[0.07] text-white placeholder:text-slate-400 focus:border-white/28 focus:bg-white/[0.09] focus:ring-sky-300/10'
      : 'border-slate-900/10 bg-white/72 text-slate-950 placeholder:text-slate-400 focus:border-slate-400/70 focus:bg-white/90 focus:ring-slate-400/20'
  );

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.error) {
        toast({
          title: t('common.error'),
          description: t('auth.wrongCredentials'),
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (result.requires2FA && result.tempToken) {
        setTempToken(result.tempToken);
        setStep('otp');
        setIsLoading(false);
        return;
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: t('common.error'),
        description: t('auth.wrongCredentials'),
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken || otpCode.length !== 6) return;
    setIsLoading(true);

    try {
      const result = await verify2FA(tempToken, otpCode);

      if (result.error) {
        toast({
          title: t('common.error'),
          description: 'OTP коды қате',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('OTP verification error:', error);
      toast({
        title: t('common.error'),
        description: 'Тексеру кезінде қате орын алды',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } },
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <motion.img
        src={loginLightBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center opacity-100 brightness-[1.02] saturate-[0.98] dark:hidden"
        animate={{ scale: [1, 1.026, 1], x: [0, -10, 0], y: [0, 7, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.img
        src={loginDarkBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 hidden h-full w-full object-cover object-center opacity-100 brightness-[0.72] saturate-[1.06] dark:block"
        animate={{ scale: [1, 1.022, 1], x: [0, 11, 0], y: [0, -7, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-white/10 dark:bg-slate-950/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,transparent_0%,transparent_45%,hsl(216_44%_90%/0.34)_100%)] dark:bg-[radial-gradient(ellipse_at_50%_34%,transparent_0%,transparent_42%,hsl(222_47%_4%/0.72)_100%)]" />
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 opacity-45 dark:opacity-55"
        style={{
          background:
            'radial-gradient(ellipse at 68% 28%, hsl(205 88% 62% / 0.16), transparent 34%), radial-gradient(ellipse at 28% 78%, hsl(var(--gold) / 0.12), transparent 30%)',
        }}
        animate={{ x: [0, 18, 0], y: [0, -14, 0], opacity: isDark ? [0.45, 0.68, 0.45] : [0.32, 0.55, 0.32] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.09] dark:opacity-[0.16]"
        style={{
          background:
            'linear-gradient(116deg, transparent 0%, transparent 42%, hsl(205 86% 70% / 0.28) 42.25%, transparent 42.7%, transparent 68%, hsl(var(--gold) / 0.18) 68.25%, transparent 68.7%), linear-gradient(67deg, transparent 0%, transparent 56%, hsl(205 86% 70% / 0.18) 56.2%, transparent 56.55%)',
        }}
        animate={{ x: [-26, 26, -26], y: [0, -10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.06] dark:opacity-[0.11]"
        style={{
          background:
            'radial-gradient(circle at center, hsl(210 40% 96% / 0.72) 0 1px, transparent 1.35px), linear-gradient(hsl(210 40% 96% / 0.14) 1px, transparent 1px), linear-gradient(90deg, hsl(210 40% 96% / 0.14) 1px, transparent 1px)',
          backgroundSize: '44px 44px, 110px 110px, 110px 110px',
        }}
        animate={{ backgroundPosition: ['0px 0px, 0px 0px, 0px 0px', '44px 44px, 28px 18px, 18px 28px'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="absolute top-4 right-4 flex items-center gap-2 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <LanguageSelector variant="glass" />
        <ThemeToggle />
      </motion.div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95, rotateY: -10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.95, rotateY: 10 }}
            transition={{ type: "spring", stiffness: 170, damping: 22, mass: 0.9 }}
            whileHover={{ scale: 1.014 }}
            whileTap={{ scale: 0.998 }}
            whileFocus={{ scale: 1.01 }}
            style={{ transformOrigin: 'center' }}
          >
            <Card className={cardClassName}>
              <motion.div
                className="pointer-events-none absolute -inset-px z-10 rounded-2xl opacity-30"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0deg, hsl(var(--gold) / 0.12) 28deg, transparent 62deg, transparent 152deg, hsl(var(--gold) / 0.44) 178deg, hsl(var(--gold) / 0.12) 202deg, transparent 238deg, transparent 360deg)',
                  WebkitMask:
                    'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  padding: 1,
                  filter: 'drop-shadow(0 0 7px hsl(var(--gold) / 0.14))',
                }}
                animate={{ opacity: [0.18, 0.24, 0.56, 0.24, 0.18], rotate: [0, 95, 220, 310, 360] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 0.58, 0.74, 1] }}
              />
              <div className="h-px bg-gradient-to-r from-gold/70 via-gold/25 to-transparent" />

              <CardHeader className="space-y-1 text-center pb-2">
                <motion.div className="flex justify-center mb-4" variants={itemVariants}>
                  <motion.div className="relative" whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }} transition={{ duration: 0.5 }}>
                    <motion.div
                      className="absolute -inset-4 rounded-full bg-gold/10 blur-xl"
                      animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <img src={logo} alt="Qazaq Generation" className="h-24 w-auto relative z-10" />
                  </motion.div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <CardTitle className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-[#10213f]')}>
                    Qazaq Generation
                  </CardTitle>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <CardDescription className={cn('text-center', isDark ? 'text-slate-300' : 'text-slate-500')}>
                    {step === 'credentials' ? t('auth.helpdesk') : t('auth.2fa')}
                  </CardDescription>
                </motion.div>
              </CardHeader>

              {step === 'credentials' ? (
                <form onSubmit={handleCredentialsSubmit}>
                  <CardContent className="space-y-4">
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="email" className={labelClassName}>
                        <Mail className="h-4 w-4 text-gold" />
                        {t('auth.email')}
                      </Label>
                      <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} className={inputClassName} />
                    </motion.div>
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="password" className={labelClassName}>
                        <Lock className="h-4 w-4 text-gold" />
                        {t('auth.password')}
                      </Label>
                      <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} className={inputClassName} />
                    </motion.div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <motion.div className="w-full" variants={itemVariants}>
                      <Button type="submit" className="group relative w-full overflow-hidden bg-gold text-slate-950 transition-all duration-300 hover:bg-gold/90" disabled={isLoading}>
                        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/28 opacity-0 blur-sm transition-all duration-700 group-hover:left-[115%] group-hover:opacity-100" />
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('auth.login')}
                      </Button>
                    </motion.div>
                    <motion.p className={cn('text-center text-sm', isDark ? 'text-slate-300/85' : 'text-slate-600')} variants={itemVariants}>
                      {t('auth.noAccount')}{' '}
                      <Link to="/register" className="text-gold hover:text-gold/80 hover:underline font-medium transition-colors">
                        {t('auth.register')}
                      </Link>
                    </motion.p>
                  </CardFooter>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit}>
                  <CardContent className="space-y-4">
                    <motion.div className="flex justify-center mb-4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                      <motion.div className="rounded-full bg-gold/[0.12] p-4" animate={{ boxShadow: ["0 0 18px hsl(42 80% 55% / 0.12)", "0 0 28px hsl(42 80% 55% / 0.18)", "0 0 18px hsl(42 80% 55% / 0.12)"] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                        <Shield className="h-12 w-12 text-gold" />
                      </motion.div>
                    </motion.div>
                    <motion.p className={cn('text-center text-sm', isDark ? 'text-slate-300/85' : 'text-slate-600')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                      {t('auth.enterOtp')}
                    </motion.p>
                    <motion.div className="flex justify-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <InputOTP maxLength={6} value={otpCode} onChange={(value) => setOtpCode(value)} disabled={isLoading}>
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <motion.div key={index} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + index * 0.1 }}>
                              <InputOTPSlot index={index} className="border-border/50" />
                            </motion.div>
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </motion.div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="group relative w-full overflow-hidden bg-gold text-slate-950 transition-all duration-300 hover:bg-gold/90" disabled={isLoading || otpCode.length !== 6}>
                      <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/28 opacity-0 blur-sm transition-all duration-700 group-hover:left-[115%] group-hover:opacity-100" />
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('auth.verify')}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full hover:text-gold" onClick={() => { setStep('credentials'); setOtpCode(''); }}>
                      {t('auth.back')}
                    </Button>
                  </CardFooter>
                </form>
              )}

              <div className="h-px bg-gradient-to-r from-transparent via-gold/25 to-gold/60" />
            </Card>
          </motion.div>
        </AnimatePresence>

        <motion.p className={cn('mt-6 text-center text-xs', isDark ? 'text-slate-400' : 'text-slate-500')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          © 2026 Qazaq Generation. ITSM & Service Desk Platform
        </motion.p>
      </motion.div>
    </main>
  );
}
