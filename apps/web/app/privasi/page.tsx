import { Bullets, DocPage, Para, SubHead } from "@/components/doc-page";

export const metadata = { title: "Kebijakan Privasi · Hoobiq" };

export default function PrivasiPage() {
  return (
    <DocPage
      eyebrow="Kebijakan Privasi"
      title="Data kamu, kendali kamu."
      lead="Kami memperlakukan data pribadi kamu seperti barang koleksi langka — disimpan rapi, dikeluarkan hanya saat perlu, dan tidak pernah diperdagangkan. Kebijakan ini mengikuti UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)."
      updated="24 April 2026"
      sections={[
        {
          id: "data",
          heading: "1. Data yang kami kumpulkan",
          body: (
            <>
              <SubHead>Saat kamu mendaftar</SubHead>
              <Bullets
                items={[
                  "Username, email, password terenkripsi (bcrypt).",
                  "Nama lengkap (opsional sampai kamu perlu verifikasi seller).",
                  "Nomor telepon (untuk notifikasi transaksi dan verifikasi dua faktor).",
                ]}
              />
              <SubHead>Saat kamu bertransaksi</SubHead>
              <Bullets
                items={[
                  "Alamat pengiriman — dikirim ke mitra logistik kami untuk pencetakan label.",
                  "Nomor rekening tujuan payout (seller) — disimpan terenkripsi dan hanya ditampilkan sebagian (misal: BCA *6789).",
                  "Untuk verifikasi seller transaksi > Rp 2 juta: foto KTP + selfie. Disimpan terenkripsi; penghapusan otomatis 30 hari setelah verifikasi ulang.",
                ]}
              />
              <SubHead>Data teknis</SubHead>
              <Para>
                IP address, user agent, device identifier (untuk deteksi fraud), dan log
                aktivitas transaksi. Kami tidak memasang tracker iklan pihak ketiga di
                platform.
              </Para>
            </>
          ),
        },
        {
          id: "pemakaian",
          heading: "2. Cara kami memakainya",
          body: (
            <>
              <Bullets
                items={[
                  "Menjalankan transaksi — mencocokkan pembeli, seller, escrow, dan kurir.",
                  "Mencegah penipuan — deteksi anomali login, chargeback, multi-akun.",
                  "Personalisasi feed & rekomendasi listing (berbasis kategori yang kamu pilih, bukan perilaku scrolling).",
                  "Mengirim notifikasi transaksional (email + push). Notifikasi marketing hanya dengan opt-in eksplisit di Pengaturan.",
                  "Analitik agregat untuk perbaikan produk (tidak dikaitkan ke profil individu).",
                ]}
              />
              <SubHead>Yang tidak kami lakukan</SubHead>
              <Bullets
                items={[
                  "Menjual atau menyewakan data pribadi kamu ke pihak ketiga.",
                  "Memakai chat DM kamu untuk melatih model AI.",
                  "Memasang pixel tracker Meta/Google di halaman transaksi dan DM.",
                ]}
              />
            </>
          ),
        },
        {
          id: "mitra",
          heading: "3. Pihak ketiga yang terlibat",
          body: (
            <>
              <Para>
                Kami hanya membagi data yang benar-benar diperlukan, dan ke mitra yang
                punya standar keamanan setara atau lebih tinggi dari kami.
              </Para>
              <Bullets
                items={[
                  <><b className="text-fg">Midtrans</b> (payment gateway) — menerima data pembayaran dan rekening tujuan payout. <a className="text-brand-400" href="https://midtrans.com/id/privacy" target="_blank" rel="noreferrer">Kebijakan Midtrans ↗</a></>,
                  <><b className="text-fg">Komerce / JNE / J&amp;T / SiCepat / GoSend</b> — menerima alamat pengiriman dan nama penerima untuk label resi.</>,
                  <><b className="text-fg">Cloudflare R2</b> — penyimpanan foto listing & post (tidak menyimpan data identitas).</>,
                  <><b className="text-fg">Resend + Novu</b> — pengiriman email & notifikasi transaksional.</>,
                  <><b className="text-fg">Sentry</b> — error monitoring (scrubbed PII — tidak menyimpan email atau alamat).</>,
                ]}
              />
            </>
          ),
        },
        {
          id: "penyimpanan",
          heading: "4. Penyimpanan & keamanan",
          body: (
            <>
              <Para>
                Data disimpan di server yang berada di wilayah Indonesia, sesuai
                pembatasan data lintas negara di UU PDP. Password di-hash dengan bcrypt
                (cost factor ≥ 12). Data KTP dan nomor rekening disimpan terenkripsi
                memakai AES-256.
              </Para>
              <Para>
                Akses ke database produksi dibatasi hanya untuk tim infrastruktur dan
                dicatat dalam audit log. Tim produk dan customer support tidak bisa melihat
                password, KTP, atau nomor rekening.
              </Para>
              <SubHead>Retensi</SubHead>
              <Bullets
                items={[
                  "Data transaksi: disimpan 5 tahun (untuk kewajiban akuntansi & perpajakan).",
                  "Data KTP verifikasi: dihapus 30 hari setelah kamu minta verifikasi ulang.",
                  "Log teknis: 90 hari, lalu dianonimkan.",
                  "Akun yang ditutup: data profil dihapus setelah 30 hari (kecuali yang perlu untuk kewajiban hukum).",
                ]}
              />
            </>
          ),
        },
        {
          id: "hak",
          heading: "5. Hak kamu sebagai subjek data",
          body: (
            <>
              <Para>
                Sesuai Pasal 5–13 UU PDP, kamu berhak:
              </Para>
              <Bullets
                items={[
                  "Mengakses data pribadi kamu yang kami simpan (Pengaturan, lalu Unduh data).",
                  "Memperbaiki data yang tidak akurat.",
                  "Meminta penghapusan data (hak untuk dilupakan) — kecuali yang diwajibkan disimpan oleh hukum.",
                  "Menarik persetujuan pemrosesan data (dengan konsekuensi akun ditutup).",
                  "Mengajukan keberatan terhadap pemrosesan otomatis (misal: rekomendasi feed).",
                  "Mengajukan keluhan ke Kementerian Komunikasi dan Informatika atau Lembaga Pelindungan Data Pribadi kalau merasa hak kamu dilanggar.",
                ]}
              />
              <Para>
                Permintaan dapat dikirim ke{" "}
                <a className="text-brand-400" href="mailto:privacy@hoobiq.com">
                  privacy@hoobiq.com
                </a>
                . Kami akan merespons dalam maksimal 3×24 jam dan menyelesaikan permintaan
                dalam 30 hari kalender.
              </Para>
            </>
          ),
        },
        {
          id: "cookies",
          heading: "6. Cookies & teknologi serupa",
          body: (
            <>
              <Para>
                Kami menggunakan cookies minimal untuk fungsi inti:
              </Para>
              <Bullets
                items={[
                  <><code>hoobiq_session</code> — httpOnly cookie untuk sesi login. Kadaluarsa 30 hari.</>,
                  <><code>kolektora-theme</code> — menyimpan preferensi dark/light mode. Kadaluarsa 1 tahun.</>,
                  <><code>csrf</code> — token pencegah CSRF attack. Kadaluarsa mengikuti sesi.</>,
                ]}
              />
              <Para>
                Kami tidak memasang cookies pihak ketiga untuk iklan atau cross-site
                tracking.
              </Para>
            </>
          ),
        },
        {
          id: "anak",
          heading: "7. Anak di bawah umur",
          body: (
            <Para>
              Hoobiq tidak ditujukan untuk anak di bawah 13 tahun. Kalau kamu tahu ada akun
              yang dibuat oleh anak di bawah umur, kabari kami di{" "}
              <a className="text-brand-400" href="mailto:privacy@hoobiq.com">
                privacy@hoobiq.com
              </a>{" "}
              dan akan kami tindaklanjuti dalam 24 jam.
            </Para>
          ),
        },
        {
          id: "perubahan",
          heading: "8. Perubahan kebijakan",
          body: (
            <Para>
              Kebijakan ini bisa berubah seiring evolusi produk atau regulasi. Perubahan
              material akan diumumkan via email dan banner in-app minimal 14 hari sebelum
              berlaku. Versi lama selalu bisa diakses di{" "}
              <a className="text-brand-400" href="/privasi/riwayat">
                halaman arsip
              </a>
              .
            </Para>
          ),
        },
      ]}
    />
  );
}
