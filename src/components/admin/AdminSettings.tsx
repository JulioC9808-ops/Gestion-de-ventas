import React, { useState } from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Palette, Type, Layout, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const THEMES = [
  { value: 'default', label: 'Negro Elegante', preview: 'bg-gray-900' },
  { value: 'white', label: 'Blanco Puro', preview: 'bg-white border border-gray-300' },
  { value: 'sunset', label: 'Atardecer', preview: 'bg-orange-600' },
  { value: 'forest', label: 'Bosque', preview: 'bg-green-700' },
  { value: 'ocean', label: 'Océano', preview: 'bg-blue-600' },
  { value: 'night', label: 'Noche', preview: 'bg-indigo-900' },
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

export default function AdminSettings() {
  const { settings, updateSettings } = useData();
  const [navPosition, setNavPosition] = useState(settings.navPosition);
  const [defaultSalary, setDefaultSalary] = useState(String(settings.defaultSalaryPercent));
  const [selectedTheme, setSelectedTheme] = useState(settings.theme);
  const [selectedFont, setSelectedFont] = useState(settings.font);
  const [fontColor, setFontColor] = useState<string | null>(settings.fontColor ?? null);
  const [salaryByPercentEnabled, setSalaryByPercentEnabled] = useState(!!settings.salaryByPercentEnabled);

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
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Ajustes</h1>
          <HelpTip>Personaliza la apariencia del sistema: tema de colores, fuente, posición de la barra de navegación y porcentaje de salario por defecto.</HelpTip>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Theme */}
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

        {/* Font */}
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

        {/* Layout & Salary */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layout className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg">Diseño y Salario</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Posición de Navegación</label>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setNavPosition('top')}
                  className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                    navPosition === 'top' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="w-full h-2 bg-primary/30 rounded mb-2" />
                  <div className="w-full h-8 bg-muted rounded" />
                  <p className="text-xs mt-2">Arriba</p>
                </button>
                <button
                  onClick={() => setNavPosition('side')}
                  className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                    navPosition === 'side' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
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
                    <DollarSign className="w-4 h-4" />
                    Calcular salario por porcentaje
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Si está apagado, los empleados reciben salario fijo (no se calcula desde las ventas).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={salaryByPercentEnabled}
                  onChange={e => setSalaryByPercentEnabled(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
              </label>
            </div>
            {salaryByPercentEnabled && (
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Porcentaje de Salario por Defecto
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={defaultSalary}
                    onChange={e => setDefaultSalary(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button onClick={handleSave} className="w-full" size="lg">
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
