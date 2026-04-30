import Link from "next/link";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";

export const metadata = { title: "Pusat Bantuan · Hoobiq" };

type FAQ = { q: string; a: React.ReactNode };
type Section = { id: string; title: string; blurb: string; faqs: FAQ[] };

const sections: Section[] = [
  {
    id: "akun",
    title: "Akun & profil",
    blurb: "Pertanyaan seputar daftar, login, verifikasi, dan pengaturan akun.",
    faqs: [
      {
        q: "Apakah daftar Hoobiq berbayar?",
        a: (
          <>
            Tidak. Pendaftaran, pemasangan listing, dan post komunitas gratis
            selamanya. Biaya hanya muncul saat transaksi terjadi (2% platform fee
            dari pembeli) atau saat kamu memilih fitur opsional seperti boost
            listing.
          </>
        ),
      },
      {
        q: "Saya lupa password, bagaimana?",
        a: (
          <>
            Di halaman login, klik "Lupa password?". Kami kirim tautan reset ke
            email kamu yang masa berlakunya 30 menit. Kalau email tidak masuk,
            cek folder spam atau kontak{" "}
            <a className="text-brand-400" href="mailto:bantuan@hoobiq.com">
              bantuan@hoobiq.com
            </a>
            .
          </>
        ),
      },
      {
        q: "Kapan saya perlu verifikasi seller?",
        a: (
          <>
            Verifikasi KTP + selfie diminta otomatis saat kamu pertama kali
            memasang listing di atas Rp 2.000.000, atau saat menerima payout
            kumulatif lebih dari Rp 10.000.000 dalam 30 hari. Proses verifikasi
            biasanya selesai dalam 1×24 jam.
          </>
        ),
      },
      {
        q: "Bisa punya dua akun?",
        a: (
          <>
            Tidak. Kami membatasi satu individu satu akun untuk menjaga integritas
            rating dan Trust Score. Akun ganda yang terdeteksi akan dinonaktifkan.
            Kalau kamu ingin memisahkan aktivitas jual dan beli, semua itu bisa
            dilakukan di satu akun.
          </>
        ),
      },
    ],
  },
  {
    id: "jual",
    title: "Menjual",
    blurb: "Cara memasang listing, boost, dan menerima pembayaran.",
    faqs: [
      {
        q: "Bagaimana cara memasang listing?",
        a: (
          <>
            Klik tombol "Post" di pojok kanan atas, pilih "Listing baru". Isi
            foto (maks 8, yang pertama jadi cover), pilih kategori sampai level
            sub-seri, atur harga dan kondisi, lalu publish. Listing muncul di
            marketplace dalam 2 menit setelah review otomatis.
          </>
        ),
      },
      {
        q: "Apa itu Boost dan perlu nggak?",
        a: (
          <>
            Boost menempatkan listing kamu di 4 slot teratas marketplace dan top
            feed kategori selama 7 hari dengan biaya Rp 15.000. Rata-rata view
            naik 6.2× dibanding listing non-boost. Boost tidak menjamin
            penjualan — listing dengan foto buruk tetap akan diabaikan meski
            di-boost.
          </>
        ),
      },
      {
        q: "Kapan dana saya cair ke rekening?",
        a: (
          <>
            Dana cair ke saldo Hoobiq Pay kamu 3 hari kerja setelah pembeli
            konfirmasi barang diterima (atau auto-release 7 hari setelah status
            <em> delivered</em> dari kurir). Dari saldo, kamu bisa withdraw ke
            rekening bank terverifikasi — tiba dalam 1×24 jam hari kerja.
          </>
        ),
      },
      {
        q: "Apa saja yang tidak boleh dijual?",
        a: (
          <>
            Barang bajakan, bootleg tanpa label jelas, barang curian, benda
            terlarang (narkotika, senjata, satwa dilindungi), dan akun digital
            yang dilarang di ToS platform asalnya. Daftar lengkap ada di{" "}
            <Link href="/ketentuan#listing" className="text-brand-400">
              Ketentuan Layanan bagian 2
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    id: "beli",
    title: "Membeli",
    blurb: "Keamanan transaksi, Hoobiq Pay, dan menyelesaikan pembelian.",
    faqs: [
      {
        q: "Kenapa harus bayar lewat Hoobiq Pay, nggak bisa transfer langsung?",
        a: (
          <>
            Hoobiq Pay melindungi pembayaran kamu sampai barang diterima
            dengan kondisi sesuai deskripsi. Transfer langsung ke seller tidak
            kami dukung dan kamu kehilangan semua perlindungan kalau terjadi
            masalah. Seller yang memaksa transfer langsung bisa dilaporkan ke{" "}
            <a className="text-brand-400" href="mailto:trust@hoobiq.com">
              trust@hoobiq.com
            </a>
            .
          </>
        ),
      },
      {
        q: "Metode pembayaran apa yang didukung?",
        a: (
          <>
            BCA VA, Mandiri VA, BNI VA, BRI VA, GoPay, OVO, ShopeePay, DANA,
            LinkAja, QRIS, dan kartu kredit Visa/Mastercard/JCB. Semua diproses
            melalui Midtrans.
          </>
        ),
      },
      {
        q: "Berapa lama waktu pengiriman?",
        a: (
          <>
            Bergantung kurir yang kamu pilih di checkout:
            JNE REG (2–3 hari), J&amp;T Express (1–2 hari), SiCepat (1–3 hari),
            GoSend Same Day (hari yang sama, khusus Jabodetabek). Seller wajib
            kirim dalam 2×24 jam hari kerja — kalau tidak, kamu bisa cancel dan
            dana kembali otomatis.
          </>
        ),
      },
      {
        q: "Bagaimana cara nego harga?",
        a: (
          <>
            Di halaman listing, klik "Pesan seller". Di thread Pesan akan muncul opsi
            "Kirim penawaran" — masukkan harga yang kamu ajukan. Seller bisa
            terima, counter, atau tolak. Penawaran yang diterima otomatis jadi
            link checkout aktif selama 24 jam.
          </>
        ),
      },
    ],
  },
  {
    id: "pengiriman",
    title: "Pengiriman",
    blurb: "Kurir, packaging, asuransi, dan tracking.",
    faqs: [
      {
        q: "Siapa yang bayar ongkir?",
        a: (
          <>
            Secara default ongkir ditanggung pembeli, dihitung otomatis saat
            checkout berdasarkan berat barang dan alamat. Beberapa seller
            menawarkan promo "ongkir ditanggung" untuk listing tertentu.
          </>
        ),
      },
      {
        q: "Barang saya rusak saat sampai, gimana?",
        a: (
          <>
            Jangan buka paket sebelum direkam. Rekam video unboxing utuh (dari
            memegang paket dari kurir sampai barang keluar), lalu buka dispute
            di halaman transaksi setelah status <em>delivered</em>.
            Dana tidak akan cair ke seller selama dispute aktif.
          </>
        ),
      },
      {
        q: "Bisa nggak pakai kurir lain selain yang tersedia?",
        a: (
          <>
            Belum. Integrasi kurir kami lewat Komerce, dan untuk sekarang cuma
            JNE/J&amp;T/SiCepat/GoSend yang resmi didukung. Pengiriman via kurir
            di luar itu tidak di-cover Hoobiq Pay.
          </>
        ),
      },
    ],
  },
  {
    id: "dispute",
    title: "Dispute & refund",
    blurb: "Kalau ada masalah di transaksi kamu.",
    faqs: [
      {
        q: "Barang tidak sesuai deskripsi, apa yang harus saya lakukan?",
        a: (
          <>
            Buka halaman transaksi, lalu klik "Ajukan dispute". Isi alasan, upload
            foto/video bukti, dan kirim. Seller dapat 48 jam untuk merespons.
            Kalau tidak ada respons, tim Trust &amp; Safety otomatis mereview
            kasus. Keputusan biasanya keluar dalam 5 hari kerja.
          </>
        ),
      },
      {
        q: "Berapa lama refund masuk ke rekening?",
        a: (
          <>
            Refund penuh ke sumber pembayaran memakan 3–14 hari kerja tergantung
            metode (VA paling cepat, kartu kredit paling lama). Refund ke saldo
            Hoobiq Pay instan.
          </>
        ),
      },
      {
        q: "Saya seller dan merasa dispute tidak adil — bisa banding?",
        a: (
          <>
            Bisa. Klik "Banding keputusan" di halaman dispute dalam 7 hari
            setelah keputusan final. Kasus akan ditinjau oleh admin senior yang
            berbeda. Untuk transaksi di atas Rp 5 juta, kamu juga bisa lanjut ke
            mediasi via BPSK.
          </>
        ),
      },
    ],
  },
  {
    id: "reputasi",
    title: "Reputasi, EXP & badge",
    blurb: "Cara kerja level, Trust Score, dan display case.",
    faqs: [
      {
        q: "Bagaimana EXP dihitung?",
        a: (
          <>
            +25 EXP per listing baru, +50 EXP per trade selesai dengan rating ≥
            4, +5 EXP per post feed, +10 EXP per kontribusi kategori yang
            disetujui admin. EXP tidak bisa dibeli dengan uang.
          </>
        ),
      },
      {
        q: "Apa itu Trust Score?",
        a: (
          <>
            Angka 0–5 yang merangkum rating, tingkat dispute, response time, dan
            usia akun. Trust Score yang di bawah 3.5 akan mendapat batasan
            otomatis (misal: listing di atas Rp 1 juta butuh verifikasi
            tambahan).
          </>
        ),
      },
      {
        q: "Apakah badge bisa hilang?",
        a: (
          <>
            Badge biasa permanen. Tapi badge "Trusted Seller" dan "Elite
            Collector" di-review ulang tiap 90 hari — kalau kriterianya sudah
            tidak terpenuhi (misal: rating turun di bawah 4.7), badge dilepas
            otomatis sampai kamu memenuhi lagi.
          </>
        ),
      },
    ],
  },
];

export default function BantuanPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-16">
        <section className="border-b border-rule">
          <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10 md:py-20">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-400">
              Pusat Bantuan
            </span>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-fg md:text-5xl">
              Pertanyaan umum, dijawab sekali.
            </h1>
            <p className="mt-4 max-w-xl text-base text-fg-muted md:text-lg">
              Cari di bawah, atau kontak tim bantuan di{" "}
              <a className="text-brand-400" href="mailto:bantuan@hoobiq.com">
                bantuan@hoobiq.com
              </a>
              . Rata-rata respon &lt; 6 jam di hari kerja.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="rounded-xl border border-rule bg-panel/60 px-4 py-3 text-sm text-fg transition-colors hover:border-brand-400/50 hover:bg-panel"
                >
                  {s.title}
                </a>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10">
          <div className="space-y-20">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-bold text-fg md:text-3xl">{s.title}</h2>
                  <p className="mt-2 text-sm text-fg-muted">{s.blurb}</p>
                </div>
                <div className="mt-8 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-panel/40">
                  {s.faqs.map((f, i) => (
                    <details
                      key={i}
                      className="group px-5 py-4 transition-colors hover:bg-panel/80 [&_summary]:cursor-pointer"
                    >
                      <summary className="flex items-start justify-between gap-4 list-none">
                        <span className="text-base font-medium text-fg">{f.q}</span>
                        <span className="mt-0.5 shrink-0 text-lg text-fg-subtle transition-transform group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <div className="mt-3 max-w-3xl text-sm leading-relaxed text-fg-muted">
                        {f.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-20 rounded-2xl border border-rule bg-panel p-8 md:p-12">
            <h2 className="text-2xl font-bold text-fg">Masih belum ketemu jawabannya?</h2>
            <p className="mt-2 text-fg-muted">
              Tim kami membaca setiap email. Untuk kasus mendesak (penipuan,
              akun di-hack, barang mahal rusak), tulis "URGENT" di subject.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <Contact label="Bantuan umum" email="bantuan@hoobiq.com" hint="Respons < 6 jam" />
              <Contact label="Penipuan / keamanan" email="trust@hoobiq.com" hint="Respons < 1 jam" />
              <Contact label="Privasi & data" email="privacy@hoobiq.com" hint="Respons < 24 jam" />
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}

function Contact({ label, email, hint }: { label: string; email: string; hint: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="flex flex-col gap-1 rounded-xl border border-rule bg-canvas px-4 py-3 transition-colors hover:border-brand-400/50"
    >
      <span className="text-xs uppercase tracking-wider text-fg-subtle">{label}</span>
      <span className="font-medium text-brand-400">{email}</span>
      <span className="text-xs text-fg-muted">{hint}</span>
    </a>
  );
}
