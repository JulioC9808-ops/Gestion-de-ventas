!include "MUI2.nsh"

; Header y sidebar personalizados
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "build\installerheader.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP "build\installersidebar.bmp"

; Páginas del instalador
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "build\license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Idioma
!insertmacro MUI_LANGUAGE "Spanish"

; Imagen de carga personalizada
Function .onGUIInit
  SetBrandingImage "build\loader.gif"
FunctionEnd
