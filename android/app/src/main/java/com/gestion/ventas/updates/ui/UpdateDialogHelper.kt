package com.gestion.ventas.updates.ui

import android.app.Activity
import android.app.Dialog
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import com.gestion.ventas.updates.model.UpdateInfo
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import java.util.Locale

/**
 * Gestor de diálogos personalizados de actualización (Changelog, Progreso, Verificación y Errores).
 */
class UpdateDialogHelper(private val activity: Activity) {

    private var currentDialog: Dialog? = null
    private var progressDialog: AlertDialog? = null
    private var progressBar: ProgressBar? = null
    private var tvProgressPercent: TextView? = null
    private var tvProgressBytes: TextView? = null
    private var tvProgressStatus: TextView? = null

    /**
     * Muestra el diálogo con el changelog y opciones de actualización.
     */
    fun showUpdateAvailableDialog(
        info: UpdateInfo,
        onUpdateClicked: () -> Unit,
        onPostponeClicked: () -> Unit
    ) {
        dismissCurrent()

        val context = activity
        val dp = context.resources.displayMetrics.density

        val container = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding((20 * dp).toInt(), (16 * dp).toInt(), (20 * dp).toInt(), (8 * dp).toInt())
        }

        // Subtítulo con versión
        val tvVersion = TextView(context).apply {
            text = "Versión ${info.versionName} (Build ${info.versionCode})"
            textSize = 14f
            setTextColor(Color.parseColor("#4B5563"))
            setPadding(0, 0, 0, (8 * dp).toInt())
        }
        container.addView(tvVersion)

        // Indicador si es obligatoria
        if (info.mandatory) {
            val tvMandatory = TextView(context).apply {
                text = "⚠️ Esta actualización es obligatoria para continuar operando."
                textSize = 13f
                setTextColor(Color.parseColor("#DC2626"))
                setPadding(0, 0, 0, (12 * dp).toInt())
            }
            container.addView(tvMandatory)
        }

        // Encabezado de notas
        val tvNotesHeader = TextView(context).apply {
            text = "Novedades y cambios:"
            textSize = 14f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(Color.parseColor("#1F2937"))
            setPadding(0, 0, 0, (6 * dp).toInt())
        }
        container.addView(tvNotesHeader)

