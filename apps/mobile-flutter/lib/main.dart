import 'package:flutter/material.dart';

import 'app/livoria_app.dart';
import 'services/supabase/supabase_config.dart';

void main() {
  runApp(
    LivoriaApp(
      supabaseConfig: SupabaseConfig.fromEnvironment(),
    ),
  );
}
