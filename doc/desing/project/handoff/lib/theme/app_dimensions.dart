// lib/theme/app_dimensions.dart
//
// Radios y spacing del sistema VetApp.
// Import junto a app_colors y app_text_styles.

class AppRadii {
  AppRadii._();

  static const double r1 = 4;   // chips, pills pequeños
  static const double r2 = 8;   // inputs, botones
  static const double r3 = 12;  // cards, dialogs
  static const double r4 = 16;  // bottom sheets, splash, modales grandes
  static const double pill = 999; // chips redondos completos
}

class AppSpacing {
  AppSpacing._();

  static const double xs  = 4;   // gap entre chips
  static const double sm  = 8;   // gap interno de elementos
  static const double md  = 12;  // padding interno cards
  static const double lg  = 16;  // padding de pantalla estándar
  static const double xl  = 20;  // separación entre secciones
  static const double xxl = 24;  // separación entre bloques grandes
  static const double section = 40; // salto entre secciones mayores

  // Alturas fijas de sistema
  static const double tabBarHeight = 72;
  static const double buttonSm = 32;
  static const double buttonMd = 42;
  static const double buttonLg = 52;
  static const double inputHeight = 44;
  static const double avatarSm = 32;
  static const double avatarMd = 40;
  static const double avatarLg = 48;
}
