import React, { useState } from 'react';
import HelpTip from '@/components/HelpTip';
import QrDisplay from '@/components/QrDisplay';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Palette, Type, Layout, DollarSign, Users as UsersIcon, Info, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import UserManagement from '@/components/admin/UserManagement';

const THEMES = [
  { value: 'white', label: 'Blanco Puro', preview: 'bg-white border border-gray-300' },
  { value: 'black', label: 'Negro Total', preview: 'bg-black' },
  { value: 'sunset', label: 'Atardecer', preview: 'bg-orange-600' },
  { value: 'forest', label: 'Bosque', preview: 'bg-green-700' },
  { value: 'ocean', label: 'Océano', preview: 'bg-blue-600' },
  { value: 'night', label: 'Noche Índigo', preview: 'bg-indigo-900' },
  { value: 'coffee', label: 'Café', preview: 'bg-amber-800' },
];

const FONTS = [
  { value: 'Source Sans 3', label: 'Source Sans 3' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
];

const FONT_COLORS = [
  { value: null, label: 'Auto (del tema)', preview: 'linear-gradient(135deg,#fff 50%,#000 50%)' },
  { value: '#000000', label: 'Negro', preview: '#000000' },
  { value: '#ffffff', label: 'Blanco', preview: '#ffffff' },
  { value: '#1f2937', label: 'Gris oscuro', preview: '#1f2937' },
  { value: '#dc2626', label: 'Rojo', preview: '#dc2626' },
  { value: '#2563eb', label: 'Azul', preview: '#2563eb' },
  { value: '#16a34a', label: 'Verde', preview: '#16a34a' },
  { value: '#d97706', label: 'Ámbar', preview: '#d97706' },
];

function ImportantNotes() {
  return (
    <div className="glass-card p-6 max-w-2xl">
      <h3 className="font-display font-bold text-lg italic mb-3">¡Hola, espero que tengas buen día!</h3>
      <div className="space-y-3 text-sm italic font-medium leading-relaxed">
        <p className="font-bold italic">(Notas importantes a tener en cuenta)</p>
        <p><strong>1-</strong> Este programa existe para evitar fraudes con sus empleados ya que usted tiene el control de todo lo que entra y sale de su negocio, y puede ver el flujo de dinero.</p>
        <p><strong>2-</strong> Cualquier error o duda que encuentre <em>CONTÁCTEME</em> (Este servicio será totalmente gratuito si usted ha pagado por la licencia permanente).</p>
        <p><strong>3-</strong> Si usted piensa usar su programa para otro negocio tiene que pagar nuevamente por su servicio.</p>
        <p><strong>4-</strong> Si usted desea hacer algún cambio <em>¡CONTÁCTEME!</em> Este servicio se le cobrará dependiendo de lo complejo que este sea.</p>
        <p><strong>5-</strong> No fuerces el programa (se puede desinstalar y volver a instalar sin problemas ya que este hace un <em>BACKUP</em> en sus archivos internos).</p>
        <p><strong>6-</strong> Este programa tiene un sistema <em>¡Anti-Hacking!</em> que si se detecta que intentan configurarlo externamente este borrará archivos necesarios dentro de sí mismo para su funcionamiento adecuado.</p>
        <p className="pt-2 border-t border-border italic">Muchas gracias por su atención, y le deseo buena suerte. Espero que me vuelva a contactar y si le gustó la aplicación me encantaría que me recomendara… no intentes copiarlo porque no va a dejar usarlo.</p>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const { settings, updateSettings } = useData();
  const [navPosition, setNavPosition] = useState(settings.navPosition);
  const [defaultSalary, setDefaultSalary] = useState(String(settings.defaultSalaryPercent));
  const [selectedTheme, setSelectedTheme] = useState(settings.theme);
  const [selectedFont, setSelectedFont] = useState(settings.font);
  const [fontColor, setFontColor] = useState<string | null>(settings.fontColor ?? null);
  const [salaryByPercentEnabled, setSalaryByPercentEnabled] = useState(!!settings.salaryByPercentEnabled);
  const telegramUrl = settings.telegramUrl || 'https://t.me/+G8geeJ1gwYo4N2Ex';

  const handleSave = () => {
    updateSettings({
      navPosition,
      defaultSalaryPercent: Number(defaultSalary) || 2,
      theme: selectedTheme,
      font: selectedFont,
      fontColor,
      salaryByPercentEnabled,
    });
    toast.success('Configuración guardada');
  };

  return (
    <div className="grid gap-6 max-w-2xl">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Tema de Colores</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(t => (
            <button
              key={t.value}
              onClick={() => setSelectedTheme(t.value)}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                selectedTheme === t.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${t.preview}`} />
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Fuente</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FONTS.map(f => (
            <button
              key={f.value}
              onClick={() => setSelectedFont(f.value)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedFont === f.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              style={{ fontFamily: f.value }}
            >
              <span className="text-sm font-medium">{f.label}</span>
              <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: f.value }}>Aa Bb Cc 123</p>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Color de la fuente</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Si los textos no se ven bien en tu tema, elige un color o personalízalo.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FONT_COLORS.map(c => {
            const active = (fontColor ?? null) === c.value;
            return (
              <button
                key={c.label}
                onClick={() => setFontColor(c.value)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="w-6 h-6 rounded-full border border-border" style={{ background: c.preview }} />
                <span className="text-xs font-medium">{c.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <label className="text-sm font-medium">Personalizado:</label>
          <input
            type="color"
            value={fontColor || '#ffffff'}
            onChange={e => setFontColor(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border border-border bg-transparent"
          />
          {fontColor && (
            <button type="button" onClick={() => setFontColor(null)} className="text-xs underline text-muted-foreground">
              Restablecer
            </button>
          )}
          <span className="text-sm" style={{ color: fontColor || undefined }}>Vista previa</span>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layout className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Diseño y Salario</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Posición de Navegación</label>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setNavPosition('top')} className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${navPosition === 'top' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <div className="w-full h-2 bg-primary/30 rounded mb-2" />
                <div className="w-full h-8 bg-muted rounded" />
                <p className="text-xs mt-2">Arriba</p>
              </button>
              <button onClick={() => setNavPosition('side')} className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${navPosition === 'side' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <div className="flex gap-1">
                  <div className="w-4 h-10 bg-primary/30 rounded" />
                  <div className="flex-1 h-10 bg-muted rounded" />
                </div>
                <p className="text-xs mt-2">Lateral</p>
              </button>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Calcular salario por porcentaje
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Si está apagado, los empleados reciben salario fijo (no se calcula desde las ventas).
                </p>
              </div>
              <input type="checkbox" checked={salaryByPercentEnabled} onChange={e => setSalaryByPercentEnabled(e.target.checked)} className="w-5 h-5 accent-primary" />
            </label>
          </div>
          {salaryByPercentEnabled && (
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Porcentaje de Salario por Defecto
              </label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="number" min="0" max="100" value={defaultSalary} onChange={e => setDefaultSalary(e.target.value)} className="w-24" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full" size="lg">Guardar Configuración</Button>

      <div className="glass-card p-6 text-center">
        <h3 className="font-display font-bold text-lg mb-2">Actualizaciones</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Escanea el código QR para unirte al canal de Telegram donde se publican las últimas actualizaciones.
        </p>
        <div className="flex justify-center bg-white p-4 rounded-lg mx-auto w-fit">
          <QrDisplay data={telegramUrl} size={220} />
        </div>
        <a href={telegramUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm text-primary underline break-all">
          {telegramUrl}
        </a>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Ajustes</h1>
          <HelpTip>Gestiona usuarios, revisa las notas importantes y personaliza la apariencia del sistema.</HelpTip>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="users"><UsersIcon className="w-4 h-4 mr-2" />Usuarios</TabsTrigger>
          <TabsTrigger value="notes"><Info className="w-4 h-4 mr-2" />Notas Importantes</TabsTrigger>
          <TabsTrigger value="general"><SettingsIcon className="w-4 h-4 mr-2" />Configuración</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="notes"><ImportantNotes /></TabsContent>
        <TabsContent value="general"><GeneralSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
