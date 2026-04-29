// lib/theme/app_text_styles.dart
//
// Tipografías VetApp.
// - Inter: toda la UI (cuerpos, botones, labels)
// - Instrument Serif italic: títulos hero y del análisis
// - JetBrains Mono: kickers, timestamps, datos técnicos

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppText {
  AppText._();

  // ─── Helpers ───────────────────────────────────────────────────────────
  static TextStyle _inter({
    double size = 14,
    FontWeight weight = FontWeight.w400,
    Color? color,
    double letter = 0,
    double height = 1.4,
  }) =>
      GoogleFonts.inter(
        fontSize: size,
        fontWeight: weight,
        color: color ?? AppColors.ink,
        letterSpacing: letter,
        height: height,
      );

  static TextStyle _serif({double size = 34, Color? color, double letter = -0.8}) =>
      GoogleFonts.instrumentSerif(
        fontSize: size,
        fontStyle: FontStyle.italic,
        fontWeight: FontWeight.w500,
        color: color ?? AppColors.ink,
        letterSpacing: letter,
        height: 1.05,
      );

  static TextStyle _mono({double size = 10, Color? color, double letter = 1.2}) =>
      GoogleFonts.jetBrainsMono(
        fontSize: size,
        fontWeight: FontWeight.w500,
        color: color ?? AppColors.ink40,
        letterSpacing: letter,
      );

  // ─── Roles tipográficos ────────────────────────────────────────────────
  // Display (splash, login, analysis hero)
  static TextStyle get displayLg => _serif(size: 44, letter: -1);
  static TextStyle get displayMd => _serif(size: 34);
  static TextStyle get displaySm => _serif(size: 26, letter: -0.5);

  // Titles (section titles en pantalla, card headers)
  static TextStyle get titleLg => _inter(size: 20, weight: FontWeight.w600, letter: -0.4);
  static TextStyle get titleMd => _inter(size: 16, weight: FontWeight.w600, letter: -0.2);
  static TextStyle get titleSm => _inter(size: 14, weight: FontWeight.w600);

  // Body
  static TextStyle get bodyLg => _inter(size: 15);
  static TextStyle get bodyMd => _inter(size: 13);
  static TextStyle get bodySm => _inter(size: 12, color: AppColors.ink60);

  // Labels
  static TextStyle get label   => _inter(size: 12, weight: FontWeight.w500, color: AppColors.ink80);
  static TextStyle get caption => _inter(size: 11, color: AppColors.ink60);

  // Kicker (all-caps monospace tipo "PASO 3 DE 10", "DIAGNÓSTICOS PROBABLES")
  static TextStyle get kicker => _mono(size: 10, letter: 1.4);

  // Mono (datos técnicos: timestamps, ID, versión)
  static TextStyle get mono => _mono(size: 11, letter: 0.3, color: AppColors.ink60);

  // Button labels
  static TextStyle get button => _inter(size: 14, weight: FontWeight.w500, letter: -0.1);
}
