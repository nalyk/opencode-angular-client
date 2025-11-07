# OpenCode Android Client

This document provides instructions for building and running the OpenCode Angular client as an Android application.

## Overview

The OpenCode client has been enhanced with Capacitor to support native Android deployment. The Android app allows you to connect to your OpenCode server from your mobile device and interact with your development environment on the go.

## Features

- **Native Android App**: Full-featured Android application built with Capacitor
- **Configurable Server URL**: Set your OpenCode server URL directly in the app
- **Connection Testing**: Test your server connection before saving configuration
- **Persistent Settings**: Server configuration is saved locally on your device
- **Real-time Updates**: SSE (Server-Sent Events) support for live updates
- **Modern UI**: Beautiful Material Design-inspired interface

## Prerequisites

Before building the Android app, ensure you have:

1. **Node.js** (v18 or higher) - https://nodejs.org/
2. **Android Studio** - https://developer.android.com/studio
3. **Java Development Kit (JDK)** - JDK 17 or higher
4. **Android SDK** - Installed via Android Studio

### Android Studio Setup

1. Download and install Android Studio
2. Open Android Studio and go to **Tools > SDK Manager**
3. Install the following:
   - Android SDK Platform (API level 33 or higher)
   - Android SDK Build-Tools
   - Android Emulator (optional, for testing)
4. Configure environment variables:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   ```

## Building the Android App

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build the Angular App

```bash
npm run build
```

This creates an optimized production build in `dist/angular-client/browser/`.

### Step 3: Sync to Android

```bash
npx cap sync android
```

This copies the built web assets to the Android project and updates native plugins.

### Step 4: Build the APK

You have two options for building the APK:

#### Option A: Using Gradle (Command Line)

```bash
cd android
./gradlew assembleDebug
```

The debug APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

For a release build (requires signing configuration):
```bash
./gradlew assembleRelease
```

#### Option B: Using Android Studio

1. Open Android Studio
2. Click **Open an Existing Project**
3. Navigate to the `android` folder in your project
4. Wait for Gradle sync to complete
5. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
6. The APK will be generated in `android/app/build/outputs/apk/`

### Step 5: Install on Device

#### Via Command Line (with device connected via USB):

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### Via Android Studio:

1. Connect your Android device via USB (enable USB debugging)
2. Click the **Run** button (green play icon)
3. Select your device from the list

## Configuring the App

### First Launch

When you first launch the app on Android, you'll see a server configuration screen:

1. **Enter Server URL**: Input your OpenCode server URL
   - Example: `http://192.168.1.100:3000`
   - Use your computer's local IP address (not `localhost`)
   - Ensure your device is on the same network as your server

2. **Test Connection**: Click "Test Connection" to verify the server is reachable

3. **Save & Continue**: Once the connection test succeeds, save your configuration

### Finding Your Server IP Address

#### On macOS:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

#### On Linux:
```bash
hostname -I
```

#### On Windows:
```bash
ipconfig
```

Look for your local network IP (usually starts with `192.168.` or `10.0.`)

### Changing Server Configuration

To change the server URL later:

1. Navigate to the app's server configuration page at `/server-config`
2. Or clear the app's data in Android Settings

## Development Workflow

### Live Reload Development

For development with live reload:

1. Start the Angular dev server:
   ```bash
   npm run dev
   ```

2. In another terminal, open in Android Studio:
   ```bash
   npx cap open android
   ```

3. In `capacitor.config.ts`, temporarily add:
   ```typescript
   server: {
     url: 'http://YOUR_IP:4200',
     cleartext: true
   }
   ```

4. Run the app from Android Studio

Now changes to your Angular code will hot-reload on the device!

**Remember**: Remove the `server` config before building a production APK.

## Project Structure

```
android/                          # Native Android project
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/            # Java/Kotlin source files
│   │   │   ├── res/             # Android resources
│   │   │   ├── assets/          # Web assets (from build)
│   │   │   └── AndroidManifest.xml
│   └── build.gradle             # App-level Gradle config
├── build.gradle                 # Project-level Gradle config
├── gradle.properties            # Gradle properties
├── gradlew                      # Gradle wrapper (Unix)
└── gradlew.bat                  # Gradle wrapper (Windows)

src/
├── app/
│   ├── components/
│   │   └── server-config/       # Server configuration UI
│   └── services/
│       └── server-config.service.ts  # Server config management
└── ...
```

