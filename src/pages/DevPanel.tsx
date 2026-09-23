import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Settings, Key, RotateCcw, Image, Send, UserCog, Megaphone, CheckCircle2, RefreshCw, ShieldCheck, Sparkles, Clock, Infinity as InfinityIcon, Eye, EyeOff, AlertTriangle, Trash2 } from 'lucide-react';
import { useData, GITHUB_UPDATES_URL, DEFAULT_ANNOUNCEMENT_URL } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { fetchAnnouncement } from '@/lib/announcements';
import { getLicenseInfo, activateLifetimeLicense, activateTimedLicenseDays } from '@/pages/LicenseGate';
import { fileToCompressedDataUrl } from '@/lib/imageUtils';
import { resetAllToFactoryDefaults } from '@/lib/backupUtils';

const NAV = [
  { label: 'Configuración', icon: Settings, key: 'config', tip: 'Cambia el nombre del negocio, logo y fondo del sistema.' },
  { label: 'Licencia', icon: ShieldCheck, key: 'license', tip: 'Gestiona el estado de activación y habilita la licencia permanente.' },
  { label: 'Actualizaciones', icon: Send, key: 'updates', tip: 'Configura el canal de Telegram y el repositorio público de actualizaciones.' },
  { label: 'Contraseña', icon: Key, key: 'password', tip: 'Cambia tu contraseña de desarrollador.' },
  { label: 'Restablecer Admin', icon: UserCog, key: 'admin', tip: 'Devuelve el administrador principal a Usuario: admin y Contraseña: admin123.' },
  { label: 'Restaurar', icon: RotateCcw, key: 'reset', tip: 'Restaura toda la configuración y datos a valores por defecto.' },
];

