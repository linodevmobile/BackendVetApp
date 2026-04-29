// lib/theme/app_colors.dart
//
// VetApp — paleta oficial, alineada a DESIGN.md y al prototipo.
// Usar SIEMPRE estas constantes. No hardcodear hex en widgets.

import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ─── Superficies (neutros fríos) ───────────────────────────────────────
  static const Color bg         = Color(0xFFF8F9FA); // fondo de pantalla
  static const Color surface    = Color(0xFFFFFFFF); // cards, inputs
  static const Color surfaceAlt = Color(0xFFEEF0F3); // fills sutiles
  static const Color line       = Color(0xFFDDE2E8); // hairlines
  static const Color lineSoft   = Color(0xFFE9ECF0); // divisores internos

  // ─── Tinta (escala fría, no pura negra) ────────────────────────────────
  static const Color ink     = Color(0xFF0E1726); // texto principal
  static const Color ink80   = Color(0xFF2B3748); // secundario
  static const Color ink60   = Color(0xFF5A6576); // auxiliar
  static const Color ink40   = Color(0xFF8B94A3); // placeholder, disabled
  static const Color ink20   = Color(0xFFC2C8D1); // outlines de inputs

  // ─── Primario (brand) ──────────────────────────────────────────────────
  static const Color primary     = Color(0xFF0052CC); // azul VetApp
  static const Color primarySoft = Color(0xFFE1ECFB); // tint para chips/bg
  static const Color primaryInk  = Color(0xFF003D99); // pressed / AI

  // ─── Señales clínicas ──────────────────────────────────────────────────
  static const Color urgent     = Color(0xFFD73A49); // emergencia, vencido
  static const Color urgentSoft = Color(0xFFFBE2E4);
  static const Color warn       = Color(0xFFB8860B); // atención, pendiente firma
  static const Color warnSoft   = Color(0xFFF7ECD0);
  static const Color ok         = Color(0xFF2E7D3A); // éxito, completo
  static const Color okSoft     = Color(0xFFDCEBDF);

  // ─── IA (misma familia azul para mantenerse en sistema) ────────────────
  static const Color ai     = Color(0xFF003D99);
  static const Color aiSoft = Color(0xFFE1ECFB);
}
