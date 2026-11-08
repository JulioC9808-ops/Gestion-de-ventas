; ==============================================================================
; GEVEN - Configuración del Instalador Moderno One-Click
; ==============================================================================
; Instalación rápida, moderna y limpia al estilo de Discord / Spotify / Telegram.
; Crea accesos directos e inicia la aplicación directamente con la nueva experiencia
; visual flotante y animada de GEVEN.
; ==============================================================================

!macro customInit
  ; Fijar el idioma en Español (LCID 3082)
  StrCpy $LANGUAGE 3082
!macroend

!macro customInstallMode
  ; Instalación por usuario (en %LOCALAPPDATA%\Programs\GEVEN) sin requerir elevación UAC
  StrCpy $isForceCurrentInstall 1
  StrCpy $isForceMachineInstall 0
!macroend
