import 'package:flutter/material.dart';

const livoriaBackground = Color(0xFFF7F8F5);
const livoriaBorder = Color(0xFFD9DFD5);
const livoriaCard = Color(0xFFFFFFFF);
const livoriaForeground = Color(0xFF19231D);
const livoriaPrimary = Color(0xFF2D5040);

final livoriaTheme = ThemeData(
  colorScheme: ColorScheme.fromSeed(
    background: livoriaBackground,
    seedColor: livoriaPrimary,
    surface: livoriaCard,
  ),
  scaffoldBackgroundColor: livoriaBackground,
  useMaterial3: true,
);
