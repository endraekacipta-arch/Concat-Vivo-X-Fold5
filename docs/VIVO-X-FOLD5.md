# Concat: tata letak untuk Vivo X Fold 5

**Status:** APK lokal belum berhasil dibuat. Kompilasi Rust dihentikan oleh
batas memori 8 GB, termasuk setelah mengurangi optimasi dan membatasi job.
Belum ada APK siap instal. Workflow khusus GitHub Actions tersedia di
`.github/workflows/vivo-apk.yml`; workflow sudah lolos actionlint, tetapi belum
dijalankan. Build tersebut membutuhkan runner dengan memori lebih besar.

Modifikasi berbasis commit `f0c0169` dari jub0t/Concat. Ini perubahan pada
aplikasi Android utama (`concat-android`), bukan prototipe `android-native`.

## Perilaku

- Layar luar/ruang sempit: preview, kontrol pemutaran, timeline, dan alat
  tersusun vertikal. Alat dibuka sebagai panel bawah yang bisa digeser tutup.
- Lebar minimal 600 dan tinggi minimal 520 piksel logis: alat muncul di sebelah
  kanan preview. Timeline tetap bisa dipakai. Preview kembali melebar setelah
  panel ditutup.
- Lebar minimal 720 dan tinggi di bawah 520 piksel logis: preview di kiri,
  timeline di kanan, alat di bawah. Panel alat terbuka di atas area timeline;
  tutup dengan tombol centang atau Back untuk kembali memakai timeline.
- Orientasi Android mengikuti sistem; penguncian potret dilepas.
- Editor dan panel tidak dibuat ulang oleh perubahan tata letak. Panel aktif,
  pilihan media dan playhead dipertahankan saat ukuran berubah.
- Area aman status bar, navigasi dan cutout tetap memakai inset sistem yang
  sudah disediakan aplikasi.

Ukuran logis mengikuti kepadatan dan pengaturan tampilan Android, bukan resolusi
fisik panel. Tidak perlu memilih model HP. Split screen memakai ukuran ruang
aplikasi yang tersisa. Tidak ada deteksi sudut engsel atau mode laptop khusus.

## Pemeriksaan yang sudah dijalankan

Seluruh `app.slint` berhasil dikompilasi dengan Slint 1.18.1. Pemeriksaan runtime
menjalankan shell asli di layar virtual pada 12 ukuran, termasuk batas breakpoint,
320×320, 412×880, 744×820, 820×744, dan 880×412. Ukuran tersebut contoh jendela
logis, bukan pengukuran langsung Vivo. Pemeriksaan juga membuka Media lewat
sentuhan toolbar, mempertahankan panel/pilihan/playhead saat resize, memastikan
preview di samping panel tetap menerima sentuhan, dan menutup panel lewat centang.

Untuk mengulang tanpa membangun mesin video, pasang `slint-ui@1.18.1` di direktori
terpisah, arahkan `NODE_PATH` ke `node_modules` tersebut, lalu jalankan:

```sh
node scripts/ci/check-foldable-ui.cjs
```

Butuh display; Linux CI dapat menjalankannya melalui `xvfb-run -a`.

## Membuat APK

Source perlu dibangun menjadi APK ARM64. Pengujian render/ekspor video dan
perpindahan layar di Vivo asli tetap diperlukan; pemeriksaan layar virtual
tidak menggantikan pengujian perangkat.

Workflow yang sudah tersedia, `.github/workflows/mobile.yml` (**Build for phones**),
membangun APK ARM64 yang sesuai untuk Vivo. Setelah source dimasukkan ke repositori
GitHub milik sendiri, workflow bisa dijalankan melalui **Actions → Build for phones
→ Run workflow** pada branch berisi modifikasi. Gunakan artefak Android ARM64 dari
run yang berhasil. Workflow itu juga membangun iOS dan emulator; tidak diubah oleh
modifikasi ini. Build pertama dapat memakan waktu lama.

Sebelum dipakai untuk proyek penting, uji membuka proyek, memilih klip, membuka
panel, lipat–buka berulang, rotasi kedua layar, split screen, keyboard saat menulis
judul, serta ekspor video di HP. Kelanjutan aplikasi pada layar luar saat dilipat
juga mengikuti pengaturan sistem Vivo. APK bertanda tangan berbeda mungkin tidak
bisa memperbarui versi resmi yang sudah dipasang; cadangkan proyek terlebih dahulu.

## Konfigurasi build lokal

Build lokal menggunakan Rust 1.93.1, Android SDK/build-tools 35, NDK
28.2.13676358 (r28c), Java 21, FFmpeg 8.1, dan sherpa-onnx 1.13.7.

Karena batas memori build 8 GB, konfigurasi Cargo lokal menambahkan pengaturan
yang sama dengan paket antarmuka pada profil `quick` proyek, tetapi tetap pada
profil release untuk mesin video dan dependensi lain:

```toml
[profile.release.package.concat]
opt-level = 0
codegen-units = 256
```

Binding FFmpeg diarahkan ke resource header Clang 19 dari NDK, selain sysroot.
Untuk menghindari unduhan CDN ONNX yang menolak akses, build memakai library
ONNX Runtime 1.27.1 yang sudah dibundel sherpa-onnx. Versi ini mendukung API 27
yang dipakai `ort`, sekaligus menyediakan versi simbol yang dibutuhkan sherpa.
Tidak ada penggantian versi API atau penghapusan fitur AI. Setelah environment
`scripts/mobile-env.sh` diterapkan, tambahan konfigurasi build adalah:

```sh
export BINDGEN_EXTRA_CLANG_ARGS_aarch64_linux_android="$BINDGEN_EXTRA_CLANG_ARGS_aarch64_linux_android -resource-dir=$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/lib/clang/19"
export ORT_LIB_LOCATION="$SHERPA_ONNX_LIB_DIR"
export ORT_PREFER_DYNAMIC_LINK=1
cargo apk build --release -p concat-android --target aarch64-linux-android
```

Kunci penandatanganan APK lokal berbeda dari rilis resmi.

Build Android kini menyingkirkan instance workspace dan title bar desktop
sebelum Slint menghasilkan Rust. Antarmuka khusus Android ini juga sudah
dijalankan di layar virtual: panel Media bertahan saat ukuran 412×880 berubah
ke 744×820, preview tetap bisa disentuh, dan centang maupun panel bawah bisa
ditutup dengan benar. Pengujian ini tidak mencakup APK atau mesin video.

Percobaan lokal memakai `CARGO_BUILD_JOBS=1` dan pengaturan antarmuka di atas
masih terkena batas memori. Workflow **Build Vivo X Fold 5 APK** memakai profil
release asli, dua job, runtime yang sama, dan pemeriksaan tanda tangan serta
16 KB sebelum mengunggah artefak APK dan checksum. Source tidak memuat kunci
penandatanganan atau kredensial GitHub.
