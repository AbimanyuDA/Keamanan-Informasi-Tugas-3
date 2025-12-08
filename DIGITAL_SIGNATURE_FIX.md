# Dokumentasi Perbaikan Digital Signature PDF

## Masalah yang Diperbaiki

Sebelumnya, PDF yang di-sign tidak memiliki **actual digital signature** melainkan hanya visual signature (text + barcode). Ketika dibuka di text editor atau dicek dengan tools, tidak ada signature objects/structures yang terdeteksi.

## Solusi yang Diterapkan

### 1. **pdf-signpdf.ts** - Perbaikan Signing Engine
**Perubahan:**
- Ditambahkan logging yang lebih detail untuk debugging
- Enhanced error handling pada placeholder addition
- Deteksi dan normalisasi PDF yang problematic secara otomatis
- Menambahkan metadata signing yang lebih lengkap (locationName, contactInfo, name)

**Keuntungan:**
- Menggunakan `node-signpdf` dengan `plainAddPlaceholder` untuk membuat PKCS#7 signature yang valid
- Signature placeholder ditambahkan SEBELUM signing
- Menghasilkan PDF dengan struktur signature yang recognized oleh Adobe Reader

**Alur:**
```
PDF Input 
  → Normalize (jika perlu)
  → Add Placeholder (signature field)
  → Sign with PKCS#12 (digital signature cryptographic)
  → Signed PDF Output
```

### 2. **app/api/pdf/sign/route.ts** - Perbaikan Handler
**Perubahan:**
- Hapus penggunaan `signPDF` dari pdf-signer.ts (yang hanya visual)
- Always gunakan `signPdfWithNodeSignpdf` untuk actual digital signature
- Lebih baik handling conversion dari stored keys (PEM) ke PKCS#12
- Cleaner code flow dan error handling

**Flow:**
1. **Dengan P12 File:** Langsung sign dengan P12 yang disediakan user
2. **Dengan Stored Keys:** Convert PEM ke PKCS#12 format, lalu sign

**Kode penting:**
```typescript
// Convert PEM keys to PKCS#12
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
  privateKeyObj,
  [certificateObj],
  ""
);
const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
const p12Buffer = Buffer.from(p12Der, "binary");

// Sign dengan node-signpdf
const signedPdf = await signPdfWithNodeSignpdf(pdfBuffer, p12Buffer, "");
```

### 3. **lib/pdf-verify-signature.ts** - Perbaikan Verifikasi
**Perubahan:**
- Enhanced regex patterns untuk detect PKCS#7 signature structures
- Ditambah check untuk `/Filter` yang menunjukkan signing method
- Better distinction antara visual signature vs digital signature
- Clearer messages dengan emoji indicators

**Signature Detection Hierarchy:**
1. ✓ **Valid Digital Signature** - ByteRange + Contents + Filter/SigDict = PKCS#7 proper signature
2. ✓ **Digital Signature Detected** - Strong indicators dari PKCS#7 structure
3. ✓ **Signature Elements Found** - Moderate indicators, likely valid signature
4. ⚠ **Signature Elements (Visual Only)** - Weak indicators, might be just visual
5. ✗ **No Signature Found** - No signature elements detected

## Apa itu PKCS#7 Digital Signature?

PKCS#7 adalah standard format untuk cryptographic signatures. Dalam PDF:
- **ByteRange**: Menunjukkan byte-range dari PDF yang di-sign
- **Contents**: Berisi actual encrypted signature (hex)
- **Filter**: Adobe.PPKLite atau adbe.pkcs7.detached (signing method)

Ketika dibuka di Adobe Reader, signature ini akan:
- ✓ Terdeteksi sebagai valid digital signature
- ✓ Show signer information (certificate details)
- ✓ Prevent editing tanpa invalidate signature
- ✓ Dapat diverify dengan certificate chain

## Testing & Verifikasi

### Test di Adobe Reader
1. Generate PDF
2. Sign dengan system
3. Download signed PDF
4. Buka di Adobe Reader
5. Cek "Signatures" panel → Akan tampil signature info

### Test di Command Line (Linux/Mac)
```bash
# Check PDF structure
strings signed.pdf | grep -i sig

# atau dengan pdfinfo
pdfinfo signed.pdf

# atau dengan qpdf
qpdf --check signed.pdf
```

### Test di Windows PowerShell
```powershell
# View binary content
Get-Content signed.pdf -Encoding Byte | Select-Object -First 200

# Search for signature indicators
Select-String -Path signed.pdf -Pattern "Sig" -ErrorAction SilentlyContinue
```

### Ciri-ciri PDF Signed dengan Benar
- Ketika dibuka di notepad/text editor, akan ada struktur object:
  ```
  /Type /Sig
  /Filter /adbe.pkcs7.detached
  /ByteRange [...]
  /Contents <...hex...>
  ```

- File size bertambah (karena ada signature object)
- Tidak bisa di-edit di Adobe Reader (read-only setelah signed)

## Dependency yang Digunakan

1. **node-signpdf** (v3.0.0)
   - Actual signing engine
   - Supports PKCS#7 format
   - Compatible with Adobe Reader

2. **node-forge** (v1.3.1)
   - Key/Certificate parsing
   - PKCS#12 conversion
   - ASN.1 encoding

3. **pdf-lib** (v1.17.1)
   - PDF manipulation
   - Page copying/normalization

## Troubleshooting

### "Cannot add signature placeholder"
**Penyebab:** PDF memiliki struktur yang tidak compatible
**Solusi:** Sistem otomatis melakukan normalization menggunakan pdf-lib

### "Failed to convert to PKCS#12"
**Penyebab:** Private key atau certificate format invalid
**Solusi:** Pastikan keys di-generate dengan benar (RSA 2048 bit)

### Signed PDF masih bisa di-edit di Adobe
**Penyebab:** P12 passphrase mungkin salah atau permission setting
**Solusi:** Pastikan signing berhasil (check server logs)

## File yang Dimodifikasi

1. ✅ `lib/pdf-signpdf.ts` - Enhanced signing dengan better error handling
2. ✅ `app/api/pdf/sign/route.ts` - Cleaner flow, always use node-signpdf
3. ✅ `lib/pdf-verify-signature.ts` - Better signature detection

## File yang TIDAK Diubah (dan Alasannya)

- `lib/pdf-signer.ts` - Masih ada tapi tidak digunakan untuk signing (hanya untuk reference)
- Aman untuk tetap ada karena tidak mempengaruhi signing flow

## Kesimpulan

Sistem sekarang menghasilkan **proper cryptographic digital signatures** yang:
- ✓ Recognized oleh Adobe Reader dan PDF readers lainnya
- ✓ Memiliki valid PKCS#7 structure
- ✓ Dapat diverify dengan certificate
- ✓ Prevent document tampering (integrity)
- ✓ Prove authenticity (non-repudiation)

Bukan lagi hanya "visual signature" tetapi **actual digital signature** sesuai standar PDF specification.
