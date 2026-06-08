import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, CheckCircle2, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import registerBg from '@/assets/astana-register-bg.png';
import registerLightBg from '@/assets/astana-register-light-bg.png';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cardClassName = cn(
    'relative w-full overflow-hidden rounded-2xl',
    isDark
      ? 'border border-white/15 bg-slate-950/76 text-white shadow-[0_24px_70px_hsl(222_47%_4%/0.62),0_0_90px_hsl(207_85%_32%/0.18),0_0_30px_hsl(var(--gold)/0.06)] backdrop-blur-xl hover:shadow-[0_30px_82px_hsl(222_47%_4%/0.68),0_0_100px_hsl(207_85%_32%/0.20),0_0_34px_hsl(var(--gold)/0.08)]'
      : 'border border-white/70 bg-white/80 text-slate-950 shadow-[0_16px_46px_hsl(218_44%_34%/0.11),0_0_28px_hsl(var(--gold)/0.05)] backdrop-blur-[18px] hover:shadow-[0_20px_54px_hsl(218_44%_34%/0.14),0_0_32px_hsl(var(--gold)/0.07)]'
  );
  const labelClassName = cn(
    'flex items-center gap-2 text-sm font-medium',
    isDark ? 'text-slate-100' : 'text-slate-800'
  );
  const inputClassName = cn(
    'h-11 shadow-none transition-colors',
    isDark
      ? 'border-white/12 bg-white/[0.07] text-white placeholder:text-slate-400 focus:border-white/28 focus:bg-white/[0.09] focus:ring-sky-300/10'
      : 'border-slate-900/10 bg-white/70 text-slate-950 placeholder:text-slate-400 focus:border-slate-400/70 focus:bg-white/85 focus:ring-slate-400/20'
  );
  const getRedirectPath = () => {
    const value = new URLSearchParams(location.search).get('redirect');
    return value?.startsWith('/') && !value.startsWith('//') ? value : '/tickets';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedName = name.trim().replace(/\s+/g, ' ');
    if (normalizedName.split(' ').length < 3) {
      toast({
        title: t('common.error'),
        description: t('auth.fullNameRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, normalizedName);

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('auth.confirmEmail'),
      });
      navigate(getRedirectPath());
    }

    setIsLoading(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,hsl(214_60%_97%),hsl(218_45%_91%))] px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-10">
      <img
        src={registerLightBg}
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 hidden h-full min-h-full w-[145vw] max-w-none -translate-x-[34%] -translate-y-1/2 object-cover object-center opacity-100 brightness-[1.03] saturate-[1.03] dark:hidden md:block"
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100 brightness-[1.03] saturate-[1.03] dark:hidden md:hidden"
        style={{ backgroundImage: `url(${registerLightBg})` }}
      />
      <div
        className="absolute -inset-4 hidden scale-[1.03] bg-cover bg-center opacity-90 blur-[2.5px] brightness-[0.46] saturate-[1.08] dark:block"
        style={{ backgroundImage: `url(${registerBg})` }}
      />
      <div className="absolute inset-0 bg-white/8 dark:bg-black/48 dark:backdrop-blur-[1.75px]" />
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_16%,hsl(212_75%_42%/0.06),transparent_38%),radial-gradient(ellipse_at_18%_78%,hsl(var(--gold)/0.05),transparent_34%),linear-gradient(to_bottom,hsl(214_62%_98%/0.06),hsl(218_44%_90%/0.26))] dark:bg-[radial-gradient(ellipse_at_70%_18%,hsl(205_90%_58%/0.14),transparent_38%),radial-gradient(ellipse_at_18%_78%,hsl(var(--gold)/0.08),transparent_34%),linear-gradient(to_bottom,hsl(222_47%_7%/0.34),hsl(222_47%_5%/0.72))]"
        animate={{ x: [0, 2, 0], y: [0, -2, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.065] bg-[radial-gradient(circle_at_center,hsl(215_45%_20%/0.50)_0_1px,transparent_1.4px),linear-gradient(hsl(215_45%_20%/0.12)_1px,transparent_1px),linear-gradient(90deg,hsl(215_45%_20%/0.12)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,hsl(210_40%_96%/0.55)_0_1px,transparent_1.4px),linear-gradient(hsl(210_40%_96%/0.12)_1px,transparent_1px),linear-gradient(90deg,hsl(210_40%_96%/0.12)_1px,transparent_1px)] bg-[size:42px_42px,96px_96px,96px_96px]" />
      <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.16] bg-[linear-gradient(28deg,transparent_0%,transparent_38%,hsl(210_70%_38%/0.10)_38.2%,transparent_38.8%),linear-gradient(151deg,transparent_0%,transparent_66%,hsl(210_70%_38%/0.08)_66.2%,transparent_66.8%)] dark:bg-[linear-gradient(28deg,transparent_0%,transparent_38%,hsl(204_80%_70%/0.12)_38.2%,transparent_38.8%),linear-gradient(151deg,transparent_0%,transparent_66%,hsl(204_80%_70%/0.10)_66.2%,transparent_66.8%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_68%,hsl(218_38%_84%/0.26)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_54%,hsl(222_47%_4%/0.52)_100%)]" />

      {/* Theme and Language controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <LanguageSelector variant="glass" />
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center gap-12 dark:max-w-6xl dark:gap-10 lg:grid-cols-[1fr_0.74fr] dark:lg:grid-cols-[1.08fr_0.92fr]">
        <motion.section
          className="hidden -translate-y-8 lg:block dark:translate-y-0"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="max-w-2xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/62 px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_8px_24px_hsl(218_44%_34%/0.06)] backdrop-blur-[10px] dark:border-white/12 dark:bg-white/[0.06] dark:text-slate-200 dark:shadow-sm dark:backdrop-blur-md">
              <Building2 className="h-4 w-4 text-gold" />
              {t('auth.registerHeroEyebrow')}
            </div>

            <h1 className="max-w-2xl text-4xl font-bold leading-[1.06] tracking-[-0.025em] text-[#10213f] dark:text-white xl:text-5xl">
              {t('auth.registerHeroTitle')}
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-300">
              {t('auth.registerHeroSubtitle')}
            </p>

            <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
              {[
                { icon: ShieldCheck, label: t('auth.secureAccess') },
                { icon: CheckCircle2, label: t('auth.enterpriseReady') },
                { icon: Building2, label: t('auth.serviceDesk') },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-2xl border border-white/70 bg-white/82 p-3.5 shadow-[0_8px_28px_hsl(218_44%_34%/0.055)] backdrop-blur-0 dark:border-white/[0.07] dark:bg-white/[0.035] dark:shadow-none dark:backdrop-blur-sm">
                  <Icon className="mb-2.5 h-5 w-5 text-gold/90" />
                  <p className="text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.div
          className="w-full max-w-md justify-self-center lg:justify-self-end"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 170, damping: 22, mass: 0.9 }}
          whileHover={{ scale: 1.014 }}
          whileTap={{ scale: 0.998 }}
          style={{ transformOrigin: 'center' }}
        >
        <Card className={cardClassName}>
          <motion.div
            className="pointer-events-none absolute -inset-px z-10 rounded-2xl opacity-35"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, hsl(var(--gold) / 0.16) 24deg, transparent 58deg, transparent 145deg, hsl(var(--gold) / 0.58) 174deg, hsl(var(--gold) / 0.18) 198deg, transparent 232deg, transparent 360deg)',
              WebkitMask:
                'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: 2,
              filter: 'drop-shadow(0 0 8px hsl(var(--gold) / 0.18))',
            }}
            animate={{ opacity: [0.22, 0.28, 0.7, 0.28, 0.22], rotate: [0, 80, 210, 300, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 0.58, 0.72, 1] }}
          />
          <div className="h-px bg-gradient-to-r from-gold/70 via-gold/30 to-transparent" />

          <CardHeader className="relative space-y-2 px-7 pt-8 text-center sm:px-8">
            <motion.div 
              className="flex justify-center mb-4"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <div className="relative">
                <img src={logo} alt="Qazaq Generation" className="relative h-24 w-auto drop-shadow-[0_10px_24px_hsl(222_47%_4%/0.22)] dark:drop-shadow-[0_10px_24px_hsl(222_47%_4%/0.45)]" />
              </div>
            </motion.div>
            <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 lg:hidden">
              <Building2 className="h-3.5 w-3.5 text-gold" />
              Qazaq Generation
            </div>
            <CardTitle className={cn('text-3xl font-bold tracking-tight', isDark ? 'text-white' : 'text-[#10213f]')}>
              {t('auth.register')}
            </CardTitle>
            <CardDescription className={cn('mx-auto max-w-sm', isDark ? 'text-slate-300' : 'text-slate-500')}>
              {t('auth.createAccount')}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} className="relative">
            <CardContent className="space-y-4 px-7 sm:px-8">
              <div className="space-y-2">
                <Label htmlFor="name" className={labelClassName}>
                  <User className="h-4 w-4 text-gold" />
                  {t('auth.name')}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('auth.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className={inputClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className={labelClassName}>
                  <Mail className="h-4 w-4 text-gold" />
                  {t('auth.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className={inputClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className={labelClassName}>
                  <Lock className="h-4 w-4 text-gold" />
                  {t('auth.password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className={inputClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className={labelClassName}>
                  <Lock className="h-4 w-4 text-gold" />
                  {t('auth.confirmPassword')}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className={inputClassName}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 px-7 pb-8 sm:px-8">
              <Button
                type="submit"
                className="h-11 w-full bg-gold font-semibold text-slate-950 shadow-[0_12px_28px_hsl(var(--gold)/0.18)] transition-all duration-300 hover:bg-gold/90 hover:shadow-[0_16px_34px_hsl(var(--gold)/0.24)]"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.register')}
              </Button>
              <p className={cn('text-center text-sm', isDark ? 'text-slate-300/85' : 'text-slate-600')}>
                {t('auth.hasAccount')}{' '}
                <Link to={`/login${location.search}`} className="font-semibold text-gold transition-colors hover:text-gold/80 hover:underline">
                  {t('auth.login')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        </motion.div>
      </div>
    </main>
  );
}