export default function DevPanel() {
  const [active, setActive] = useState('config');
  const { settings, updateSettings, users, updateUser, resetAdminCredentials } = useData();
  const { currentUser } = useAuth();
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [telegramUrl, setTelegramUrl] = useState(settings.telegramUrl || 'https://t.me/+G8geeJ1gwYo4N2Ex');
  const [githubUpdatesUrl, setGithubUpdatesUrl] = useState(settings.githubUpdatesUrl || GITHUB_UPDATES_URL);
  const [announcementUrl, setAnnouncementUrl] = useState(settings.announcementUrl || DEFAULT_ANNOUNCEMENT_URL);
  const [testingAnnouncement, setTestingAnnouncement] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [licenseState, setLicenseState] = useState(() => getLicenseInfo());
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetAdminDialogOpen, setResetAdminDialogOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const refreshLicense = () => {
    setLicenseState(getLicenseInfo());
  };

  const handleSaveName = () => {
    updateSettings({ businessName });
    toast.success('Nombre actualizado');
  };

  const handleChangePassword = () => {
    if (!currentUser) return;
    const devUser = users.find(u => u.id === currentUser.id);
    if (!devUser || devUser.password !== currentPwd) {
      toast.error('Contraseña actual incorrecta');
      return;
    }
    updateUser({ ...devUser, password: newPwd });
    setCurrentPwd('');
    setNewPwd('');
    toast.success('Contraseña actualizada');
  };

  const handleActivateLifetime = () => {
    const success = activateLifetimeLicense();
    if (success) {
      refreshLicense();
      toast.success('¡Licencia Permanente activada con éxito!', {
        description: 'La aplicación ahora cuenta con acceso ilimitado de por vida sin vencimiento.',
      });
    } else {
      toast.error('No se pudo activar la licencia');
    }
  };

  const handleActivateTimed = () => {
    const success = activateTimedLicenseDays(37);
    if (success) {
      refreshLicense();
      toast.success('Licencia periódica activada (+37 días)');
    } else {
      toast.error('Error al activar licencia');
    }
  };

  const handleConfirmFactoryReset = () => {
    toast.loading('Borrando todos los datos y restaurando valores de fábrica...');
    setResetDialogOpen(false);
    resetAllToFactoryDefaults();
  };

  const handleConfirmResetAdmin = () => {
    resetAdminCredentials();
    setResetAdminDialogOpen(false);
    toast.success('Administrador restablecido: admin / admin123');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Máxima calidad y nitidez
      const dataUrl = await fileToCompressedDataUrl(file, 3840);
      if (type === 'logo') updateSettings({ logoUrl: dataUrl });
      else if (type === 'background') updateSettings({ backgroundUrl: dataUrl });
      toast.success(`${type === 'logo' ? 'Logo' : 'Fondo'} actualizado con máxima calidad`);
    } catch {
      toast.error('Error al procesar la imagen');
    }
  };

  return (
    <AppLayout nav={NAV} activeKey={active} onNav={setActive}>
      {active === 'config' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Configuración e Identidad del Sistema</h1>
            <p className="text-sm text-muted-foreground mt-1">Personaliza el nombre del establecimiento, logo comercial y fondo visual.</p>
          </div>
          <div className="glass-card p-6 max-w-xl space-y-6">
            {/* Nombre del Negocio */}
            <div>
              <label className="text-sm font-semibold text-foreground">Nombre del Negocio</label>
              <p className="text-xs text-muted-foreground mb-2">Se mostrará en los tickets, comprobantes y encabezados del sistema.</p>
              <div className="flex gap-2">
                <Input
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="Ej: Cafetería Central"
                  className="font-medium"
                />
                <Button onClick={handleSaveName}>Guardar Nombre</Button>
              </div>
            </div>

            <div className="border-t border-border/60 pt-5">
              <label className="text-sm font-semibold text-foreground block mb-1">Logo Oficial del Negocio</label>
              <p className="text-xs text-muted-foreground mb-3">Aparece en la pantalla de inicio de sesión, barra superior y reportes impresos.</p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-24 h-24 object-cover rounded-xl border border-border shadow-sm shrink-0" />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-background border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground shrink-0">
                    <Image className="w-8 h-8 opacity-60 mb-1" />
                    <span className="text-[10px] font-medium">Sin logo</span>
                  </div>
                )}

                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <Button variant="default" size="sm" onClick={() => logoInputRef.current?.click()}>
                      {settings.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                    </Button>
                    {settings.logoUrl && (
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => updateSettings({ logoUrl: null })}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Quitar Logo
                      </Button>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'logo')} />
                  <p className="text-[11px] text-muted-foreground">Formato recomendado: PNG transparente o JPG cuadrado en alta resolución.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border/60 pt-5">
              <label className="text-sm font-semibold text-foreground block mb-1">Fondo de Pantalla de Inicio (Login)</label>
              <p className="text-xs text-muted-foreground mb-3">Imagen de ambiente que se proyecta detrás del formulario de inicio de sesión.</p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                {settings.backgroundUrl ? (
                  <img src={settings.backgroundUrl} alt="Fondo" className="w-32 h-20 object-cover rounded-xl border border-border shadow-sm shrink-0" />
                ) : (
                  <div className="w-32 h-20 rounded-xl bg-background border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground shrink-0">
                    <Image className="w-6 h-6 opacity-60 mb-1" />
                    <span className="text-[10px] font-medium">Fondo estándar</span>
                  </div>
                )}

                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <Button variant="outline" size="sm" onClick={() => bgInputRef.current?.click()}>
                      {settings.backgroundUrl ? 'Cambiar Fondo' : 'Subir Fondo'}
                    </Button>
                    {settings.backgroundUrl && (
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => updateSettings({ backgroundUrl: null })}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Quitar Fondo
                      </Button>
                    )}
                  </div>
                  <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'background')} />
                  <p className="text-[11px] text-muted-foreground">Se adapta a cualquier resolución de monitor o dispositivo móvil.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {active === 'license' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Administración de Licencia</h1>
            <p className="text-sm text-muted-foreground mt-1">Control de activación directa y cambio de plan de suscripción a permanente.</p>
          </div>
          <div className="glass-card p-6 max-w-xl space-y-6">
            <div className="p-4 rounded-xl border border-border bg-secondary/30 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">Estado Actual:</h3>
                  {licenseState.type === 'lifetime' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <InfinityIcon className="w-3.5 h-3.5" /> Permanente (Ilimitada)
                    </span>
                  )}
                  {licenseState.type === 'timed' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Clock className="w-3.5 h-3.5" /> Periódica ({licenseState.daysLeft} días restantes)
                    </span>
                  )}
                  {licenseState.type === 'none' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                      Sin Licencia Activa
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {licenseState.type === 'lifetime'
                    ? 'Este equipo ya posee la licencia permanente oficial. No requiere renovaciones ni comprobaciones periódicas.'
                    : 'Si el cliente estaba utilizando una suscripción mensual/periódica y deseas convertirlo a permanente, pulsa el botón de abajo para activar la licencia definitiva sin tener que reingresar la clave.'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={handleActivateLifetime}
                className="w-full h-12 text-base font-semibold shadow-md bg-gradient-to-r from-primary to-primary/90 hover:opacity-95 transition-all"
              >
                <Sparkles className="w-5 h-5 mr-2 text-yellow-300" />
                Instalar / Activar Licencia Permanente
              </Button>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={handleActivateTimed}
                  className="h-10 text-xs sm:text-sm"
                >
                  <Clock className="w-4 h-4 mr-1.5 text-primary" />
                  Activar Periódica (+37 d)
                </Button>
                <Button
                  variant="outline"
                  onClick={refreshLicense}
                  className="h-10 text-xs sm:text-sm"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Comprobar Estado
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {active === 'updates' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Canales de Actualización y Avisos</h1>
            <p className="text-sm text-muted-foreground mt-1">Configuración del repositorio central y la ruta de comunicados del sistema.</p>
          </div>
          <div className="glass-card p-6 max-w-xl space-y-6">
            <div>
              <label className="text-sm font-medium">Link de Telegram (Actualizaciones)</label>
              <div className="flex gap-2 mt-1">
                <Input value={telegramUrl} onChange={e => setTelegramUrl(e.target.value)} placeholder="https://t.me/..." />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Repositorio público de GitHub (PC y Android)</label>
              <Input
                value={githubUpdatesUrl}
                onChange={e => setGithubUpdatesUrl(e.target.value)}
                placeholder="https://github.com/JulioC9808-ops/Sistema-Updates"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Repositorio donde se publican las releases de Windows (Electron) y el APK de Android.
              </p>
            </div>

            <div className="pt-2 border-t border-border">
              <label className="text-sm font-medium flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-500" />
                Ruta / URL del Announcement (announcement.json)
              </label>
              <Input
                className="mt-1.5 font-mono text-xs"
                value={announcementUrl}
                onChange={e => setAnnouncementUrl(e.target.value)}
                placeholder="https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/announcement.json"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Archivo JSON remoto con los anuncios, comunicados y alertas del sistema.
              </p>

              <div className="flex gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={testingAnnouncement}
                  onClick={async () => {
                    if (!announcementUrl.trim()) {
                      toast.error('Indica una URL válida de announcement.');
                      return;
                    }
                    setTestingAnnouncement(true);
                    try {
                      const data = await fetchAnnouncement(announcementUrl.trim());
                      if (!data) throw new Error('Respuesta vacía');
                      toast.success(`Anuncio verificado: "${data.title || 'Sin título'}"`, {
                        description: `[Activo: ${data.active ? 'SÍ' : 'NO'}] ID: ${data.id || 'N/A'}. Mensaje: ${data.message || 'Sin mensaje'}`,
                        duration: 8000,
                      });
                    } catch (err) {
                      toast.error('Error al consultar anuncio remoto', {
                        description: err instanceof Error ? err.message : String(err),
                        duration: 8000,
                      });
                    } finally {
                      setTestingAnnouncement(false);
                    }
                  }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testingAnnouncement ? 'animate-spin' : ''}`} />
                  Probar ruta de anuncio
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => {
                  updateSettings({
                    telegramUrl: telegramUrl.trim(),
                    githubUpdatesUrl: githubUpdatesUrl.trim() || null,
                    announcementUrl: announcementUrl.trim() || null,
                  });
                  toast.success('Canales de actualización y ruta de anuncios guardados correctamente');
                }}>
                  Guardar cambios
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (window.Capacitor?.isNativePlatform?.()) {
                      const { checkNativeAppUpdate } = await import('@/lib/appUpdate');
                      await checkNativeAppUpdate();
                      toast.info('Comprobando actualizaciones en Android...');
                    } else {
                      toast.info('Comprobación nativa disponible en la app Android instalada.');
                    }
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Buscar actualización ahora
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground text-left sm:text-right"
                onClick={() => {
                  setGithubUpdatesUrl(GITHUB_UPDATES_URL);
                  setAnnouncementUrl(DEFAULT_ANNOUNCEMENT_URL);
                  setTelegramUrl('https://t.me/+G8geeJ1gwYo4N2Ex');
                  updateSettings({
                    githubUpdatesUrl: GITHUB_UPDATES_URL,
                    announcementUrl: DEFAULT_ANNOUNCEMENT_URL,
                    telegramUrl: 'https://t.me/+G8geeJ1gwYo4N2Ex',
                  });
                  toast.success('Rutas restablecidas a los canales oficiales de Sistema-Updates');
                }}
              >
                Restablecer a valores de Sistema-Updates
              </Button>
            </div>
          </div>
        </div>
      )}

      {active === 'password' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Cambiar Contraseña</h1>
          </div>
          <div className="glass-card p-6 max-w-md space-y-4">
            <div>
              <label className="text-sm font-medium">Contraseña Actual</label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  className={`pr-10 ${
                    !showCurrentPwd && currentPwd ? 'threads-obfuscated' : 'threads-revealed'
                  }`}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-form-type="other"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showCurrentPwd ? 'Ocultar contraseña' : 'Ver contraseña'}
                  onClick={() => setShowCurrentPwd(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors p-1"
                >
                  {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Nueva Contraseña</label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  className={`pr-10 ${
                    !showNewPwd && newPwd ? 'threads-obfuscated' : 'threads-revealed'
                  }`}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-form-type="other"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showNewPwd ? 'Ocultar contraseña' : 'Ver contraseña'}
                  onClick={() => setShowNewPwd(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors p-1"
                >
                  {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleChangePassword} className="w-full">Cambiar Contraseña</Button>
          </div>
        </div>
      )}

      {active === 'admin' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Restablecer Administrador</h1>
          </div>
          <div className="glass-card p-6 max-w-md space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si el dueño olvidó su usuario o contraseña, esto devuelve la cuenta de administrador
              principal a las credenciales iniciales. Los productos, ventas, cierres y demás datos NO se borran.
            </p>
            <div className="p-3 bg-muted/60 rounded-xl border border-border text-sm">
              <p className="font-semibold text-foreground">Credenciales por defecto:</p>
              <p className="text-muted-foreground mt-0.5">Usuario: <strong className="text-foreground">admin</strong></p>
              <p className="text-muted-foreground">Contraseña: <strong className="text-foreground">admin123</strong></p>
            </div>
            <Button onClick={() => setResetAdminDialogOpen(true)} className="w-full">
              Restablecer a admin / admin123
            </Button>
          </div>
        </div>
      )}

      {active === 'reset' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Restaurar Valores de Fábrica</h1>
          </div>
          <div className="glass-card p-6 max-w-lg space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">¡Advertencia de borrado irreversible!</p>
                <p>
                  Esta opción eliminará todos los cierres de turno, productos registrados, movimientos,
                  usuarios, salarios, temas personalizados y configuraciones, dejando el sistema en su estado inicial limpio.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Si deseas conservar tus datos antes de restaurar, puedes exportar una Copia de Seguridad desde los Ajustes del Administrador.
            </p>
            <Button variant="destructive" onClick={() => setResetDialogOpen(true)} className="w-full font-bold shadow-xs">
              <Trash2 className="w-4 h-4 mr-2" />
              Restaurar Todo de Fábrica
            </Button>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación para Restablecer Administrador */}
      <Dialog open={resetAdminDialogOpen} onOpenChange={setResetAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              Restablecer Administrador Principal
            </DialogTitle>
            <DialogDescription asChild className="pt-2 text-sm text-muted-foreground space-y-2">
              <div>
                <span>
                  ¿Deseas restablecer las credenciales del administrador principal a <strong>admin</strong> / <strong>admin123</strong>?
                </span>
                <span className="block text-xs mt-1">Tus productos, inventario, ventas y cierres de turno permanecerán intactos.</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setResetAdminDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmResetAdmin}>
              Confirmar Restablecimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación para Restauración Total de Fábrica */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              ¿Confirmas la Restauración Total de Fábrica?
            </DialogTitle>
            <DialogDescription asChild className="pt-2 text-xs text-muted-foreground space-y-3">
              <div>
                <p>
                  Esta acción es <strong>IRREVERSIBLE</strong>. Al confirmar, el sistema borrará por completo:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-foreground my-2">
                  <li>Todos los cierres de turno y reportes históricos</li>
                  <li>Todos los productos del catálogo y cantidades en almacén</li>
                  <li>El stock de venta activo y movimientos registrados</li>
                  <li>Todas las cuentas de empleados y administradores</li>
                  <li>Temas visuales aplicados, logos, fondos y frases</li>
                </ul>
                <p className="font-semibold text-destructive">
                  El sistema se reiniciará inmediatamente en estado limpio como recién instalado.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmFactoryReset} className="font-bold">
              Sí, Borrar Todo y Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
