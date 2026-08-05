!include "MUI2.nsh"

; --- Configuración básica ---
!define MUI_ICON "build\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "build\installerheader.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP "build\installersidebar.bmp"

; --- Páginas estándar ---
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "build\license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; --- Idiomas ---
!insertmacro MUI_LANGUAGE "Spanish"

; --- Barra de progreso personalizada ---
Function .onGUIInit
  ; Reemplaza la barra por un loader animado
  SetBrandingImage "build\loader.gif"
FunctionEnd
