import { Bullets, DocPage, Para, SubHead } from "@/components/doc-page";

export const metadata = { title: "Ketentuan Layanan · Hoobiq" };

export default function KetentuanPage() {
  return (
    <DocPage
      eyebrow="Ketentuan Layanan"
      title="Aturan main di Hoobiq."
      lead="Dengan mendaftar atau menggunakan Hoobiq, kamu menyetujui ketentuan berikut. Kami berusaha menulisnya sejelas mungkin — hubungi halo@hoobiq.com kalau ada yang kurang jelas."
      updated="24 April 2026"
      sections={[
        {
          id: "akun",
          heading: "1. Akun & keanggotaan",
          body: (
            <>
              <Para>
                Hoobiq terbuka untuk Warga Negara Indonesia berusia minimal 17 tahun atau
                sudah menikah (sesuai KUHPerdata). Pengguna di bawah 17 tahun harus mendapat
                persetujuan tertulis dari orang tua/wali untuk melakukan transaksi.
              </Para>
              <SubHead>Satu orang, satu akun</SubHead>
              <Para>
                Satu individu hanya boleh memiliki satu akun aktif. Akun ganda yang dibuat
                untuk memanipulasi rating, review, atau escrow akan dinonaktifkan permanen
                tanpa pemberitahuan dan saldo tertahan akan ditinjau kasus-per-kasus.
              </Para>
              <SubHead>Verifikasi seller</SubHead>
              <Para>
                Untuk transaksi di atas Rp 2.000.000, seller wajib melakukan verifikasi
                identitas (KTP + selfie). Data ini tidak ditampilkan publik dan disimpan
                terenkripsi sesuai Kebijakan Privasi.
              </Para>
            </>
          ),
        },
        {
          id: "listing",
          heading: "2. Aturan listing",
          body: (
            <>
              <Para>
                Setiap listing yang kamu publish dianggap sebagai penawaran yang mengikat.
                Foto dan deskripsi harus menggambarkan kondisi barang secara jujur.
              </Para>
              <SubHead>Yang tidak boleh dijual</SubHead>
              <Bullets
                items={[
                  "Barang bajakan, bootleg, atau reproduksi yang tidak dilabel jelas sebagai replika.",
                  "Barang hasil curian, penggelapan, atau yang sedang dalam status sengketa hukum.",
                  "Senjata, narkotika, satwa dilindungi, atau barang terlarang lain menurut hukum Indonesia.",
                  "Akun digital, karakter game, atau aset virtual yang berasal dari platform yang melarangnya di Syarat mereka.",
                  "Barang dengan klaim autentikasi palsu (misalnya mengaku ada grading PSA tanpa slab resmi).",
                ]}
              />
              <SubHead>Deskripsi kondisi</SubHead>
              <Para>
                Kamu wajib memilih salah satu dari lima tingkat kondisi: <b>Mint</b>,{" "}
                <b>Near Mint</b>, <b>Excellent</b>, <b>Good</b>, <b>Fair</b>. Definisi tiap
                tingkat mengikuti standar yang ditetapkan admin kategori dan bisa dilihat
                di halaman kategori masing-masing.
              </Para>
            </>
          ),
        },
        {
          id: "transaksi",
          heading: "3. Transaksi & Hoobiq Pay",
          body: (
            <>
              <SubHead>Pembayaran wajib via Hoobiq Pay</SubHead>
              <Para>
                Semua transaksi di atas Rp 100.000 wajib melalui Hoobiq Pay. Pembayaran pembeli
                diamankan oleh mitra pembayaran kami (Midtrans) sampai salah satu terjadi:
                (a) pembeli konfirmasi barang diterima, atau (b) 7 hari setelah status{" "}
                <code>delivered</code> dari kurir — mana yang lebih dulu.
              </Para>
              <SubHead>Biaya layanan</SubHead>
              <Bullets
                items={[
                  "Biaya platform: 2% dari nilai transaksi, dibayar pembeli.",
                  "Biaya payment gateway: mengikuti tarif Midtrans (sekitar 1–2.5% tergantung metode).",
                  "Biaya boost listing: Rp 15.000 per 7 hari (opsional).",
                  "Tidak ada biaya pendaftaran, biaya posting listing, atau biaya bulanan.",
                ]}
              />
              <SubHead>Pembatalan</SubHead>
              <Para>
                Pembeli boleh membatalkan sebelum seller menandai barang sebagai{" "}
                <code>shipped</code>. Setelah itu, pembatalan hanya bisa lewat mekanisme
                dispute di bagian 5.
              </Para>
            </>
          ),
        },
        {
          id: "pengiriman",
          heading: "4. Pengiriman",
          body: (
            <>
              <Para>
                Pengiriman melalui mitra logistik kami (saat ini JNE, J&amp;T, SiCepat,
                GoSend, Komerce). Seller wajib mengirim dalam 2×24 jam hari kerja setelah
                pembayaran dikonfirmasi, kecuali disebutkan lain di listing.
              </Para>
              <SubHead>Packaging standar</SubHead>
              <Para>
                Untuk kartu dan grading slab wajib menggunakan top loader atau hard case
                dan bubble wrap. Untuk figure scale wajib menggunakan box asli + double box
                + fragile sticker. Seller yang mengabaikan standar ini dan barang rusak
                saat pengiriman menanggung 100% refund.
              </Para>
              <SubHead>Asuransi</SubHead>
              <Para>
                Untuk transaksi di atas Rp 1.000.000, kami sangat menyarankan pembeli
                mengaktifkan asuransi (tarif mitra: 0.3–0.5% dari nilai barang). Tanpa
                asuransi, tanggung jawab atas kerusakan dalam perjalanan mengikuti aturan
                kurir yang dipilih.
              </Para>
            </>
          ),
        },
        {
          id: "dispute",
          heading: "5. Dispute & refund",
          body: (
            <>
              <Para>
                Pembeli boleh mengajukan dispute setelah barang diterima jika tidak sesuai
                deskripsi. Selama dispute aktif, pembayaran tetap diamankan di Hoobiq Pay.
              </Para>
              <SubHead>Bukti yang dibutuhkan</SubHead>
              <Bullets
                items={[
                  "Foto unboxing video utuh (disarankan sejak membuka paket dari kurir).",
                  "Foto barang dari beberapa sudut memperlihatkan kerusakan atau ketidaksesuaian.",
                  "Log chat dengan seller (kalau ada kesepakatan khusus).",
                ]}
              />
              <SubHead>Keputusan admin</SubHead>
              <Para>
                Tim Trust &amp; Safety meninjau dispute dalam maksimal 5 hari kerja.
                Keputusan admin final untuk kasus di bawah Rp 5.000.000; kasus di atas
                itu bisa diteruskan ke arbitrase Badan Penyelesaian Sengketa Konsumen
                (BPSK) setempat.
              </Para>
            </>
          ),
        },
        {
          id: "konten",
          heading: "6. Konten komunitas",
          body: (
            <>
              <Para>
                Post yang kamu unggah ke feeds komunitas tetap menjadi milik kamu. Dengan
                mengunggah, kamu memberikan Hoobiq lisensi non-eksklusif untuk menampilkan,
                mencadangkan, dan mempromosikan konten tersebut di dalam platform.
              </Para>
              <SubHead>Konten yang dilarang</SubHead>
              <Bullets
                items={[
                  "Ujaran kebencian berdasarkan SARA, gender, orientasi seksual, atau disabilitas.",
                  "Doxing — menyebarkan data pribadi orang lain tanpa izin.",
                  "Konten eksplisit / NSFW (platform ini bukan tempatnya).",
                  "Spam promosi di luar marketplace, termasuk referral piramida.",
                ]}
              />
            </>
          ),
        },
        {
          id: "penghentian",
          heading: "7. Penghentian akun",
          body: (
            <>
              <Para>
                Kamu boleh menutup akun kapan saja melalui Pengaturan, lalu Tutup Akun.
                Transaksi yang belum selesai harus diselesaikan dulu, dan saldo aktif akan
                ditransfer ke rekening terverifikasi dalam 14 hari kerja.
              </Para>
              <Para>
                Hoobiq berhak menonaktifkan akun yang melanggar ketentuan. Dalam kasus
                berat (penipuan terkonfirmasi, pencucian uang, penjualan barang curian),
                akun dinonaktifkan permanen dan informasi relevan dilaporkan ke aparat
                penegak hukum.
              </Para>
            </>
          ),
        },
        {
          id: "hukum",
          heading: "8. Hukum yang berlaku",
          body: (
            <Para>
              Ketentuan ini tunduk pada hukum Republik Indonesia. Setiap sengketa yang
              timbul akan diselesaikan terlebih dahulu melalui musyawarah; apabila tidak
              tercapai kesepakatan, akan diselesaikan melalui Pengadilan Negeri Jakarta
              Selatan.
            </Para>
          ),
        },
      ]}
    />
  );
}
