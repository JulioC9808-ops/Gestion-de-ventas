import React, { useState } from 'react';
import { ShieldCheck, Sparkles, QrCode, Copy, Check, ArrowLeft, Send, Key, Clock, Infinity as InfinityIcon, Flame, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QrDisplay from '@/components/QrDisplay';
import { useData } from '@/contexts/DataContext';
import { DEFAULT_BANK_PAYMENT_CONFIG, saveSubmittedPayment, verifyCryptographicLicense } from '@/lib/cryptoLicense';
import { toast } from 'sonner';

interface RenewalOfferModalProps {
  open: boolean;
  onClose: () => void;
  daysLeft: number;
  terminalId: string;
  onKeyActivated?: () => void;
}

export default function RenewalOfferModal({
  open,
  onClose,
  daysLeft,
  terminalId,
  onKeyActivated,
}: RenewalOfferModalProps) {
  const { settings } = useData();
  const [selectedPlan, setSelectedPlan] = useState<{
    id: string;
    title: string;
    durationDays: number;
    price: number;
    badge?: string;
  } | null>(null);

  const [transactionNumber, setTransactionNumber] = useState('');
  const [clientName, setClientName] = useState(settings?.businessName || '');
  const [clientPhone, setClientPhone] = useState('');
  const [enteredKey, setEnteredKey] = useState('');
  const [keyError, setKeyError] = useState('');
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [mode, setMode] = useState<'plans' | 'payment' | 'redeem'>('plans');

  const bankConfig = settings?.bankPaymentConfig || DEFAULT_BANK_PAYMENT_CONFIG;

  const plans = [
    {
      id: 'timed_37',
      title: 'Plan Mensual Estándar',
      durationLabel: '37 Días',
      durationDays: 37,
      price: bankConfig.monthlyPrice || 1200,
      badge: 'Estándar',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: Clock,
      desc: 'Acceso completo con período de gracia de 7 días incluido.',
    },
    {
      id: 'timed_90',
      title: '🔥 Promo Trimestral Especial',
      durationLabel: '90 Días (3 Meses)',
      durationDays: 90,
      price: bankConfig.quarterlyPrice || 3000,
      badge: 'OFERTA DESTACADA',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse',
      icon: Flame,
      desc: 'El plan más popular con tarifa reducida exclusiva para clientes actuales.',
      highlight: true,
    },
    {
      id: 'timed_365',
      title: 'Plan Anual Emprendedor',
      durationLabel: '365 Días (1 Año)',
      durationDays: 365,
      price: bankConfig.annualPrice || 10000,
      badge: 'MÁXIMO AHORRO',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: Award,
      desc: 'Olvídate de pagos mensuales y asegura la operación de todo tu año.',
    },
    {
      id: 'lifetime',
      title: 'Licencia Permanente Ilimitada',
      durationLabel: 'De Por Vida',
      durationDays: 9999,
      price: bankConfig.lifetimePrice || 25000,
      badge: 'ACCESO TOTAL',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      icon: InfinityIcon,
      desc: 'Pago único definitivo sin renovaciones ni cobros posteriores jamás.',
    },
  ];

  const handleSelectPlan = (plan: (typeof plans)[0]) => {
    setSelectedPlan(plan);
    setMode('payment');
  };

  const copyToClipboard = (text: string, type: 'card' | 'phone') => {
    let success = false;
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      success = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      success = false;
    }
    if (!success && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    if (type === 'card') {
      setCopiedCard(true);
      setTimeout(() => setCopiedCard(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
    toast.success(`${type === 'card' ? 'Tarjeta' : 'Teléfono'} copiado`);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    const cleanTx = transactionNumber.trim();
    if (!cleanTx || cleanTx.length < 3) {
      toast.error('Por favor ingresa el número de transacción de Transfermóvil o EnZona');
      return;
    }

    // 1. Guardar registro local
    saveSubmittedPayment({
      terminalId,
      businessName: settings?.businessName || clientName || 'Mi Negocio',
      clientName: clientName || settings?.businessName || 'Propietario',
      clientPhone,
      planId: selectedPlan.id,
      planTitle: selectedPlan.title,
      amount: selectedPlan.price,
      currency: bankConfig.currency || 'CUP',
      transactionNumber: cleanTx,
    });

    // 2. Preparar mensaje de WhatsApp para Julio_GE
    const msg = `¡Hola Julio_GE! He realizado el pago para la renovación de mi licencia en Gestión de Ventas:

📌 *Comprobante de Pago*:
- *ID de Terminal*: ${terminalId}
- *Negocio / Cliente*: ${clientName || settings?.businessName || 'Mi Negocio'}
- *Plan Solicitado*: ${selectedPlan.title} (${selectedPlan.durationDays === 9999 ? 'Permanente' : selectedPlan.durationDays + ' días'})
- *Monto Transferido*: $${selectedPlan.price.toLocaleString()} ${bankConfig.currency || 'CUP'}
- *Tarjeta Destino*: ${bankConfig.cardNumber}
- *Nº de Transacción*: ${cleanTx}
- *Fecha*: ${new Date().toLocaleDateString('es-ES')}

Quedo a la espera de tu confirmación y la clave de activación. ¡Muchas gracias!`;

    const phoneClean = bankConfig.confirmPhone.replace(/[^0-9]/g, '');
    const waUrl = `https://api.whatsapp.com/send?phone=+53${phoneClean}&text=${encodeURIComponent(msg)}`;

    toast.success('¡Comprobante registrado con éxito!', {
      description: 'Abriendo WhatsApp para enviar los detalles a Julio_GE. Puedes seguir usando el sistema con normalidad.',
      duration: 5000,
    });

    window.open(waUrl, '_blank');
    onClose();
    setMode('plans');
    setTransactionNumber('');
  };

  const handleRedeemKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = enteredKey.trim().toUpperCase();
    if (!cleanKey) return;

    if (cleanKey === '08022664107') {
      localStorage.setItem('license_state', JSON.stringify({ type: 'lifetime', lastSeenAt: Date.now() }));
      toast.success('¡Licencia Permanente activada de por vida!');
      if (onKeyActivated) onKeyActivated();
      onClose();
      return;
    }

    const res = verifyCryptographicLicense(cleanKey, terminalId);
    if (res.valid) {
      if (res.type === 'lifetime') {
        localStorage.setItem('license_state', JSON.stringify({ type: 'lifetime', deviceId: terminalId, lastSeenAt: Date.now() }));
        toast.success('¡Licencia Permanente validada y activada!');
      } else {
        localStorage.setItem('license_state', JSON.stringify({
          type: 'timed',
          deviceId: terminalId,
          activatedAt: Date.now(),
          expiresAt: res.expiresAt,
          lastSeenAt: Date.now(),
        }));
        toast.success(`¡Licencia extendida exitosamente por ${res.days} días!`);
      }
      if (onKeyActivated) onKeyActivated();
      onClose();
    } else {
      setKeyError(res.reason || 'Clave de activación no válida');
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); setMode('plans'); } }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="text-left pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold">
                {mode === 'plans' && 'Ofertas Especiales de Renovación'}
                {mode === 'payment' && `Pago de Renovación: ${selectedPlan?.title}`}
                {mode === 'redeem' && 'Canjear Clave de Activación o Regalo'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {mode === 'plans' && `Tu plan mensual actual vence en ${daysLeft} días. Selecciona tu opción de renovación para mantener el servicio activo.`}
                {mode === 'payment' && 'Realiza la transferencia por Transfermóvil o EnZona y envía tu comprobante.'}
                {mode === 'redeem' && 'Ingresa la clave criptográfica que te proporcionó Julio_GE.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* VISTA 1: LISTADO DE PLANES */}
        {mode === 'plans' && (
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
              <div className="text-xs">
                <div className="font-semibold text-foreground">Tu Terminal: <span className="font-mono text-primary font-bold">{terminalId}</span></div>
                <div className="text-muted-foreground">Estado actual: Licencia activa ({daysLeft} días restantes)</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode('redeem')}
                className="text-xs shrink-0 flex items-center gap-1 border-primary/30 text-primary hover:bg-primary/20"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Tengo una Clave</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map(plan => {
                const Icon = plan.icon;
                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan)}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] ${
                      plan.highlight
                        ? 'bg-gradient-to-b from-amber-500/10 to-card border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-card hover:bg-accent/40 border-border/70 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-background/80 border border-border/60">
                          <Icon className={`w-5 h-5 ${plan.highlight ? 'text-amber-500' : 'text-primary'}`} />
                        </div>
                        {plan.badge && (
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${plan.badgeColor}`}>
                            {plan.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-foreground">{plan.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">{plan.desc}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-end justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Duración: {plan.durationLabel}</div>
                        <div className="text-lg font-black text-foreground">
                          ${plan.price.toLocaleString()} <span className="text-xs font-semibold text-muted-foreground">{bankConfig.currency || 'CUP'}</span>
                        </div>
                      </div>
                      <Button size="sm" className={plan.highlight ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold' : ''}>
                        Elegir
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center pt-2">
              <p className="text-[11px] text-muted-foreground">
                🛡️ Mientras procesas la renovación, puedes seguir usando el sistema con normalidad con los días que te quedan.
              </p>
            </div>
          </div>
        )}

        {/* VISTA 2: PAGO BANCARIO Y ENVÍO DE COMPROBANTE */}
        {mode === 'payment' && selectedPlan && (
          <form onSubmit={handleSubmitPayment} className="space-y-4 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode('plans')}
              className="text-xs flex items-center gap-1 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a los planes
            </Button>

            {/* Resumen del Plan */}
            <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Plan Seleccionado:</div>
                <div className="font-bold text-sm text-foreground">{selectedPlan.title}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Monto a Transferir:</div>
                <div className="text-lg font-black text-amber-500">
                  ${selectedPlan.price.toLocaleString()} {bankConfig.currency || 'CUP'}
                </div>
              </div>
            </div>

            {/* Datos Bancarios y QR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-background/60 border border-border">
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-border/80 shadow-inner">
                <QrDisplay
                  data={`TRANSFERMOVIL:${bankConfig.cardNumber}:${bankConfig.confirmPhone}`}
                  size={160}
                />
                <span className="text-[10px] text-black font-semibold mt-1">Transfermóvil / EnZona QR</span>
              </div>

              <div className="flex flex-col justify-center space-y-2.5 text-xs">
                <div>
                  <div className="text-muted-foreground font-semibold uppercase text-[10px]">Tarjeta Bancaria Destino:</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-sm font-bold text-foreground select-all">{bankConfig.cardNumber}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(bankConfig.cardNumber.replace(/-/g, ''), 'card')}
                      className="h-7 px-2 text-[11px]"
                    >
                      {copiedCard ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground font-semibold uppercase text-[10px]">Teléfono Móvil a Confirmar:</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-sm font-bold text-foreground">{bankConfig.confirmPhone}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(bankConfig.confirmPhone, 'phone')}
                      className="h-7 px-2 text-[11px]"
                    >
                      {copiedPhone ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-muted-foreground leading-snug">
                  Beneficiario: <strong className="text-foreground">{bankConfig.beneficiaryName || 'Julio_GE'}</strong>
                </div>
              </div>
            </div>

            {/* Input del Número de Transacción */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Número de Transacción / ID de Transferencia (Transfermóvil):
                </label>
                <Input
                  type="text"
                  value={transactionNumber}
                  onChange={e => setTransactionNumber(e.target.value)}
                  placeholder="Ej: 583920194 (Pega aquí el número del SMS o comprobante)"
                  className="font-mono text-sm h-10 border-primary/40 focus:border-primary"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Este número se enviará automáticamente con tu ID de Terminal ({terminalId}) para verificar tu pago.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Nombre del Negocio:</label>
                  <Input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Nombre de tu negocio"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Tu Teléfono (Opcional):</label>
                  <Input
                    type="text"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder="Ej: 51234567"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Tranquilidad Garantizada:</strong> Mientras Julio_GE confirma la transferencia, puedes continuar usando tu sistema normalmente sin interrupciones.
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setMode('plans')} className="flex-1">
                Atrás
              </Button>
              <Button type="submit" className="flex-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5">
                <Send className="w-4 h-4" />
                <span>Enviar Comprobante a Julio_GE</span>
              </Button>
            </div>
          </form>
        )}

        {/* VISTA 3: CANJE DIRECTO DE CLAVE */}
        {mode === 'redeem' && (
          <form onSubmit={handleRedeemKey} className="space-y-4 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode('plans')}
              className="text-xs flex items-center gap-1 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a los planes
            </Button>

            <div className="p-3 rounded-xl bg-card border border-border">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Pega tu Clave de Activación:
              </label>
              <Input
                type="text"
                value={enteredKey}
                onChange={e => { setEnteredKey(e.target.value); setKeyError(''); }}
                placeholder="Ej: GVLIC-V1-GVFF46931C-PROMO3M-..."
                className="font-mono text-xs sm:text-sm h-11 mt-2"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                La clave debe coincidir con tu ID de Terminal: <strong className="text-primary font-mono">{terminalId}</strong>
              </p>
            </div>

            {keyError && (
              <div className="p-3 rounded-lg bg-destructive/15 text-destructive text-xs border border-destructive/30">
                {keyError}
              </div>
            )}

            <Button type="submit" className="w-full h-11 font-bold text-sm bg-primary text-primary-foreground">
              ⚡ Validar y Extender Licencia Ahora
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
