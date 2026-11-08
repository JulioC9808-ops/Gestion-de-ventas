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

; Definición de textos en Español para Modern UI (MUI_TEXT_*)
!define MUI_TEXT_LICENSE_TITLE "Acuerdo de licencia"
!define MUI_TEXT_LICENSE_SUBTITLE "Por favor, revise los términos de la licencia antes de instalar ${PRODUCT_NAME}."
!define MUI_INNERTEXT_LICENSE_TOP "Presione Re Pág (Page Down) para ver el resto del acuerdo."
!define MUI_INNERTEXT_LICENSE_BOTTOM "Si acepta todos los términos del acuerdo, haga clic en Acepto para continuar."
!define MUI_INNERTEXT_LICENSE_BOTTOM_CHECKBOX "Si acepta los términos del acuerdo, marque la casilla abajo. Debe aceptar el acuerdo para instalar ${PRODUCT_NAME}. Haga clic en Siguiente para continuar."
!define MUI_INNERTEXT_LICENSE_BOTTOM_RADIOBUTTONS "Si acepta los términos del acuerdo, seleccione la primera opción abajo. Debe aceptar el acuerdo para instalar ${PRODUCT_NAME}. Haga clic en Siguiente para continuar."

!define MUI_TEXT_DIRECTORY_TITLE "Elegir lugar de instalación"
!define MUI_TEXT_DIRECTORY_SUBTITLE "Elija la carpeta en la cual se instalará ${PRODUCT_NAME}."

!define MUI_TEXT_INSTALLING_TITLE "Instalando"
!define MUI_TEXT_INSTALLING_SUBTITLE "Por favor, espere mientras ${PRODUCT_NAME} se instala en su computadora."

!define MUI_TEXT_FINISH_TITLE "Completando la instalación de ${PRODUCT_NAME}"
!define MUI_TEXT_FINISH_SUBTITLE "La instalación de ${PRODUCT_NAME} se ha completado en su sistema."
!define MUI_TEXT_FINISH_INFO_TITLE "Completando la instalación de ${PRODUCT_NAME}"
!define MUI_TEXT_FINISH_INFO_TEXT "${PRODUCT_NAME} ha sido instalado en su sistema.$\r$\n$\r$\nHaga clic en Finalizar para cerrar este asistente."
!define MUI_TEXT_FINISH_INFO_REBOOT "Su sistema debe ser reiniciado para completar la instalación de ${PRODUCT_NAME}. ¿Desea reiniciar ahora?"
!define MUI_TEXT_FINISH_REBOOTNOW "Reiniciar ahora"
!define MUI_TEXT_FINISH_REBOOTLATER "Deseo reiniciar manualmente más tarde"
!define MUI_TEXT_FINISH_RUN "Ejecutar ${PRODUCT_NAME}"
!define MUI_TEXT_FINISH_SHOWREADME "Mostrar Léame"

!define MUI_BUTTONTEXT_FINISH "&Finalizar"

