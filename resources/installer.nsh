!macro customInstallMode
  ; Fuerza instalación solo para el usuario actual, sin mostrar la pantalla de elección
  StrCpy $isForceCurrentInstall 1
  StrCpy $isForceMachineInstall 0
!macroend
