import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Check, X, QrCode } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type SetupStep = 'initial' | 'qr' | 'verify' | 'complete';

export default function TwoFactorSetup() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [step, setStep] = useState<SetupStep>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [otpCode, setOtpCode] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  useEffect(() => { checkMFAStatus(); }, []);

  const checkMFAStatus = async () => {
    try {
      const data = await api.getMe();
      setIs2FAEnabled(data.user.totpEnabled);
    } catch (e) { console.error('Error checking MFA status:', e); }
  };

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      setOtpCode('');
      const data = await api.setup2FA();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('qr');
    } catch (e) {
      toast({ title: t('common.error'), description: t('twofa.setupError'), variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const handleVerify = async () => {
    if (otpCode.length !== 6) return;
    setIsLoading(true);
    try {
      await api.confirm2FA(otpCode.replace(/\D/g, ''));
      setStep('complete');
      setIs2FAEnabled(true);
      toast({ title: t('common.success'), description: t('twofa.success') });
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('auth.invalidOtp'),
        variant: 'destructive',
      });
    } finally { setIsLoading(false); }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    try {
      await api.disable2FA();
      setIs2FAEnabled(false);
      setStep('initial');
      toast({ title: t('common.success'), description: t('twofa.disabledSuccess') });
    } catch (e) {
      toast({ title: t('common.error'), description: t('twofa.disableError'), variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />{t('twofa.title')}</h1>
        <p className="text-muted-foreground">{t('twofa.subtitle')}</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {is2FAEnabled ? <><Check className="h-5 w-5 text-green-500" />{t('twofa.enabled')}</> : <><X className="h-5 w-5 text-muted-foreground" />{t('twofa.disabled')}</>}
          </CardTitle>
          <CardDescription>{is2FAEnabled ? t('twofa.enabledDesc') : t('twofa.disabledDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {is2FAEnabled ? (
            <Button variant="destructive" onClick={handleDisable} disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('twofa.disable')}</Button>
          ) : step === 'initial' ? (
            <Button onClick={handleEnroll} disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<QrCode className="mr-2 h-4 w-4" />{t('twofa.setup')}</Button>
          ) : step === 'qr' ? (
            <div className="space-y-4">
              <div className="flex justify-center"><img src={qrCode} alt="QR Code" className="w-48 h-48 border rounded-lg" /></div>
              <div className="space-y-2"><Label>{t('twofa.secretKey')}</Label><Input value={secret} readOnly className="font-mono text-sm" /></div>
              <p className="text-sm text-muted-foreground">{t('twofa.scanHint')}</p>
              <Button onClick={() => setStep('verify')} className="w-full">{t('twofa.continue')}</Button>
            </div>
          ) : step === 'verify' ? (
            <div className="space-y-4">
              {qrCode && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <img src={qrCode} alt="QR Code" className="mx-auto h-24 w-24 rounded-md border bg-white p-1 sm:mx-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">{t('twofa.verifyHint')}</p>
                      <Input value={secret} readOnly className="h-9 font-mono text-xs" />
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{t('twofa.enterCode')}</p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={(value) => setOtpCode(value)} disabled={isLoading}>
                  <InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep('qr'); setOtpCode(''); }} className="flex-1">{t('auth.back')}</Button>
                <Button onClick={handleVerify} disabled={isLoading || otpCode.length !== 6} className="flex-1">{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('twofa.confirm')}</Button>
              </div>
              <Button variant="ghost" onClick={handleEnroll} disabled={isLoading} className="w-full">
                {t('twofa.generateNew')}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4"><Check className="h-12 w-12 text-green-500 mx-auto" /><p>{t('twofa.complete')}</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
