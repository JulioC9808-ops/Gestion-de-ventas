package com.gestion.ventas.updates

import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.gestion.ventas.updates.model.UpdateInfo
import com.gestion.ventas.updates.ui.UpdateDialogHelper
import com.gestion.ventas.updates.util.ApkInstaller
import com.gestion.ventas.updates.viewmodel.UpdateErrorType
import com.gestion.ventas.updates.viewmodel.UpdateUiState
import com.gestion.ventas.updates.viewmodel.UpdateViewModel
import com.gestion.ventas.updates.worker.UpdateCheckWorker
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.io.File

/**
 * Coordinador principal del sistema de actualizaciones in-app.
 */
class UpdateManager private constructor(
    private val activity: AppCompatActivity,
    private val endpointUrl: String
) {
    private val viewModel: UpdateViewModel =
        ViewModelProvider(activity, UpdateViewModel.Factory(activity.application))[UpdateViewModel::class.java]
    private val dialogHelper = UpdateDialogHelper(activity)
    private var pendingApkToInstall: File? = null

    init {
        observeState()
    }

    private fun observeState() {
        activity.lifecycleScope.launch {
            viewModel.uiState.collectLatest { state ->
                when (state) {
                    is UpdateUiState.Idle -> {
                        // Estado de reposo
                    }
                    is UpdateUiState.Checking -> {
                        // Verificando versión
                    }
                    is UpdateUiState.UpdateAvailable -> {
                        dialogHelper.showUpdateAvailableDialog(
                            info = state.updateInfo,
                            onUpdateClicked = {
                                dialogHelper.showDownloadingDialog(state.updateInfo.mandatory)
                                viewModel.startDownload(state.updateInfo)
                            },
                            onPostponeClicked = {
                                viewModel.resetState()
                            }
                        )
                    }
                    is UpdateUiState.Downloading -> {
                        dialogHelper.updateDownloadProgress(
                            progress = state.progress,
                            currentBytes = state.currentBytes,
                            totalBytes = state.totalBytes
                        )
                    }
                    is UpdateUiState.VerifyingHash -> {
                        dialogHelper.showVerifyingStatus()
                    }
                    is UpdateUiState.ReadyToInstall -> {
                        dialogHelper.dismissCurrent()
                        proceedToInstall(state.apkFile)
                    }
                    is UpdateUiState.UpToDate -> {
                        if (state.isManual) {
                            Toast.makeText(
                                activity,
                                "Tienes instalada la versión más reciente (v${state.currentVersionName})",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                    is UpdateUiState.Error -> {
                        val retryAction: (() -> Unit)? = state.retryableInfo?.let { info ->
                            {
                                dialogHelper.showDownloadingDialog(info.mandatory)
                                viewModel.startDownload(info)
                            }
                        }
                        dialogHelper.showErrorDialog(state.message, retryAction)
                    }
                }
            }
        }
    }

    private fun proceedToInstall(apkFile: File) {
        pendingApkToInstall = apkFile
        if (!ApkInstaller.canInstallUnknownApps(activity)) {
            dialogHelper.showUnknownSourcesPermissionDialog(
                onAuthorize = {
                    ApkInstaller.requestUnknownAppsPermission(activity)
                },
                onCancel = {
                    Toast.makeText(
                        activity,
                        "No se puede instalar la actualización sin el permiso de fuentes desconocidas",
                        Toast.LENGTH_LONG
                    ).show()
                }
            )
            return
        }

        val result = ApkInstaller.installApk(activity, apkFile)
        result.onFailure { error ->
            dialogHelper.showErrorDialog(
                "No se pudo iniciar el instalador del sistema: ${error.localizedMessage ?: "Error desconocido"}"
            )
        }
    }

    /**
     * Debe llamarse desde el onActivityResult de la Activity para reanudar la instalación
     * tras conceder el permiso en Ajustes.
     */
    fun onActivityResult(requestCode: Int) {
        if (requestCode == ApkInstaller.REQUEST_CODE_UNKNOWN_SOURCES) {
            if (ApkInstaller.canInstallUnknownApps(activity)) {
                pendingApkToInstall?.let { apk ->
                    proceedToInstall(apk)
                }
            } else {
                Toast.makeText(
                    activity,
                    "Permiso denegado. No es posible continuar con la actualización.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    /**
     * Inicia la comprobación de actualización.
     */
    fun check(isManual: Boolean = false) {
        viewModel.checkForUpdates(endpointUrl, isManual)
    }

    companion object {
        private var instance: UpdateManager? = null

        /**
         * Inicializa el sistema de actualizaciones en la actividad principal.
         */
        fun init(
            activity: AppCompatActivity,
            endpointUrl: String,
            scheduleBackgroundHours: Long = 12
        ): UpdateManager {
            val manager = UpdateManager(activity, endpointUrl)
            instance = manager

            // 1. Chequeo automático en apertura
            manager.check(isManual = false)

            // 2. Programar chequeo periódico con WorkManager
            if (scheduleBackgroundHours > 0) {
                UpdateCheckWorker.schedule(
                    context = activity.applicationContext,
                    endpointUrl = endpointUrl,
                    repeatIntervalHours = scheduleBackgroundHours
                )
            }

            return manager
        }

        fun getInstance(): UpdateManager? = instance
    }
}
