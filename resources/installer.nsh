!include "MUI2.nsh"

; --- Iconos y recursos ---
!define MUI_ICON "resources/icon.ico"
!define MUI_UNICON "resources/icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "resources/header.bmp"
!define MUI_HEADERIMAGE_ICON "resources/icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "resources/installersidebar.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "resources/installersidebar.bmp"

; --- Nombre del producto ---
Name "Gestion De Ventas"
OutFile "dist-installer/GestionDeVentas-Setup-${VERSION}.exe"
InstallDir "$PROGRAMFILES\GestionDeVentas"

; --- Páginas estándar ---
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "resources/license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; --- Páginas de desinstalación ---
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; --- Idioma ---
!insertmacro MUI_LANGUAGE "Spanish"

; --- Sección principal ---
Section "Instalar"
  SetOutPath "$INSTDIR"
  File /r "dist\*.*"
  File /r "electron\*.*"
  File "package.json"

  ; Crear accesos directos
  CreateDirectory "$SMPROGRAMS\GestionDeVentas"
  CreateShortCut "$SMPROGRAMS\GestionDeVentas\Gestion De Ventas.lnk" "$INSTDIR\GestionDeVentas.exe"
  CreateShortCut "$DESKTOP\Gestion De Ventas.lnk" "$INSTDIR\GestionDeVentas.exe"
SectionEnd

; --- Sección de desinstalación ---
Section "Uninstall"
  Delete "$DESKTOP\Gestion De Ventas.lnk"
  RMDir /r "$SMPROGRAMS\GestionDeVentas"
  RMDir /r "$INSTDIR"
SectionEnd

