; ============================================================
;  Gestion De Ventas - Personalizacion del instalador NSIS
;  Todos los recursos salen de la carpeta "resources/"
;  (icon.ico, header.bmp, installersidebar.bmp, license.txt, loader.gif)
;
;  IMPORTANTE: electron-builder ya genera el wizard completo
;  (Welcome -> License -> Directory -> InstFiles -> Finish).
;  Aqui SOLO se sobreescriben sus recursos graficos, por eso
;  no se insertan macros MUI_PAGE_* : hacerlo crearia un
;  SEGUNDO wizard que se abre despues del primero.
; ============================================================

; ---- Limpiar defines que electron-builder inyecta por defecto ----
!ifdef MUI_ICON
  !undef MUI_ICON
!endif
!ifdef MUI_UNICON
  !undef MUI_UNICON
!endif
!ifdef MUI_HEADERIMAGE_BITMAP
  !undef MUI_HEADERIMAGE_BITMAP
!endif
!ifdef MUI_HEADERIMAGE_UNBITMAP
  !undef MUI_HEADERIMAGE_UNBITMAP
!endif
!ifdef MUI_WELCOMEFINISHPAGE_BITMAP
  !undef MUI_WELCOMEFINISHPAGE_BITMAP
!endif
!ifdef MUI_UNWELCOMEFINISHPAGE_BITMAP
  !undef MUI_UNWELCOMEFINISHPAGE_BITMAP
!endif

; ---- Iconos (rutas absolutas via ${PROJECT_DIR}) ----
!define MUI_ICON "${PROJECT_DIR}\resources\icon.ico"
!define MUI_UNICON "${PROJECT_DIR}\resources\icon.ico"

; ---- Header (150x57) ----
!ifndef MUI_HEADERIMAGE
  !define MUI_HEADERIMAGE
!endif
!define MUI_HEADERIMAGE_BITMAP "${PROJECT_DIR}\resources\header.bmp"
!define MUI_HEADERIMAGE_UNBITMAP "${PROJECT_DIR}\resources\header.bmp"
!define MUI_HEADERIMAGE_RIGHT

; ---- Sidebar de Welcome / Finish (164x314) ----
!define MUI_WELCOMEFINISHPAGE_BITMAP "${PROJECT_DIR}\resources\installersidebar.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "${PROJECT_DIR}\resources\installersidebar.bmp"

; ---- Textos en espanol de las paginas Welcome / Finish ----
!define MUI_WELCOMEPAGE_TITLE "Bienvenido a Gestion De Ventas"
!define MUI_WELCOMEPAGE_TEXT "Este asistente le guiara durante la instalacion de Gestion De Ventas.$\r$\n$\r$\nSe recomienda cerrar el resto de aplicaciones antes de continuar.$\r$\n$\r$\nSoporte del desarrollador: +53 51616816"
!define MUI_FINISHPAGE_TITLE "Instalacion completada"
!define MUI_FINISHPAGE_TEXT "Gestion De Ventas se instalo correctamente en su equipo."
!define MUI_LICENSEPAGE_TEXT_TOP "Lea el Acuerdo de Licencia de Usuario Final (EULA)."
!define MUI_LICENSEPAGE_BUTTON "Acepto"

; ---- Imagen de marca (branding) ----
; NSIS solo admite BMP en SetBrandingImage; loader.gif se copia como
; recurso de la app y se muestra dentro del programa, no en el wizard.
Function customWelcomePage_show
FunctionEnd

; ---- Accesos directos con la ruta correcta del ejecutable ----
!macro customInstall
  CreateShortCut "$DESKTOP\Gestion De Ventas.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Gestion De Ventas.lnk"
!macroend
