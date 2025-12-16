# Robotik Kol Uygulaması Kurulum ve APK Oluşturma Rehberi

Bu uygulama `react-native-bluetooth-classic` kütüphanesini kullandığı için standart "Expo Go" uygulaması ile **çalışmaz**. İçerisinde native (yerel) Bluetooth kodları olduğu için özel bir "Development Build" veya "APK" oluşturmanız gerekir.

## Ön Hazırlıklar

Bilgisayarınızda aşağıdaki araçların kurulu olduğundan emin olun (Android geliştirme için standart gereksinimler):
1.  **JDK 17** (Java Development Kit)
2.  **Android Studio** ve **Android SDK**
3.  **Android SDK Platform-Tools** (adb komutu için)

## Seçenek 1: Kablo ile Bağlayıp Direkt Çalıştırma (En Hızlı Yöntem)

Geliştirme yaparken en kolay yöntem budur.

1.  Telefonunuzda **Geliştirici Seçenekleri**ni açın ve **USB Hata Ayıklama (USB Debugging)** modunu aktif edin.
2.  Telefonu USB kablosu ile bilgisayara bağlayın.
3.  Terminali açın ve proje klasörüne gidin (`cd RoboticArmApp`).
4.  Şu komutu çalıştırın:
    ```powershell
    npx expo run:android
    ```
    *   Bu komut, uygulamayı derler ve telefonunuza otomatik olarak yükleyip açar.
    *   Telefonda izin istekleri çıkarsa hepsini kabul edin.

## Seçenek 2: Paylaşılabilir APK Dosyası Oluşturma (Bağımsız Kurulum İçin)

Eğer USB kablo olmadan, dosyayı WhatsApp/Telegram vb. üzerinden atıp kurmak istiyorsanız:

1.  Önce projenin Android klasörlerini oluşturun (Prebuild):
    ```powershell
    npx expo prebuild
    ```
    *   Sizden paket ismi isteyebilir (örn: `com.roboticarm.app`), Enter diyip geçebilirsiniz.

2.  Android klasörüne girip derlemeyi başlatın:
    ```powershell
    cd android
    ./gradlew assembleRelease
    ```
    *(Windows'ta `./gradlew` çalışmazsa `gradlew assembleRelease` veya `.\gradlew assembleRelease` deneyin)*

3.  İşlem bittiğinde APK dosyanız şurada oluşacaktır:
    `android/app/build/outputs/apk/release/app-release.apk`

4.  Bu dosyayı telefonunuza gönderip kurabilirsiniz.

## Uygulama Kullanımı

1.  **Bluetooth İzni:** Uygulamayı ilk açtığınızda Konum ve Bluetooth izinleri isteyecektir. "Uygulamayı kullanırken izin ver" seçeneğini seçin. Android 12 ve üzeri için "Yakındaki Cihazlar" izni şarttır.
2.  **Cihaz Eşleştirme:**
    *   Uygulamayı kullanmadan önce telefonunuzun kendi Bluetooth ayarlarından HC-05/HC-06 veya ESP32 cihazınızla eşleşin (Şifre genelde 1234 veya 0000'dır).
    *   Kulaklık ile test edecekseniz kulaklığınızla eşleşin.
3.  **Bağlanma:**
    *   Uygulamada **"Scan for Devices"** butonuna basın.
    *   Listeden cihazınızı seçin.
4.  **Kontrol:**
    *   **Harfler:** A, B, C... butonlarına sırayla basın. İki harf seçilince (örn: A ve B -> "AB") komut otomatik gönderilir.
    *   **TEMP:** Sıcaklığı sorgular.
    *   **FAN ON/OFF:** Fanı manuel açar kapatır.
