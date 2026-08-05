!include "MUI2.nsh"

; Iconos (solo desde resources, no los de electron-builder)
!define MUI_ICON "resources\icon.ico"
!define MUI_UNICON "resources\icon.ico"

; Header y sidebar personalizados
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "resources\header.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP "resources\installersidebar.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "resources\installersidebar.bmp"

; Páginas del instalador
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "resources\license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Idioma
!insertmacro MUI_LANGUAGE "Spanish"

; Imagen de carga personalizada
Function .onGUIInit
  SetBrandingImage "resources\loader.gif"
FunctionEnd
