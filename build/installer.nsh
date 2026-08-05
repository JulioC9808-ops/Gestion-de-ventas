!include "MUI2.nsh"

; Iconos
!ifdef MUI_ICON
  !undef MUI_ICON
!endif
!ifdef MUI_UNICON
  !undef MUI_UNICON
!endif
!define MUI_ICON "resources\icon.ico"
!define MUI_UNICON "resources\icon.ico"

; Sidebar / Welcome bitmaps
!ifdef MUI_WELCOMEFINISHPAGE_BITMAP
  !undef MUI_WELCOMEFINISHPAGE_BITMAP
!endif
!ifdef MUI_UNWELCOMEFINISHPAGE_BITMAP
  !undef MUI_UNWELCOMEFINISHPAGE_BITMAP
!endif
!define MUI_WELCOMEFINISHPAGE_BITMAP "resources\installersidebar.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "resources\installersidebar.bmp"

; Header personalizado
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "resources\installerheader.bmp"
!define MUI_HEADERIMAGE_RIGHT

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

; Imagen de carga personalizada
Function .onGUIInit
  SetBrandingImage "resources\loader.gif"
FunctionEnd
