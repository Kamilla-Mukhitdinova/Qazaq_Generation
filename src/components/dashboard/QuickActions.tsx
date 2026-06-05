import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, UserPlus, FileDown, Users, Shield, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export default function QuickActions() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const actions = [
    { icon: Plus, label: t('dashboard.qa.createTicket'), href: '/tickets/new', color: 'text-primary' },
    { icon: UserPlus, label: t('dashboard.qa.assign'), href: '/tickets', color: 'text-chart-1' },
    { icon: FileDown, label: t('dashboard.qa.exportReport'), href: '/reports/manage', color: 'text-chart-3' },
    { icon: Users, label: t('dashboard.qa.addUser'), href: '/admin/users', color: 'text-chart-2' },
    { icon: Shield, label: t('dashboard.qa.slaSetup'), href: '/admin/sla', color: 'text-chart-5' },
    { icon: MessageSquare, label: t('dashboard.qa.aiAssistant'), href: '/ai-chat', color: 'text-chart-4' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{t('dashboard.quickActions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Button
                variant="outline"
                className="h-20 w-full flex-col gap-1.5 px-2 py-3 text-center whitespace-normal hover:shadow-sm transition-shadow"
                onClick={() => navigate(action.href)}
              >
                <action.icon className={`h-4 w-4 shrink-0 ${action.color}`} />
                <span className="max-w-full text-[11px] font-medium leading-tight break-words">
                  {action.label}
                </span>
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
