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

class UpdateDialogHelper(private val activity: Activity) {

    private var currentDialog: Dialog? = null
    private var progressDialog: Dialog? = null
    private var progressBar: ProgressBar? = null
    private var tvProgressPercent: TextView? = null
    private var tvProgressBytes: TextView? = null
    private var tvProgressStatus: TextView? = null

    private fun makeCard(context: Context, small: Boolean): LinearLayout {
        val dp = context.resources.displayMetrics.density
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding((14 * dp).toInt(), (12 * dp).toInt(), (14 * dp).toInt(), (12 * dp).toInt())
            background = GradientDrawable().apply {
                cornerRadius = 18f * dp
                setColor(Color.parseColor("#FFFFFF"))
                setStroke((2 * dp).toInt(), Color.parseColor("#2563EB"))
            }
        }
    }

    private fun appIcon(context: Context, sizeDp: Int): ImageView {
        val dp = context.resources.displayMetrics.density
        return ImageView(context).apply {
            val drawable = try {
                context.packageManager.getApplicationIcon(context.packageName)
            } catch (e: Exception) { null }
            if (drawable != null) setImageDrawable(drawable)
            layoutParams = LinearLayout.LayoutParams((sizeDp * dp).toInt(), (sizeDp * dp).toInt()).apply {
                marginEnd = (12 * dp).toInt()
            }
        }
    }

    private fun anchorBottomEnd(dialog: Dialog, context: Context, widthDp: Int, noDim: Boolean) {
        val dp = context.resources.displayMetrics.density
        dialog.window?.apply {
            setBackgroundDrawableResource(android.R.color.transparent)
            setGravity(Gravity.BOTTOM or Gravity.END)
            if (noDim) {
                clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
                addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL)
                addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE)
            }
            val metrics = android.util.DisplayMetrics()
            @Suppress("DEPRECATION")
            (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager)
                .defaultDisplay.getMetrics(metrics)
            setLayout(minOf((widthDp * dp).toInt(), metrics.widthPixels - (24 * dp).toInt()),
                ViewGroup.LayoutParams.WRAP_CONTENT)
        }
    }

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

        val card = makeCard(context, true)
        card.addView(appIcon(context, 40))

        val textCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        textCol.addView(TextView(context).apply {
            text = "Nueva versión disponible"
            textSize = 14f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#111827"))
        })
        textCol.addView(TextView(context).apply {
            text = "v${info.versionName} — ¿Deseas descargarla?"
            textSize = 12f
            setTextColor(Color.parseColor("#4B5563"))
        })
        card.addView(textCol)

        fun miniButton(label: String, bg: String, fg: String, onClick: () -> Unit): TextView {
            return TextView(context).apply {
                text = label
                textSize = 13f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.parseColor(fg))
                gravity = Gravity.CENTER
                setPadding((14 * dp).toInt(), (8 * dp).toInt(), (14 * dp).toInt(), (8 * dp).toInt())
                background = GradientDrawable().apply {
                    cornerRadius = 12f * dp
                    setColor(Color.parseColor(bg))
                }
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { marginStart = (8 * dp).toInt() }
                setOnClickListener { dialogRef?.dismiss(); onClick() }
            }
        }

        if (!info.mandatory) {
            card.addView(miniButton("No", "#E5E7EB", "#374151") { onPostponeClicked() })
        }
        card.addView(miniButton("Sí", "#2563EB", "#FFFFFF") { onUpdateClicked() })

        val root = FrameLayout(context).apply {
            setPadding((12 * dp).toInt(), 0, (12 * dp).toInt(), (16 * dp).toInt())
        }
        root.addView(card)

        val dialog = Dialog(context, R.style.UpdateCardDialog)
        dialogRef = dialog
        dialog.setContentView(root)
        dialog.setCancelable(!info.mandatory)
        dialog.setCanceledOnTouchOutside(!info.mandatory)
        if (!info.mandatory) dialog.setOnCancelListener { onPostponeClicked() }
        anchorBottomEnd(dialog, context, 340, noDim = false)
        currentDialog = dialog
        dialog.show()
    }

    fun showDownloadingDialog() {
        if (progressDialog != null && progressDialog!!.isShowing) return
        dismissCurrent()
        if (activity.isFinishing || activity.isDestroyed) return
        val context = activity
        val dp = context.resources.displayMetrics.density

        val card = makeCard(context, true)
        card.addView(appIcon(context, 36))

        val col = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        tvProgressStatus = TextView(context).apply {
            text = "Descargando actualización…"
            textSize = 13f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#111827"))
        }
        progressBar = ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = true
            max = 100
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, (10 * dp).toInt()
            ).apply { topMargin = (6 * dp).toInt() }
        }
        val infoRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = (4 * dp).toInt() }
        }
        tvProgressPercent = TextView(context).apply {
            text = "0%"
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#2563EB"))
        }
        tvProgressBytes = TextView(context).apply {
            text = "Preparando…"
            textSize = 11f
            setTextColor(Color.parseColor("#6B7280"))
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        infoRow.addView(tvProgressPercent)
        infoRow.addView(tvProgressBytes)
        col.addView(tvProgressStatus)
        col.addView(progressBar)
        col.addView(infoRow)
        card.addView(col)

        val root = FrameLayout(context).apply {
            setPadding((12 * dp).toInt(), 0, (12 * dp).toInt(), (16 * dp).toInt())
        }
        root.addView(card)

        val dialog = Dialog(context, R.style.UpdateCardDialog)
        dialog.setContentView(root)
        dialog.setCancelable(false)
        dialog.setCanceledOnTouchOutside(false)
        anchorBottomEnd(dialog, context, 320, noDim = true)
        progressDialog = dialog
        currentDialog = dialog
        dialog.show()
    }

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

    fun showVerifyingStatus() {
        activity.runOnUiThread {
            progressBar?.isIndeterminate = true
            tvProgressStatus?.text = "Verificando integridad…"
        }
    }

    fun showUnknownSourcesPermissionDialog(onAuthorize: () -> Unit, onCancel: () -> Unit) {
        dismissCurrent()
        AlertDialog.Builder(activity)
            .setTitle("Permiso de instalación requerido")
            .setMessage("Para completar la actualización, permita que esta aplicación instale aplicaciones desconocidas en los ajustes del sistema.")
            .setPositiveButton("Ir a Ajustes") { _, _ -> onAuthorize() }
            .setNegativeButton("Cancelar") { _, _ -> onCancel() }
            .setCancelable(false)
            .show()
    }

    fun showErrorDialog(message: String, onRetry: (() -> Unit)? = null) {
        dismissCurrent()
        val builder = AlertDialog.Builder(activity)
        builder.setTitle("Aviso de actualización")
        builder.setMessage(message)
        builder.setPositiveButton("Aceptar", null)
        if (onRetry != null) builder.setNeutralButton("Reintentar") { _, _ -> onRetry() }
        builder.show()
    }

    fun dismissCurrent() {
        progressDialog?.dismiss()
        progressDialog = null
        currentDialog?.dismiss()
        currentDialog = null
    }
}
