import React, { useEffect, useState } from "react";
import "./UpdateBar.css";

interface Props {
  percent: number;
}

export default function UpdateBar({ percent }: Props) {
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (percent >= 100) {
      setFinished(true);

      // sonido suave al terminar
      const audio = new Audio("/update-finish.mp3");
      audio.volume = 0.35;
      audio.play().catch(() => {});
    }
  }, [percent]);

  const applyChanges = () => {
    // Enviar señal al main para aplicar update
    window.desktopBridge?.updates?.applyChanges?.();
  };

  return (
    <div className="update-bar-container">
      {/* ICONO DEL PROGRAMA */}
      <img src="/icon.ico" className="update-bar-icon" alt="icon" />

      {/* CONTENIDO */}
      <div className="update-bar-content">
        {!finished && (
          <>
            <div className="update-bar-title">
              Actualizando… {percent.toFixed(0)}%
            </div>
            <div className="update-bar-progress">
              <div
                className="update-bar-fill"
                style={{ width: `${percent}%` }}
              />
            </div>
          </>
        )}

        {finished && (
          <button className="apply-button" onClick={applyChanges}>
            Aplicar cambios
          </button>
        )}
      </div>
    </div>
  );
}
