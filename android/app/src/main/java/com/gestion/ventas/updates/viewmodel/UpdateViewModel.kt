package com.gestion.ventas.updates.viewmodel

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.core.content.pm.PackageInfoCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.gestion.ventas.updates.model.UpdateInfo
import com.gestion.ventas.updates.network.UpdateApiService
import com.gestion.ventas.updates.util.HashVerifier
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

enum class UpdateErrorType {
    NO_CONNECTION,
    NETWORK_ERROR,
    PARSING_ERROR,
    DOWNLOAD_FAILED,
    HASH_MISMATCH,
    PERMISSION_DENIED,
    INSTALLATION_FAILED
}

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

class UpdateViewModel(
    application: Application,
    private val apiService: UpdateApiService = UpdateApiService()
) : AndroidViewModel(application) {

    class Factory(private val application: Application) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            @Suppress("UNCHECKED_CAST")
            return UpdateViewModel(application) as T
        }
    }

    private val _uiState = MutableStateFlow<UpdateUiState>(UpdateUiState.Idle)
    val uiState: StateFlow<UpdateUiState> = _uiState.asStateFlow()

    private var activeDownloadedApk: File? = null

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

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager =
            getApplication<Application>().getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                ?: return false
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun updatesDir(): File {
        val context = getApplication<Application>()
        val dir = File(context.cacheDir, "updates")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    private fun partialFileFor(versionCode: Long): File =
        File(updatesDir(), "update-v$versionCode.apk.tmp")

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
                val isNewCode = info.versionCode > currentCode
                val isNewName = isVersionNameGreater(info.versionName, currentName)

                if (isNewCode || isNewName) {
                    _uiState.value = UpdateUiState.UpdateAvailable(
                        updateInfo = info,
                        currentVersionCode = currentCode,
                        currentVersionName = currentName
                    )
                    // REANUDACIÓN AUTOMÁTICA: si existe una descarga parcial de ESTA
                    // versión (el usuario ya dijo "Sí" antes y se cortó o cerró la app),
                    // continúa directamente sin volver a preguntar.
                    val partial = partialFileFor(info.versionCode)
                    if (partial.exists() && partial.length() > 0) {
                        startDownload(info)
                    }
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

    fun startDownload(info: UpdateInfo) {
        viewModelScope.launch {
            if (!isNetworkAvailable()) {
                _uiState.value = UpdateUiState.Error(
                    message = "Se perdió la conexión a internet. La descarga se reanudará cuando haya conexión.",
                    errorType = UpdateErrorType.NO_CONNECTION,
                    retryableInfo = info
                )
                return@launch
            }

            val destinationFile = File(updatesDir(), "update-v${info.versionCode}.apk")
            val resumeFrom = partialFileFor(info.versionCode).let {
                if (it.exists() && it.length() > 0) it.length() else 0L
            }

            _uiState.value = UpdateUiState.Downloading(progress = 0, currentBytes = 0L, totalBytes = 0L)

            val downloadResult = apiService.downloadApk(
                apkUrl = info.apkUrl,
                destinationFile = destinationFile,
                resumeFromBytes = resumeFrom
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
                        message = "La integridad del archivo descargado no coincide. La descarga fue descartada por seguridad.",
                        errorType = UpdateErrorType.HASH_MISMATCH,
                        retryableInfo = info
                    )
                }
            }.onFailure { error ->
                // NO se borra el parcial: el próximo intento reanuda desde donde quedó.
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

    private fun isVersionNameGreater(remote: String, current: String): Boolean {
        if (remote.isBlank() || current.isBlank()) return false
        try {
            val cleanRemote = remote.replace(Regex("[^0-9.]"), "")
            val cleanCurrent = current.replace(Regex("[^0-9.]"), "")
            val rParts = cleanRemote.split(".").map { it.toIntOrNull() ?: 0 }
            val cParts = cleanCurrent.split(".").map { it.toIntOrNull() ?: 0 }
            val maxLen = maxOf(rParts.size, cParts.size)
            for (i in 0 until maxLen) {
                val r = rParts.getOrElse(i) { 0 }
                val c = cParts.getOrElse(i) { 0 }
                if (r > c) return true
                if (r < c) return false
            }
        } catch (e: Exception) {
            // Ignored
        }
        return false
    }

    fun getDownloadedFile(): File? = activeDownloadedApk
}
