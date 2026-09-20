package com.gestion.ventas.updates.viewmodel

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import androidx.core.content.pm.PackageInfoCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gestion.ventas.updates.model.UpdateInfo
import com.gestion.ventas.updates.network.UpdateApiService
import com.gestion.ventas.updates.util.HashVerifier
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

/**
 * Tipos de errores que pueden presentarse durante el ciclo de actualización.
 */
enum class UpdateErrorType {
    NO_CONNECTION,
    NETWORK_ERROR,
    PARSING_ERROR,
    DOWNLOAD_FAILED,
    HASH_MISMATCH,
    PERMISSION_DENIED,
    INSTALLATION_FAILED
}

/**
 * Estados observables de la interfaz de usuario para el proceso de actualización.
 */
sealed class UpdateUiState {
    object Idle : UpdateUiState()
    object Checking : UpdateUiState()
    data class UpdateAvailable(
        val updateInfo: UpdateInfo,
        val currentVersionCode: Long,
        val currentVersionName: String
    ) : UpdateUiState()

    data class Downloading(
        val progress: Int,
        val currentBytes: Long,
        val totalBytes: Long
    ) : UpdateUiState()

    object VerifyingHash : UpdateUiState()

    data class ReadyToInstall(
        val apkFile: File,
        val updateInfo: UpdateInfo
    ) : UpdateUiState()

    data class UpToDate(
        val currentVersionCode: Long,
        val currentVersionName: String,
        val isManual: Boolean
    ) : UpdateUiState()

    data class Error(
        val message: String,
        val errorType: UpdateErrorType,
        val retryableInfo: UpdateInfo? = null
    ) : UpdateUiState()
}

/**
 * ViewModel que orquesta la verificación, descarga y validación de integridad del APK.
 */
class UpdateViewModel @JvmOverloads constructor(
    application: Application,
    private val apiService: UpdateApiService = UpdateApiService()
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow<UpdateUiState>(UpdateUiState.Idle)
    val uiState: StateFlow<UpdateUiState> = _uiState.asStateFlow()

    private var activeDownloadedApk: File? = null

    /**
     * Obtiene el código y nombre de versión de la aplicación instalada.
     */
    fun getCurrentVersion(): Pair<Long, String> {
        return try {
            val context = getApplication<Application>()
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val vCode = PackageInfoCompat.getLongVersionCode(pInfo)
            val vName = pInfo.versionName ?: "1.0"
            Pair(vCode, vName)
        } catch (e: Exception) {
            Pair(1L, "1.0")
        }
    }

    /**
     * Verifica si el dispositivo cuenta con conexión activa a internet.
     */
    private fun isNetworkAvailable(): Boolean {
        val connectivityManager =
            getApplication<Application>().getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                ?: return false
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /**
     * Consulta el endpoint remoto para verificar si hay una nueva versión disponible.
     */
    fun checkForUpdates(endpointUrl: String, isManual: Boolean = false) {
        viewModelScope.launch {
            if (!isNetworkAvailable()) {
                if (isManual) {
                    _uiState.value = UpdateUiState.Error(
                        message = "No hay conexión a internet. Verifique su red Wi-Fi o datos móviles.",
                        errorType = UpdateErrorType.NO_CONNECTION
                    )
                }
                return@launch
            }

            _uiState.value = UpdateUiState.Checking

            val result = apiService.fetchUpdateInfo(endpointUrl)
            result.onSuccess { info ->
                val (currentCode, currentName) = getCurrentVersion()
                if (info.versionCode > currentCode) {
                    _uiState.value = UpdateUiState.UpdateAvailable(
                        updateInfo = info,
                        currentVersionCode = currentCode,
                        currentVersionName = currentName
                    )
                } else {
                    _uiState.value = UpdateUiState.UpToDate(
                        currentVersionCode = currentCode,
                        currentVersionName = currentName,
                        isManual = isManual
                    )
                }
            }.onFailure { error ->
                if (isManual) {
                    _uiState.value = UpdateUiState.Error(
                        message = "Error al consultar la última versión: ${error.localizedMessage ?: "Servidor no disponible"}",
                        errorType = UpdateErrorType.NETWORK_ERROR
                    )
                } else {
                    _uiState.value = UpdateUiState.Idle
                }
            }
        }
    }

    /**
     * Descarga el APK en el directorio de cache interno y verifica su integridad SHA-256.
     */
    fun startDownload(info: UpdateInfo) {
        viewModelScope.launch {
            if (!isNetworkAvailable()) {
                _uiState.value = UpdateUiState.Error(
                    message = "Se perdió la conexión a internet. No se pudo iniciar la descarga.",
                    errorType = UpdateErrorType.NO_CONNECTION,
                    retryableInfo = info
                )
                return@launch
            }

            val context = getApplication<Application>()
            // Guardar en cacheDir/updates/
            val updatesDir = File(context.cacheDir, "updates")
            if (!updatesDir.exists()) {
                updatesDir.mkdirs()
            }
            val destinationFile = File(updatesDir, "update-v${info.versionCode}.apk")

            _uiState.value = UpdateUiState.Downloading(progress = 0, currentBytes = 0L, totalBytes = 0L)

            val downloadResult = apiService.downloadApk(
                apkUrl = info.apkUrl,
                destinationFile = destinationFile
            ) { progress, currentBytes, totalBytes ->
                _uiState.value = UpdateUiState.Downloading(
                    progress = progress,
                    currentBytes = currentBytes,
                    totalBytes = totalBytes
                )
            }

            downloadResult.onSuccess { downloadedFile ->
                _uiState.value = UpdateUiState.VerifyingHash

                val isHashValid = HashVerifier.verify(downloadedFile, info.sha256)
                if (isHashValid) {
                    activeDownloadedApk = downloadedFile
                    _uiState.value = UpdateUiState.ReadyToInstall(downloadedFile, info)
                } else {
                    downloadedFile.delete()
                    _uiState.value = UpdateUiState.Error(
                        message = "La integridad del archivo descargado no coincide con el hash SHA-256 proporcionado. La descarga fue descartada por seguridad.",
                        errorType = UpdateErrorType.HASH_MISMATCH,
                        retryableInfo = info
                    )
                }
            }.onFailure { error ->
                destinationFile.delete()
                _uiState.value = UpdateUiState.Error(
                    message = "Falló la descarga de la actualización: ${error.localizedMessage ?: "Error de red"}",
                    errorType = UpdateErrorType.DOWNLOAD_FAILED,
                    retryableInfo = info
                )
            }
        }
    }

    fun resetState() {
        _uiState.value = UpdateUiState.Idle
    }

    fun getDownloadedFile(): File? = activeDownloadedApk
}