        // Scrollview para el changelog
        val scrollView = ScrollView(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                (140 * dp).toInt()
            )
            setBackgroundColor(Color.parseColor("#F3F4F6"))
            setPadding((12 * dp).toInt(), (10 * dp).toInt(), (12 * dp).toInt(), (10 * dp).toInt())
        }

        val tvChangelog = TextView(context).apply {
            text = if (info.changelog.isNotBlank()) info.changelog else "Mejoras de rendimiento y corrección de errores."
            textSize = 13f
            setTextColor(Color.parseColor("#374151"))
            setLineSpacing(4f, 1.15f)
        }
        scrollView.addView(tvChangelog)
        container.addView(scrollView)

        val builder = MaterialAlertDialogBuilder(context)
            .setTitle("🚀 Nueva versión disponible")
            .setView(container)
            .setCancelable(!info.mandatory)
            .setPositiveButton("Actualizar") { _, _ ->
                onUpdateClicked()
            }

        if (!info.mandatory) {
            builder.setNegativeButton("Más tarde") { _, _ ->
                onPostponeClicked()
            }
        }

        val dialog = builder.create()
        dialog.setCanceledOnTouchOutside(!info.mandatory)
        currentDialog = dialog
        dialog.show()
    }

    /**
     * Muestra el diálogo con la barra de progreso de descarga en tiempo real.
     */
    fun showDownloadingDialog(isMandatory: Boolean) {
        dismissCurrent()

        val context = activity
        val dp = context.resources.displayMetrics.density

        val container = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding((24 * dp).toInt(), (20 * dp).toInt(), (24 * dp).toInt(), (20 * dp).toInt())
        }

        tvProgressStatus = TextView(context).apply {
            text = "Iniciando descarga de la actualización..."
            textSize = 14f
            setTextColor(Color.parseColor("#374151"))
            setPadding(0, 0, 0, (12 * dp).toInt())
        }
        container.addView(tvProgressStatus)

        progressBar = ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = true
            max = 100
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                (16 * dp).toInt()
            )
        }
        container.addView(progressBar)

        val infoRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = (10 * dp).toInt()
            }
        }

        tvProgressPercent = TextView(context).apply {
            text = "0%"
            textSize = 12f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(Color.parseColor("#1F2937"))
        }
        infoRow.addView(tvProgressPercent)

        tvProgressBytes = TextView(context).apply {
            text = "Calculando tamaño..."
            textSize = 12f
            setTextColor(Color.parseColor("#6B7280"))
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
            )
        }
        infoRow.addView(tvProgressBytes)

        container.addView(infoRow)

        val dialog = MaterialAlertDialogBuilder(context)
            .setTitle("Descargando actualización")
            .setView(container)
            .setCancelable(false)
            .create()

        dialog.setCanceledOnTouchOutside(false)
        progressDialog = dialog
        currentDialog = dialog
        dialog.show()
    }

    /**
     * Actualiza el progreso visual de la descarga.
     */
    fun updateDownloadProgress(progress: Int, currentBytes: Long, totalBytes: Long) {
        activity.runOnUiThread {
            if (progress >= 0) {
                progressBar?.isIndeterminate = false
                progressBar?.progress = progress
                tvProgressPercent?.text = "$progress%"
            } else {
                progressBar?.isIndeterminate = true
                tvProgressPercent?.text = "Descargando..."
            }

            val currentMb = currentBytes / (1024.0 * 1024.0)
            if (totalBytes > 0) {
                val totalMb = totalBytes / (1024.0 * 1024.0)
                tvProgressBytes?.text = String.format(Locale.getDefault(), "%.1f / %.1f MB", currentMb, totalMb)
            } else {
                tvProgressBytes?.text = String.format(Locale.getDefault(), "%.1f MB", currentMb)
            }
            tvProgressStatus?.text = "Descargando paquete de instalación..."
        }
    }

    /**
     * Muestra el estado de comprobación de integridad SHA-256.
     */
    fun showVerifyingStatus() {
        activity.runOnUiThread {
            progressBar?.isIndeterminate = true
            tvProgressStatus?.text = "Verificando integridad SHA-256 del APK..."
            tvProgressPercent?.text = "Validando..."
            tvProgressBytes?.text = "Seguridad criptográfica"
        }
    }

    /**
     * Diálogo para solicitar permiso de instalación de aplicaciones desconocidas.
     */
    fun showUnknownSourcesPermissionDialog(onAuthorize: () -> Unit, onCancel: () -> Unit) {
        dismissCurrent()
        MaterialAlertDialogBuilder(activity)
            .setTitle("Permiso de instalación requerido")
            .setMessage("Para completar la actualización automática, debe permitir que esta aplicación instale aplicaciones desconocidas en los ajustes del sistema.")
            .setPositiveButton("Ir a Ajustes") { _, _ -> onAuthorize() }
            .setNegativeButton("Cancelar") { _, _ -> onCancel() }
            .setCancelable(false)
            .show()
    }

    /**
     * Muestra diálogo de error con opción de reintentar si aplica.
     */
    fun showErrorDialog(message: String, onRetry: (() -> Unit)? = null) {
        dismissCurrent()
        val builder = MaterialAlertDialogBuilder(activity)
            .setTitle("Aviso de actualización")
            .setMessage(message)
            .setPositiveButton("Aceptar", null)

        if (onRetry != null) {
            builder.setNeutralButton("Reintentar") { _, _ ->
                onRetry()
            }
        }

        builder.show()
    }

    /**
     * Cierra cualquier diálogo activo.
     */
    fun dismissCurrent() {
        progressDialog?.dismiss()
        progressDialog = null
        currentDialog?.dismiss()
        currentDialog = null
    }
}
