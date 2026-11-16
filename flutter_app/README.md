# AL EQFAL – Unified Flutter App (Android APK / AAB & iOS App Store)

This Flutter codebase builds a **single unified application** for **Android** and **iOS** sharing the exact same database, Manager Google Drive sync & backup (`AL EQFAL Suppliers`), Employee accounts, Branches, RBAC permissions, Suppliers, Purchase Invoices, and Shifts & Sales as the AL EQFAL backend server.

## Architecture
- **One Shared Source of Truth**: Data is stored and backed up exclusively in the **Manager's Google Drive** (`al_eqfal_suppliers_data.json` + `Backups/`), served and verified by the AL EQFAL API server (`/api/*`). No Cloud Firestore is used.
- **Offline-First Safe Sync**: Each authenticated session caches only its branch/role-authorized workspace locally via `SharedPreferences`. When offline, new Suppliers, Purchase Invoices, and Shift/Sales entries are queued locally and automatically flushed to `/api/sync/batch` once connectivity returns.
- **Identical UI & Accounts**: Supports RTL Arabic and LTR English, Manager Google Sign-In (`drive.file` scope), and Employee username/password sign-in with branch isolation.

## Build Commands

### 1. Prerequisites
- Flutter SDK `>=3.24` (`flutter doctor`)
- Android Studio / Android SDK (for APK & AAB)
- macOS with Xcode 16+ (for iOS App Store IPA)
- Configure `DEFAULT_API_BASE_URL` or enter your deployed AL EQFAL server URL inside the app Login settings.
- For Google Sign-In on Android/iOS, add your OAuth Client ID (`GIDClientID` in `ios/Runner/Info.plist` and SHA-1 in Google Cloud Console for Android).

### 2. Install Packages
```bash
cd flutter_app
flutter pub get
```

### 3. Build Android APK (Direct Install / Testing)
```bash
flutter build apk --release --dart-define=AL_EQFAL_API_URL=https://YOUR_SERVER_URL
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### 4. Build Android App Bundle (Google Play Store AAB)
```bash
flutter build appbundle --release --dart-define=AL_EQFAL_API_URL=https://YOUR_SERVER_URL
# Output: build/app/outputs/bundle/release/app-release.aab
```

### 5. Build iOS App Store Release (Requires macOS + Xcode)
```bash
flutter build ipa --release --dart-define=AL_EQFAL_API_URL=https://YOUR_SERVER_URL
# Output: build/ios/ipa/al_eqfal_app.ipa (upload via Xcode Organizer or Transporter)
```
