; ==============================================================================
; GEVEN - Personalización NSIS con Sidebar Permanente
; ==============================================================================
; Configuración exclusiva para electron-builder + NSIS.
; Muestra resources/installersidebar.bmp como Sidebar vertical fijo en el lado
; izquierdo del instalador durante TODO el asistente (License, Directory, InstFiles, Finish).
; ==============================================================================

!macro customInstallMode
  ; Fuerza instalación solo para el usuario actual, sin mostrar la pantalla de elección.
  ; IMPORTANTE: NO declarar 'Var isForceCurrentInstall' ni 'Var isForceMachineInstall'
  ; aquí, ya que la plantilla de electron-builder (multiUserUi.nsh) las define globalmente.
  StrCpy $isForceCurrentInstall 1
  StrCpy $isForceMachineInstall 0
!macroend

!ifndef BUILD_UNINSTALLER

  ; Definición del hook GUIInit de Modern UI 2
  !define MUI_CUSTOMFUNCTION_GUIINIT GevenInstallerGUIInit

  ; Variables únicas para control y bitmap del Sidebar permanente
  Var g_gevenSidebarHwnd
  Var g_gevenSidebarBitmap
  Var g_gevenSidebarInitialized

  !macro customHeader
    ; Mueve un control hijo de $HWNDPARENT 164 px hacia la derecha
    Function GevenShiftControlRight
      Exch $R0 ; ID del control
      Push $R1
      Push $1
      Push $2
      Push $3
      Push $4
      Push $5
      Push $6

      GetDlgItem $R1 $HWNDPARENT $R0
      ${If} $R1 != 0
        System::Call '*(i, i, i, i) p.r1'
        System::Call 'user32::GetWindowRect(p $R1, p r1)'
        System::Call '*$1(i .r2, i .r3, i .r4, i .r5)'
        System::Free $1

        System::Call '*(i, i) p.r1'
        System::Call '*$1(i r2, i r3)'
        System::Call 'user32::ScreenToClient(p $HWNDPARENT, p r1)'
        System::Call '*$1(i .r2, i .r3)'
        System::Free $1

        IntOp $5 $4 - $2 ; ancho
        IntOp $6 $5 - $3 ; alto
        IntOp $2 $2 + 164 ; nueva posición X

        System::Call 'user32::SetWindowPos(p $R1, p 0, i r2, i r3, i r5, i r6, i 0x14)'
      ${EndIf}

      Pop $6
      Pop $5
      Pop $4
      Pop $3
      Pop $2
      Pop $R1
      Pop $R0
    FunctionEnd

    ; Ensancha un control horizontal (ej: línea separadora inferior) en 164 px
    Function GevenWidenControl
      Exch $R0 ; ID del control
      Push $R1
      Push $1
      Push $2
      Push $3
      Push $4
      Push $5
      Push $6

      GetDlgItem $R1 $HWNDPARENT $R0
      ${If} $R1 != 0
        System::Call '*(i, i, i, i) p.r1'
        System::Call 'user32::GetWindowRect(p $R1, p r1)'
        System::Call '*$1(i .r2, i .r3, i .r4, i .r5)'
        System::Free $1

        System::Call '*(i, i) p.r1'
        System::Call '*$1(i r2, i r3)'
        System::Call 'user32::ScreenToClient(p $HWNDPARENT, p r1)'
        System::Call '*$1(i .r2, i .r3)'
        System::Free $1

        IntOp $5 $4 - $2 ; ancho original
        IntOp $6 $5 - $3 ; alto
        IntOp $5 $5 + 164 ; ensanchado

        System::Call 'user32::SetWindowPos(p $R1, p 0, i r2, i r3, i r5, i r6, i 0x14)'
      ${EndIf}

      Pop $6
      Pop $5
      Pop $4
      Pop $3
      Pop $2
      Pop $R1
      Pop $R0
    FunctionEnd

    ; Posiciona el encabezado superior a partir de x=164 para no tapar el sidebar
    Function GevenShiftHeaderArea
      Exch $R0 ; ID del control
      Push $R1
      Push $1
      Push $2
      Push $3
      Push $4
      Push $5
      Push $6

      GetDlgItem $R1 $HWNDPARENT $R0
      ${If} $R1 != 0
        System::Call '*(i, i, i, i) p.r1'
        System::Call 'user32::GetWindowRect(p $R1, p r1)'
        System::Call '*$1(i .r2, i .r3, i .r4, i .r5)'
        System::Free $1

        System::Call '*(i, i) p.r1'
        System::Call '*$1(i r2, i r3)'
        System::Call 'user32::ScreenToClient(p $HWNDPARENT, p r1)'
        System::Call '*$1(i .r2, i .r3)'
        System::Free $1

        IntOp $5 $4 - $2 ; ancho
        IntOp $6 $5 - $3 ; alto

        System::Call 'user32::SetWindowPos(p $R1, p 0, i 164, i r3, i r5, i r6, i 0x14)'
      ${EndIf}

      Pop $6
      Pop $5
      Pop $4
      Pop $3
      Pop $2
      Pop $R1
      Pop $R0
    FunctionEnd

    ; Timer periódico para asegurar que el Sidebar siempre permanezca visible,
    ; en el orden Z correcto y que ninguna página secundaria lo solape al navegar.
    Function GevenOnSidebarTimer
      ${If} $g_gevenSidebarHwnd != 0
        System::Call 'user32::IsWindow(p $g_gevenSidebarHwnd) i.r0'
        ${If} $0 != 0
          System::Call 'user32::ShowWindow(p $g_gevenSidebarHwnd, i 5)' ; SW_SHOW
          System::Call 'user32::BringWindowToTop(p $g_gevenSidebarHwnd)'
        ${EndIf}
      ${EndIf}

      ; Comprueba el diálogo de página interior actual (#32770)
      FindWindow $0 "#32770" "" $HWNDPARENT
      ${If} $0 != 0
        ; Si la página tiene el control 1044 (página Finish), utiliza el layout nativo de pantalla completa
        GetDlgItem $1 $0 1044
        ${If} $1 == 0
          System::Call '*(i, i, i, i) p.r1'
          System::Call 'user32::GetWindowRect(p $0, p r1)'
          System::Call '*$1(i .r2, i .r3, i .r4, i .r5)'
          System::Free $1

          System::Call '*(i, i) p.r1'
          System::Call '*$1(i r2, i r3)'
          System::Call 'user32::ScreenToClient(p $HWNDPARENT, p r1)'
          System::Call '*$1(i .r2, i .r3)'
          System::Free $1

          ${If} $r2 < 164
            IntOp $5 $4 - $2 ; ancho
            IntOp $6 $5 - $3 ; alto
            System::Call 'user32::SetWindowPos(p $0, p 0, i 164, i r3, i r5, i r6, i 0x14)'
          ${EndIf}
        ${EndIf}
      ${EndIf}
    FunctionEnd

    ; Inicialización visual del instalador
    Function GevenInstallerGUIInit
      ${If} $g_gevenSidebarInitialized == 1
        Return
      ${EndIf}
      StrCpy $g_gevenSidebarInitialized 1

      InitPluginsDir
      ; Extrae el bitmap del sidebar para cargarlo dinámicamente
      !ifdef MUI_WELCOMEFINISHPAGE_BITMAP
        File "/oname=$PLUGINSDIR\installersidebar.bmp" "${MUI_WELCOMEFINISHPAGE_BITMAP}"
      !else
        File "/oname=$PLUGINSDIR\installersidebar.bmp" "resources\installersidebar.bmp"
      !endif

      ; 1. Ampliar $HWNDPARENT 164 px para alojar el Sidebar sin recortar controles
      System::Call '*(i, i, i, i) p.r0'
      System::Call 'user32::GetWindowRect(p $HWNDPARENT, p r0)'
      System::Call '*$0(i .r1, i .r2, i .r3, i .r4)'
      System::Free $0

      IntOp $5 $3 - $1 ; ancho actual
      IntOp $6 $4 - $2 ; alto actual
      IntOp $7 $5 + 164 ; nuevo ancho (+164 px para el Sidebar)

      ; Centrar la ventana proporcionalmente
      IntOp $8 $1 - 82
      ${If} $8 < 0
        StrCpy $8 0
      ${EndIf}

      System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i r8, i r2, i r7, i r6, i 0x14)'

      ; 2. Crear control estático de bitmap en $HWNDPARENT (permanente en todo el wizard)
      ; 0x5000000E = WS_CHILD | WS_VISIBLE | SS_BITMAP
      System::Call 'user32::CreateWindowEx(i 0, t "STATIC", t "", i 0x5000000E, i 0, i 0, i 164, i 314, p $HWNDPARENT, i 1200, p 0, p 0) p.r0'
      StrCpy $g_gevenSidebarHwnd $0

      ; Carga el bitmap real (164x314)
      System::Call 'user32::LoadImage(p 0, t "$PLUGINSDIR\installersidebar.bmp", i 0, i 164, i 314, i 0x10) p.r1'
      StrCpy $g_gevenSidebarBitmap $1
      SendMessage $g_gevenSidebarHwnd 0x0172 0 $g_gevenSidebarBitmap ; STM_SETIMAGE

      ; 3. Desplazar botones inferiores a la derecha (+164 px)
      Push 1 ; Botón Siguiente / Instalar (IDC_NEXT)
      Call GevenShiftControlRight
      Push 2 ; Botón Cancelar (IDC_CANCEL)
      Call GevenShiftControlRight
      Push 3 ; Botón Atrás (IDC_BACK)
      Call GevenShiftControlRight

      ; 4. Desplazar el marco de páginas interiores (control 1018)
      ; Esto garantiza que NSIS cree las páginas estándar (licencia, carpeta, progreso) a partir de x=164
      Push 1018
      Call GevenShiftControlRight

      ; 5. Ajustar líneas separadoras inferiores
      Push 1035 ; Línea inferior estándar
      Call GevenWidenControl
      Push 1045 ; Línea inferior full-window
      Call GevenWidenControl

      ; 6. Ajustar textos de branding
      Push 1028
      Call GevenShiftControlRight
      Push 1256
      Call GevenShiftControlRight

      ; 7. Ajustar controles del encabezado superior
      Push 1034 ; Fondo del encabezado (alinear a x=164)
      Call GevenShiftHeaderArea
      Push 1036 ; Línea inferior del encabezado
      Call GevenShiftHeaderArea
      Push 1037 ; Título del encabezado
      Call GevenShiftControlRight
      Push 1038 ; Subtítulo del encabezado
      Call GevenShiftControlRight
      Push 1046 ; Imagen/Icono del encabezado
      Call GevenShiftControlRight

      ; 8. Iniciar timer para vigilar cambios de página continuos
      GetFunctionAddress $0 GevenOnSidebarTimer
      nsDialogs::CreateTimer $0 50
    FunctionEnd
  !macroend

!endif