!ifndef BUILD_UNINSTALLER

  ; Definición del hook GUIInit de Modern UI 2
  !define MUI_CUSTOMFUNCTION_GUIINIT GevenInstallerGUIInit

  ; Variables únicas para control y bitmap del Sidebar permanente
  Var g_gevenSidebarHwnd
  Var g_gevenSidebarBitmap
  Var g_gevenSidebarInitialized

  !macro customHeader
    ; Mueve un control hijo de $HWNDPARENT 164 px hacia la derecha sin alterar su ancho ni alto
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

        ; r4 = rect.right, r2 = rect.left -> ancho original = r4 - r2
        IntOp $4 $4 - $2
        ; r5 = rect.bottom, r3 = rect.top -> alto original = r5 - r3
        IntOp $5 $5 - $3

        System::Call '*(i, i) p.r1'
        System::Call '*$1(i r2, i r3)'
        System::Call 'user32::ScreenToClient(p $HWNDPARENT, p r1)'
        System::Call '*$1(i .r2, i .r3)'
        System::Free $1

        IntOp $2 $2 + 164 ; nueva posición X

        ; SetWindowPos: x=r2, y=r3, cx=r4 (ancho original), cy=r5 (alto original), uFlags=0x14 (SWP_NOZORDER|SWP_NOACTIVATE)
        System::Call 'user32::SetWindowPos(p $R1, p 0, i r2, i r3, i r4, i r5, i 0x14)'
        System::Call 'user32::InvalidateRect(p $R1, p 0, i 1)'
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

        ; r4 = rect.right, r2 = rect.left -> ancho original = r4 - r2
        IntOp $4 $4 - $2
        ; r5 = rect.bottom, r3 = rect.top -> alto original = r5 - r3
        IntOp $5 $5 - $3
        ; ensanchado en 164 px
        IntOp $4 $4 + 164

        ; SetWindowPos: x=r2, y=r3, cx=r4, cy=r5
        System::Call 'user32::SetWindowPos(p $R1, p 0, i r2, i r3, i r4, i r5, i 0x14)'
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

        ; r4 = rect.right, r2 = rect.left -> ancho
        IntOp $4 $4 - $2
        ; r5 = rect.bottom, r3 = rect.top -> alto
        IntOp $5 $5 - $3

        System::Call '*(i, i) p.r1'
        System::Call '*$1(i r2, i r3)'
        System::Call 'user32::ScreenToClient(p $HWNDPARENT, p r1)'
        System::Call '*$1(i .r2, i .r3)'
        System::Free $1

        ; SetWindowPos: x=164, y=r3, cx=r4, cy=r5
        System::Call 'user32::SetWindowPos(p $R1, p 0, i 164, i r3, i r4, i r5, i 0x14)'
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
    ; en el orden Z correcto y que la página interior (#32770) ocupe todo el ancho
    ; desde x=164 hasta el borde derecho sin dejar ningún cuadro gris en el Finish.
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
        ; 1. Ancho cliente total de $HWNDPARENT
        System::Call '*(i, i, i, i) p.r1'
        System::Call 'user32::GetClientRect(p $HWNDPARENT, p r1)'
        System::Call '*$1(i .r2, i .r3, i .r4, i .r5)'
        System::Free $1
        ; r4 = ancho cliente total. Restamos 164 px del Sidebar permanente
        IntOp $6 $4 - 164

        ; 2. Rect en pantalla de #32770
        System::Call '*(i, i, i, i) p.r1'
        System::Call 'user32::GetWindowRect(p $0, p r1)'
        System::Call '*$1(i .r2, i .r3, i .r4, i .r5)'
        System::Free $1
        ; r7 = alto real del diálogo interior (rect.bottom - rect.top)
        IntOp $7 $5 - $3

        ; 3. Convertir origen (r2, r3) a coordenadas cliente de $HWNDPARENT
        System::Call '*(i, i) p.r1'
        System::Call '*$1(i r2, i r3)'
        System::Call 'user32::ScreenToClient(p $HWNDPARENT, p r1)'
        System::Call '*$1(i .r2, i .r3)'
        System::Free $1

        ; 4. Si la página no está en x=164 o no cubre todo el ancho restante:
        ${If} $r2 != 164
        ${OrIf} $r4 != $6
          ; SetWindowPos: x=164, y=r3, cx=r6 (cubre hasta el borde derecho), cy=r7
          System::Call 'user32::SetWindowPos(p $0, p 0, i 164, i r3, i r6, i r7, i 0x14)'
          System::Call 'user32::InvalidateRect(p $0, p 0, i 1)'
          System::Call 'user32::InvalidateRect(p $HWNDPARENT, p 0, i 1)'
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

!macro customInit
  ; Asegurar que el instalador siempre use el idioma español (LCID 3082)
  ; incluso en sistemas configurados en inglés u otros idiomas
  StrCpy $LANGUAGE 3082
!macroend


