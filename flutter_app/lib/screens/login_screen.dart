import 'package:flutter/material.dart';
import '../l10n/app_strings.dart';

class LoginScreen extends StatefulWidget {
  final String lang;
  final ValueChanged<String> onChangeLang;
  final String serverUrl;
  final ValueChanged<String> onChangeServerUrl;
  final Future<void> Function() onManagerGoogleLogin;
  final Future<void> Function(String username, String password) onEmployeeLogin;
  final bool isLoading;
  final String? error;

  const LoginScreen({
    super.key,
    required this.lang,
    required this.onChangeLang,
    required this.serverUrl,
    required this.onChangeServerUrl,
    required this.onManagerGoogleLogin,
    required this.onEmployeeLogin,
    required this.isLoading,
    this.error,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isManagerMode = true;
  bool _showServerSettings = false;
  bool _obscurePassword = true;
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  late final TextEditingController _serverController;

  @override
  void initState() {
    super.initState();
    _serverController = TextEditingController(text: widget.serverUrl);
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _serverController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = AppStrings(widget.lang);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        s.brandTitle,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(value: 'ar', label: Text('العربية')),
                          ButtonSegment(value: 'en', label: Text('English')),
                        ],
                        selected: {widget.lang},
                        onSelectionChanged: (set) => widget.onChangeLang(set.first),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const CircleAvatar(
                          radius: 26,
                          backgroundColor: Color(0xFFEFF6FF),
                          child: Icon(Icons.lock_outline, color: Color(0xFF1D4ED8), size: 28),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          s.loginTitle,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          s.loginSubtitle,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 18),
                        SegmentedButton<bool>(
                          segments: [
                            ButtonSegment(
                              value: true,
                              icon: const Icon(Icons.verified_user_outlined, size: 18),
                              label: Text(s.managerTab),
                            ),
                            ButtonSegment(
                              value: false,
                              icon: const Icon(Icons.person_outline, size: 18),
                              label: Text(s.employeeTab),
                            ),
                          ],
                          selected: {_isManagerMode},
                          onSelectionChanged: (set) => setState(() => _isManagerMode = set.first),
                        ),
                        const SizedBox(height: 18),
                        if (widget.error != null) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF1F2),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFFECDD3)),
                            ),
                            child: Text(
                              widget.error!,
                              style: const TextStyle(color: Color(0xFF9F1239), fontSize: 13),
                            ),
                          ),
                          const SizedBox(height: 14),
                        ],
                        if (_isManagerMode) ...[
                          Text(
                            s.managerDesc,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                          ),
                          const SizedBox(height: 18),
                          FilledButton.icon(
                            onPressed: widget.isLoading ? null : widget.onManagerGoogleLogin,
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF1D4ED8),
                              minimumSize: const Size.fromHeight(48),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            icon: const Icon(Icons.account_circle_outlined),
                            label: Text(s.signInWithGoogle),
                          ),
                        ] else ...[
                          Text(
                            s.employeeDesc,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _usernameController,
                            textDirection: TextDirection.ltr,
                            decoration: InputDecoration(
                              labelText: s.username,
                              border: const OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            textDirection: TextDirection.ltr,
                            decoration: InputDecoration(
                              labelText: s.password,
                              border: const OutlineInputBorder(),
                              suffixIcon: IconButton(
                                icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          FilledButton(
                            onPressed: widget.isLoading
                                ? null
                                : () => widget.onEmployeeLogin(
                                      _usernameController.text.trim(),
                                      _passwordController.text,
                                    ),
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF1D4ED8),
                              minimumSize: const Size.fromHeight(48),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: Text(s.signIn),
                          ),
                        ],
                        const SizedBox(height: 14),
                        TextButton.icon(
                          onPressed: () => setState(() => _showServerSettings = !_showServerSettings),
                          icon: const Icon(Icons.settings_outlined, size: 16),
                          label: Text(s.serverUrlLabel),
                        ),
                        if (_showServerSettings) ...[
                          TextField(
                            controller: _serverController,
                            textDirection: TextDirection.ltr,
                            decoration: InputDecoration(
                              labelText: s.serverUrlLabel,
                              border: const OutlineInputBorder(),
                              suffixIcon: IconButton(
                                icon: const Icon(Icons.check),
                                onPressed: () => widget.onChangeServerUrl(_serverController.text.trim()),
                              ),
                            ),
                            onSubmitted: (val) => widget.onChangeServerUrl(val.trim()),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
