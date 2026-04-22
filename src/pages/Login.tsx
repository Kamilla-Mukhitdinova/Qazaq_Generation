import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Sparkles, Lock, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import logo from '@/assets/logo.png';

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />

      <motion.div
        className="absolute top-4 right-4 flex items-center gap-2 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <LanguageSelector />
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
            transition={{ duration: 0.4, type: "spring" }}
          >
            <Card className="shadow-2xl border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-gold via-turquoise to-gold" />

              <CardHeader className="space-y-1 text-center pb-2">
                <motion.div className="flex justify-center mb-4" variants={itemVariants}>
                  <motion.div className="relative" whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }} transition={{ duration: 0.5 }}>
                    <motion.div
                      className="absolute -inset-4 bg-gradient-to-r from-gold/20 via-turquoise/20 to-gold/20 rounded-full blur-xl"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    <img src={logo} alt="Qazaq Generation" className="h-24 w-auto relative z-10" />
                  </motion.div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground via-gold to-foreground bg-clip-text">
                    Qazaq Generation
                  </CardTitle>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <CardDescription className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4 text-gold" />
                    {step === 'credentials' ? t('auth.helpdesk') : t('auth.2fa')}
                    <Sparkles className="h-4 w-4 text-gold" />
                  </CardDescription>
                </motion.div>
              </CardHeader>

              {step === 'credentials' ? (
                <form onSubmit={handleCredentialsSubmit}>
                  <CardContent className="space-y-4">
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {t('auth.email')}
                      </Label>
                      <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} className="bg-background/50 border-border/50 focus:border-gold transition-all duration-300" />
                    </motion.div>
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="password" className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        {t('auth.password')}
                      </Label>
                      <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} className="bg-background/50 border-border/50 focus:border-gold transition-all duration-300" />
                    </motion.div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <motion.div className="w-full" variants={itemVariants}>
                      <Button type="submit" className="w-full bg-gradient-to-r from-primary via-gold to-primary hover:from-gold hover:to-gold text-primary-foreground transition-all duration-500 relative overflow-hidden group" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('auth.login')}
                      </Button>
                    </motion.div>
                    <motion.p className="text-sm text-muted-foreground text-center" variants={itemVariants}>
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
                      <motion.div className="p-4 rounded-full bg-gradient-to-br from-gold/20 to-turquoise/20" animate={{ boxShadow: ["0 0 20px hsl(42 80% 55% / 0.3)", "0 0 40px hsl(175 60% 45% / 0.3)", "0 0 20px hsl(42 80% 55% / 0.3)"] }} transition={{ duration: 2, repeat: Infinity }}>
                        <Shield className="h-12 w-12 text-gold" />
                      </motion.div>
                    </motion.div>
                    <motion.p className="text-center text-sm text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
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
                    <Button type="submit" className="w-full bg-gradient-to-r from-gold to-turquoise hover:from-turquoise hover:to-gold transition-all duration-500" disabled={isLoading || otpCode.length !== 6}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('auth.verify')}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full hover:text-gold" onClick={() => { setStep('credentials'); setOtpCode(''); }}>
                      {t('auth.back')}
                    </Button>
                  </CardFooter>
                </form>
              )}

              <div className="h-1 bg-gradient-to-r from-turquoise via-gold to-turquoise" />
            </Card>
          </motion.div>
        </AnimatePresence>

        <motion.p className="text-center text-xs text-muted-foreground mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          © 202 Qazaq Generation. ITSM & Service Desk Platform
        </motion.p>
      </motion.div>
    </div>
  );
}
