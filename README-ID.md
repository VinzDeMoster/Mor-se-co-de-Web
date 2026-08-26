# KodeMorse — GitHub Pages + Firebase

## 1. Upload ke GitHub
Upload:
- index.html
- style.css
- script.js
- firebase-config.js

Aktifkan GitHub Pages dari repository tersebut.

## 2. Buat Firebase
1. Buka Firebase Console.
2. Buat project.
3. Tambahkan Web App.
4. Salin Firebase Web App config ke `firebase-config.js`.
5. Authentication → Sign-in method → aktifkan Google.
6. Authentication → Settings → Authorized domains → tambahkan domain GitHub Pages kamu.
7. Firestore Database → Create database.
8. Firestore → Rules → paste isi `firestore.rules`.

## 3. Membuat admin pertama
Setelah login Google, ambil UID akun dari Firebase Authentication.

Di Firestore buat collection:
`admins`

Lalu buat document dengan **Document ID = UID akun admin**.

Contoh:
admins
└── xxxxxxxxxxxxxxxxx
    └── role: "admin"

Tidak perlu field lain.

Jangan membuat aturan Firestore yang mengizinkan user biasa menulis ke collection `admins`.

## 4. Cara kerja histori
- User yang login menyimpan setiap konversi ke `history`.
- User hanya dapat membaca/menghapus histori miliknya.
- Admin dapat membaca/menghapus histori semua user.
- Data dibatasi 2000 karakter per input/output pada sisi client.
- Histori membutuhkan login Google.

## 5. Announcement
Admin dapat membuat dan menghapus announcement dari Admin Panel.
Semua pengunjung dapat membaca announcement.

## Catatan
File `firebase-config.js` berisi konfigurasi web Firebase, bukan password database. Keamanan utama berada pada Firestore Rules.
