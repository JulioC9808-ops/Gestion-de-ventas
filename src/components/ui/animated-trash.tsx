import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { playTrashSound } from '@/lib/soundUtils';

export interface AnimatedTrashProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  isDeleting?: boolean;
  playSoundOnClick?: boolean;
}

/**
 * Icono de papelera con animación artesanal y sonido táctil de papelera:
 * - En reposo: tapa cerrada.
 * - Al pasar el cursor sobre el contenedor padre (.group) o el icono: la tapa se levanta suavemente con un giro fluido.
 * - En estado isDeleting o al hacer clic: animación de apertura y cierre con resorte y sonido de desecho.
 */
export function AnimatedTrash({ className, isDeleting, playSoundOnClick = true, onClick, ...props }: AnimatedTrashProps) {
  useEffect(() => {
    if (isDeleting) {
      playTrashSound();
    }
  }, [isDeleting]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (playSoundOnClick) {
      playTrashSound();
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        'w-4 h-4 shrink-0 transition-colors duration-200 overflow-visible select-none inline-block',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {/* Tapa con bisagra animada */}
      <g
        className={cn(
          'transition-transform duration-300 ease-out origin-[4px_6px]',
          'group-hover:-rotate-[28deg] group-hover:-translate-y-0.5',
          isDeleting && 'animate-trash-lid-bounce'
        )}
      >
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </g>
      {/* Cesta y líneas verticales */}
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export default AnimatedTrash;

