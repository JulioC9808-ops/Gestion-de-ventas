package com.gestion.ventas.updates.ui

import android.app.Activity
import android.app.Dialog
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import com.gestion.ventas.updates.model.UpdateInfo
import java.util.Locale

/**
 * Gestor de diálogos de actualización (Changelog, Progreso, Verificación y Errores).
 * El aviso de nueva versión es una TARJETA COMPACTA (estilo notificación) anclada
 * abajo a la derecha, con el logo de la app y botones Sí / No siempre visibles.
 */
class UpdateDialogHelper(private val activity: Activity) {

    private var currentDialog: Dialog? = null
    private var progressDialog: AlertDialog? = null
    private var progressBar: ProgressBar? = null
    private var tvProgressPercent: TextView? = null
    private var tvProgressBytes: TextView? = null
    private var tvProgressStatus: TextView? = null

    /**
     * Tarjeta pequeña de actualización: logo + texto + Sí / No.
     * Tocar fuera = "No" (se quita y vuelve a preguntar en la próxima apertura).
     */
    fun showUpdateAvailableDialog(
        info: UpdateInfo,
        onUpdateClicked: () -> Unit,
        onPostponeClicked: () -> Unit
    ) {
        dismissCurrent()
        if (activity.isFinishing || activity.isDestroyed) return
        val context = activity
        val dp = context.resources.displayMetrics.density

        var dialogRef: Dialog? = null

        // --- Tarjeta ---
        val card = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding((14 * dp).toInt(), (12 * dp).toInt(), (14 * dp).toInt(), (12 * dp).toInt())
            background = GradientDrawable().apply {
                cornerRadius = 18f * dp
                setColor(Color.parseColor("#FAFAFA"))
                setStroke((1 * dp).toInt(), Color.parseColor("#D1D5DB"))
            }
        }

        // --- Logo de la app ---
        val iconView = ImageView(context).apply {
            val drawable = try {
                context.packageManager.getApplicationIcon(context.packageName)
            } catch (e: Exception) {
                null
            }
            if (drawable != null) setImageDrawable(drawable)
            layoutParams = LinearLayout.LayoutParams((40 * dp).toInt(), (40 * dp).toInt()).apply {
                marginEnd = (12 * dp).toInt()
            }
        }
        card.addView(iconView)

        // --- Textos ---
        val textCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        val tvTitle = TextView(context).apply {
            text = "Nueva versión disponible"
            textSize = 14f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#111827"))
        }
        val tvSub = TextView(context).apply {
            text = "v${info.versionName} — ¿Deseas descargarla?"
            textSize = 12f
            setTextColor(Color.parseColor("#4B5563"))
        }
        textCol.addView(tvTitle)
        textCol.addView(tvSub)
        card.addView(textCol)

        // --- Botones compactos ---
        fun miniButton(label: String, bgColor: String, fgColor: String, onClick: () -> Unit): TextView {
            return TextView(context).apply {
                text = label
                textSize = 13f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor(fgColor))
                gravity = Gravity.CENTER
                setPadding((14 * dp).toInt(), (8 * dp).toInt(), (14 * dp).toInt(), (8 * dp).toInt())
                background = GradientDrawable().apply {
                    cornerRadius = 12f * dp
                    setColor(Color.parseColor(bgColor))
                }
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { marginStart = (8 * dp).toInt() }
                setOnClickListener {
                    dialogRef?.dismiss()
                    onClick()
                }
            }
        }

        if (!info.mandatory) {
            card.addView(miniButton("No", "#E5E7EB", "#374151") { onPostponeClicked() })
        }
        card.addView(miniButton("Sí", "#2563EB", "#FFFFFF") { onUpdateClicked() })

        // --- Contenedor con margen respecto a los bordes de la pantalla ---
        val root = FrameLayout(context).apply {
            setPadding((12 * dp).toInt(), 0, (12 * dp).toInt(), (16 * dp).toInt())
        }
        root.addView(card)

        // --- Dialog anclado abajo a la derecha ---
        val dialog = Dialog(context)
        dialogRef = dialog
        dialog.setContentView(root)
        dialog.setCancelable(!info.mandatory)
        dialog.setCanceledOnTouchOutside(!info.mandatory)
        if (!info.mandatory) {
            dialog.setOnCancelListener { onPostponeClicked() }
        }
        dialog.window?.apply {
            setBackgroundDrawableResource(android.R.color.transparent)
            setGravity(Gravity.BOTTOM or Gravity.END)
            val metrics = android.util.DisplayMetrics()
            @Suppress("DEPRECATION")
            (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager)
                .defaultDisplay.getMetrics(metrics)
            val widthPx = minOf((340 * dp).toInt(), metrics.widthPixels - (24 * dp).toInt())
            setLayout(widthPx, ViewGroup.LayoutParams.WRAP_CONTENT)
        }
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
            setTypeface(null, Typeface.BOLD)
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
        val dialog = AlertDialog.Builder(context)
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
            tvProgressBytes?.text = "Seguridad"
        }
    }

    /**
     * Diálogo para solicitar permiso de instalación de aplicaciones desconocidas.
     */
    fun showUnknownSourcesPermissionDialog(onAuthorize: () -> Unit, onCancel: () -> Unit) {
        dismissCurrent()
        AlertDialog.Builder(activity)
            .setTitle("Permiso de instalación requerido")
            .setMessage("Para completar la actualización, debe permitir que esta aplicación instale aplicaciones desconocidas en los ajustes del sistema.")
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
        val builder = AlertDialog.Builder(activity)
        builder.setTitle("Aviso de actualización")
        builder.setMessage(message)
        builder.setPositiveButton("Aceptar", null)
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