## Architecture

### Server Configuration

The Android app uses Capacitor's Preferences plugin to store the server URL persistently:

- **ServerConfigService** (`src/app/services/server-config.service.ts`)
  - Manages server URL storage and retrieval
  - Detects native vs web platform
  - Provides connection testing
  - Validates URL format

### Platform Detection

The app automatically detects whether it's running on native Android or in a browser:

- **Native Platform**: Requires server URL configuration
- **Web Platform**: Uses proxy configuration (localhost:3000)

This is handled via `Capacitor.isNativePlatform()`.

### API Requests

- **Web**: API requests go through the dev server proxy (`proxy.conf.mjs`)
- **Android**: API requests use the configured server URL directly

### SSE Connection

- **Web**: Connects to `/event` (proxied to backend)
- **Android**: Connects to `{serverUrl}/event`

## Troubleshooting

### Connection Issues

**Problem**: Can't connect to server from Android app

**Solutions**:
1. Verify server is running on your computer
2. Use your computer's local IP address (not `localhost`)
3. Ensure phone and computer are on the same Wi-Fi network
4. Check firewall settings on your computer
5. Try accessing the URL in your phone's browser first

### Build Errors

**Problem**: Gradle build fails

**Solutions**:
1. Update Android Studio and SDK tools
2. Clean the build:
   ```bash
   cd android
   ./gradlew clean
   ```
3. Invalidate caches in Android Studio:
   **File > Invalidate Caches / Restart**

### App Crashes on Launch

**Problem**: App crashes immediately after opening

**Solutions**:
1. Check Android Logcat in Android Studio
2. Rebuild the Angular app:
   ```bash
   npm run build
   npx cap sync android
   ```
3. Clear app data on the device

### Server Configuration Not Saving

**Problem**: Configuration doesn't persist

**Solutions**:
1. Check app permissions in Android settings
2. Verify Capacitor Preferences plugin is installed:
   ```bash
   npm list @capacitor/preferences
   ```
3. Reinstall the app

## Production Deployment

### Signing the APK

For production release, you need to sign your APK:

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore my-release-key.keystore \
     -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Create `android/key.properties`:
   ```properties
   storePassword=your_store_password
   keyPassword=your_key_password
   keyAlias=my-key-alias
   storeFile=my-release-key.keystore
   ```

3. Update `android/app/build.gradle`:
   ```gradle
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file('key.properties')
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }

   android {
       ...
       signingConfigs {
           release {
               keyAlias keystoreProperties['keyAlias']
               keyPassword keystoreProperties['keyPassword']
               storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
               storePassword keystoreProperties['storePassword']
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

4. Build the release APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

**IMPORTANT**: Never commit `key.properties` or your keystore file to git!

### Publishing to Google Play Store

1. Create a Google Play Developer account
2. Build a signed release APK (or AAB):
   ```bash
   ./gradlew bundleRelease
   ```
3. Go to https://play.google.com/console
4. Create a new app
5. Upload your APK/AAB
6. Fill in store listing details
7. Submit for review

## Additional Resources

- **Capacitor Documentation**: https://capacitorjs.com/docs
- **Android Developer Guide**: https://developer.android.com/guide
- **Angular Documentation**: https://angular.dev
- **OpenCode Documentation**: https://github.com/opencode-ai

## FAQ

### Q: Can I use this app without a local OpenCode server?

A: No, you need a running OpenCode server. The app is a client that connects to your server.

### Q: Does the app work over the internet?

A: Yes, if your OpenCode server is accessible via a public URL (with proper security measures).

### Q: Can I connect to multiple servers?

A: Currently, the app stores one server URL at a time. You can change it anytime via the configuration screen.

### Q: Is the app available on Google Play Store?

A: Not yet. You need to build and install it yourself. Consider publishing it if you'd like!

### Q: What Android versions are supported?

A: Android 6.0 (API level 23) and higher. Recommended: Android 8.0+ for best experience.

## Contributing

Contributions are welcome! If you'd like to improve the Android app:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on Android
5. Submit a pull request

## License

This project follows the same license as the main OpenCode project.
