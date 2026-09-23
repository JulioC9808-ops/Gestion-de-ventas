package com.gestion.ventas.updates.ui

import android.app.Activity
import android.app.Dialog
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.gestion.ventas.R
import com.gestion.ventas.updates.model.UpdateInfo
import java.util.Locale

/**
 * Gestiona los diálogos y notificaciones flotantes de actualización en Android.
 * Estilo: tarjeta cristal oscura con borde, SIN recuadro blanco detrás.
 */
class UpdateDialogHelper(private val activity: Activity) {

    private var currentDialog: Dialog? = null
    private var progressDialog: Dialog? = null
    private var progressBar: ProgressBar? = null
    private var tvProgressPercent: TextView? = null
    private var tvProgressBytes: TextView? = null
    private var tvProgressStatus: TextView? = null

    /**
     * Crea el contenedor visual tipo tarjeta flotante de cristal oscuro.
     * Relleno oscuro translúcido + borde de color (nada de blanco).
     */
    private fun makeCard(context: Context, borderColor: String = "#3B82F6"): LinearLayout {
        val dp = context.resources.displayMetrics.density
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding((14 * dp).toInt(), (12 * dp).toInt(), (14 * dp).toInt(), (12 * dp).toInt())
            background = GradientDrawable().apply {
                cornerRadius = 16f * dp
                setColor(Color.parseColor("#E6151720")) // cristal oscuro (no blanco)
                setStroke((1.5f * dp).toInt(), Color.parseColor(borderColor))
            }
        }
    }

    /**
     * Obtiene el icono de la aplicación para mostrarlo en las notificaciones.
     */
    private fun appIcon(context: Context, sizeDp: Int): ImageView {
        val dp = context.resources.displayMetrics.density
        return ImageView(context).apply {
            val drawable = try {
                context.packageManager.getApplicationIcon(context.packageName)
            } catch (e: Exception) {
                null
            }
            if (drawable != null) setImageDrawable(drawable)
            layoutParams = LinearLayout.LayoutParams((sizeDp * dp).toInt(), (sizeDp * dp).toInt()).apply {
                marginEnd = (12 * dp).toInt()
            }
        }
    }

    /**
     * Configura la ventana del diálogo para que sea 100% transparente y flote
     * en la parte inferior sin ningún fondo residual ni oscurecimiento.
     */
    private fun setupFloatingWindow(dialog: Dialog, context: Context, maxWidthDp: Int = 360, noDim: Boolean = true) {
        val dp = context.resources.displayMetrics.density
        dialog.window?.apply {
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            decorView.setBackgroundColor(Color.TRANSPARENT)
            decorView.setPadding(0, 0, 0, 0)
            clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
            if (noDim) {
                addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL)
            }
            setGravity(Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL)
            val metrics = context.resources.displayMetrics
            val calculatedWidth = minOf((maxWidthDp * dp).toInt(), metrics.widthPixels - (28 * dp).toInt())
            setLayout(calculatedWidth, ViewGroup.LayoutParams.WRAP_CONTENT)
        }
    }

    /**
     * Muestra la notificación flotante de actualización disponible con botones "Sí" y "No".
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

        val card = makeCard(context, "#3B82F6")

        // Fila superior: Icono + Títulos
        val topRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        topRow.addView(appIcon(context, 38))

        val textCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }

        textCol.addView(TextView(context).apply {
            text = "Hay una nueva versión disponible"
            textSize = 13.5f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#FFFFFF"))
        })

        textCol.addView(TextView(context).apply {
            val versionStr = if (info.versionName.isNotBlank()) " (v${info.versionName})" else ""
            text = "¿Deseas descargarla?$versionStr"
            textSize = 12f
            setTextColor(Color.parseColor("#D1D5DB"))
            setPadding(0, (2 * dp).toInt(), 0, 0)
        })

        topRow.addView(textCol)
        card.addView(topRow)

        // Fila inferior: Botones de confirmación ("Sí" y "No")
        val buttonsRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END or Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = (10 * dp).toInt()
            }
        }

        fun createButton(label: String, bgColor: String, textColor: String, onClick: () -> Unit): TextView {
            return TextView(context).apply {
                text = label
                textSize = 13f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor(textColor))
                gravity = Gravity.CENTER
                setPadding((18 * dp).toInt(), (7 * dp).toInt(), (18 * dp).toInt(), (7 * dp).toInt())
                background = GradientDrawable().apply {
                    cornerRadius = 8f * dp
                    setColor(Color.parseColor(bgColor))
                }
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginStart = (8 * dp).toInt()
                }
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    dialogRef?.dismiss()
                    onClick()
                }
            }
        }

        if (!info.mandatory) {
            val btnNo = createButton("No", "#26FFFFFF", "#E5E7EB") {
                onPostponeClicked()
            }
            buttonsRow.addView(btnNo)
        }

        val btnYes = createButton("Sí", "#2563EB", "#FFFFFF") {
            onUpdateClicked()
        }
        buttonsRow.addView(btnYes)

        card.addView(buttonsRow)

        val root = FrameLayout(context).apply {
            setPadding((12 * dp).toInt(), 0, (12 * dp).toInt(), (16 * dp).toInt())
        }
        root.addView(card)

        val dialog = Dialog(context, R.style.UpdateCardDialog)
        dialogRef = dialog
        dialog.setContentView(root)
        dialog.setCancelable(!info.mandatory)
        dialog.setCanceledOnTouchOutside(!info.mandatory)
        if (!info.mandatory) {
            dialog.setOnCancelListener { onPostponeClicked() }
        }

        setupFloatingWindow(dialog, context, maxWidthDp = 350, noDim = true)
        currentDialog = dialog
        dialog.show()
    }

    /**
     * Muestra la tarjeta de descarga con barra de progreso en tiempo real.
     */
    fun showDownloadingDialog() {
        if (progressDialog != null && progressDialog!!.isShowing) return
        dismissCurrent()
        if (activity.isFinishing || activity.isDestroyed) return
        val context = activity
        val dp = context.resources.displayMetrics.density

        val card = makeCard(context, "#3B82F6")

        val topRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        topRow.addView(appIcon(context, 34))

        val col = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }

        tvProgressStatus = TextView(context).apply {
            text = "Descargando actualización…"
            textSize = 13f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#FFFFFF"))
        }

        progressBar = ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = true
            max = 100
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                (8 * dp).toInt()
            ).apply {
                topMargin = (6 * dp).toInt()
            }
        }

        val infoRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = (4 * dp).toInt()
            }
        }

        tvProgressPercent = TextView(context).apply {
            text = "0%"
            textSize = 11.5f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#60A5FA"))
        }

        tvProgressBytes = TextView(context).apply {
            text = "Preparando descarga…"
            textSize = 11f
            setTextColor(Color.parseColor("#9CA3AF"))
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }

        infoRow.addView(tvProgressPercent)
        infoRow.addView(tvProgressBytes)

        col.addView(tvProgressStatus)
        col.addView(progressBar)
        col.addView(infoRow)

        topRow.addView(col)
        card.addView(topRow)

        val root = FrameLayout(context).apply {
            setPadding((12 * dp).toInt(), 0, (12 * dp).toInt(), (16 * dp).toInt())
        }
        root.addView(card)

        val dialog = Dialog(context, R.style.UpdateCardDialog)
        dialog.setContentView(root)
        dialog.setCancelable(false)
        dialog.setCanceledOnTouchOutside(false)
        setupFloatingWindow(dialog, context, maxWidthDp = 340, noDim = true)

        progressDialog = dialog
        currentDialog = dialog
        dialog.show()
    }

    /**
     * Actualiza el porcentaje y los megabytes leídos en pantalla.
     */
    fun updateDownloadProgress(progress: Int, currentBytes: Long, totalBytes: Long) {
        activity.runOnUiThread {
            if (progress >= 0) {
                progressBar?.isIndeterminate = false
                progressBar?.progress = progress
                tvProgressPercent?.text = "$progress%"
            } else {
                progressBar?.isIndeterminate = true
                tvProgressPercent?.text = "…"
            }
            val currentMb = currentBytes / (1024.0 * 1024.0)
            tvProgressBytes?.text = if (totalBytes > 0) {
                String.format(Locale.getDefault(), "%.1f / %.1f MB", currentMb, totalBytes / (1024.0 * 1024.0))
            } else {
                String.format(Locale.getDefault(), "%.1f MB", currentMb)
            }
        }
    }

    /**
     * Cambia el estado a verificación de firma / hash.
     */
    fun showVerifyingStatus() {
        activity.runOnUiThread {
            progressBar?.isIndeterminate = true
            tvProgressStatus?.text = "Verificando archivo descargado…"
        }
    }

    /**
     * Notificación cuando se requiere permiso para instalar paquetes APK desconocidos.
     */
    fun showUnknownSourcesPermissionDialog(onAuthorize: () -> Unit, onCancel: () -> Unit) {
        dismissCurrent()
        if (activity.isFinishing || activity.isDestroyed) return
        val context = activity
        val dp = context.resources.displayMetrics.density
        var dialogRef: Dialog? = null

        val card = makeCard(context, "#3B82F6")

        val title = TextView(context).apply {
            text = "Permiso de instalación"
            textSize = 14f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#FFFFFF"))
        }

        val message = TextView(context).apply {
            text = "Para completar la actualización, permite que la aplicación instale archivos en los ajustes del sistema."
            textSize = 12.5f
            setTextColor(Color.parseColor("#D1D5DB"))
            setPadding(0, (4 * dp).toInt(), 0, 0)
        }

        val buttonsRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = (12 * dp).toInt()
            }
        }

        val btnCancel = TextView(context).apply {
            text = "Cancelar"
            textSize = 13f
            setTextColor(Color.parseColor("#D1D5DB"))
            setPadding((14 * dp).toInt(), (6 * dp).toInt(), (14 * dp).toInt(), (6 * dp).toInt())
            setOnClickListener {
                dialogRef?.dismiss()
                onCancel()
            }
        }

        val btnSettings = TextView(context).apply {
            text = "Abrir Ajustes"
            textSize = 13f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#FFFFFF"))
            setPadding((14 * dp).toInt(), (6 * dp).toInt(), (14 * dp).toInt(), (6 * dp).toInt())
            background = GradientDrawable().apply {
                cornerRadius = 8f * dp
                setColor(Color.parseColor("#2563EB"))
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                marginStart = (8 * dp).toInt()
            }
            setOnClickListener {
                dialogRef?.dismiss()
                onAuthorize()
            }
        }

        buttonsRow.addView(btnCancel)
        buttonsRow.addView(btnSettings)

        card.addView(title)
        card.addView(message)
        card.addView(buttonsRow)

        val root = FrameLayout(context).apply {
            setPadding((12 * dp).toInt(), 0, (12 * dp).toInt(), (16 * dp).toInt())
        }
        root.addView(card)

        val dialog = Dialog(context, R.style.UpdateCardDialog)
        dialogRef = dialog
        dialog.setContentView(root)
        dialog.setCancelable(false)
        setupFloatingWindow(dialog, context, maxWidthDp = 350, noDim = true)
        currentDialog = dialog
        dialog.show()
    }

    /**
     * Muestra una notificación de error en formato tarjeta flotante (borde rojo).
     */
    fun showErrorDialog(message: String, onRetry: (() -> Unit)? = null) {
        dismissCurrent()
        if (activity.isFinishing || activity.isDestroyed) return
        val context = activity
        val dp = context.resources.displayMetrics.density
        var dialogRef: Dialog? = null

        val card = makeCard(context, "#EF4444")

        val title = TextView(context).apply {
            text = "Aviso de actualización"
            textSize = 13.5f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#F87171"))
        }

        val msg = TextView(context).apply {
            text = message
            textSize = 12f
            setTextColor(Color.parseColor("#D1D5DB"))
            setPadding(0, (4 * dp).toInt(), 0, 0)
        }

        val buttonsRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = (10 * dp).toInt()
            }
        }

        if (onRetry != null) {
            val btnRetry = TextView(context).apply {
                text = "Reintentar"
                textSize = 13f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor("#60A5FA"))
                setPadding((12 * dp).toInt(), (6 * dp).toInt(), (12 * dp).toInt(), (6 * dp).toInt())
                setOnClickListener {
                    dialogRef?.dismiss()
                    onRetry()
                }
            }
            buttonsRow.addView(btnRetry)
        }

        val btnClose = TextView(context).apply {
            text = "Cerrar"
            textSize = 13f
            setTextColor(Color.parseColor("#9CA3AF"))
            setPadding((12 * dp).toInt(), (6 * dp).toInt(), (12 * dp).toInt(), (6 * dp).toInt())
            setOnClickListener {
                dialogRef?.dismiss()
            }
        }

        buttonsRow.addView(btnClose)

        card.addView(title)
        card.addView(msg)
        card.addView(buttonsRow)

        val root = FrameLayout(context).apply {
            setPadding((12 * dp).toInt(), 0, (12 * dp).toInt(), (16 * dp).toInt())
        }
        root.addView(card)

        val dialog = Dialog(context, R.style.UpdateCardDialog)
        dialogRef = dialog
        dialog.setContentView(root)
        dialog.setCancelable(true)
        setupFloatingWindow(dialog, context, maxWidthDp = 350, noDim = true)
        currentDialog = dialog
        dialog.show()
    }

    /**
     * Cierra cualquier diálogo o notificación activa.
     */
    fun dismissCurrent() {
        progressDialog?.dismiss()
        progressDialog = null
        currentDialog?.dismiss()
        currentDialog = null
    }
}
