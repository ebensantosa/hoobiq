import Link from "next/link";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";

export const metadata = { title: "Pusat Bantuan · Hoobiq" };

type FAQ = { q: string; a: React.ReactNode };
type Section = { id: string; title: string; blurb: string; faqs: FAQ[] };

const sections: Section[] = [
  {
    id: "akun",
    title: "Akun & Keamanan",
    blurb: "Pengelolaan akun, verifikasi, dan perlindungan data pengguna.",
    faqs: [
      {
        q: "Bagaimana cara membuat akun di Hoobiq?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Buka aplikasi atau website Hoobiq</li>
            <li>Pilih daftar / sign up</li>
            <li>Isi data yang diperlukan</li>
            <li>Lengkapi profil dan minat</li>
            <li>Setelah itu, kamu bisa langsung mulai menggunakan Hoobiq.</li>
          </ul>
        ),
      },
      {
        q: "Bagaimana jika saya lupa password?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Pilih opsi "lupa password" di halaman login</li>
            <li>Ikuti instruksi untuk reset password</li>
            <li>Gunakan password baru untuk masuk kembali</li>
          </ul>
        ),
      },
      {
        q: "Apakah saya perlu verifikasi akun?",
        a: (
          <>
            Untuk menggunakan fitur tertentu, kamu mungkin diminta melakukan
            verifikasi.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Verifikasi dapat berupa nomor telepon atau identitas (KTP)</li>
              <li>Verifikasi membantu meningkatkan keamanan dan kepercayaan dalam transaksi</li>
            </ul>
          </>
        ),
      },
      {
        q: "Apakah saya boleh memiliki lebih dari satu akun?",
        a: (
          <>
            Pengguna dapat memiliki lebih dari satu akun, namun:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Setiap pengguna hanya diperbolehkan memiliki 1 akun yang terverifikasi identitas</li>
              <li>Penggunaan beberapa akun tidak boleh untuk tujuan penyalahgunaan sistem</li>
            </ul>
            <p className="mt-2">
              Hoobiq berhak meninjau dan mengambil tindakan terhadap akun yang
              melanggar ketentuan.
            </p>
          </>
        ),
      },
      {
        q: "Bagaimana cara menjaga keamanan akun?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Gunakan password yang kuat dan tidak dibagikan ke orang lain</li>
            <li>Jangan membagikan kode verifikasi kepada siapa pun</li>
            <li>Hindari login di perangkat yang tidak aman</li>
          </ul>
        ),
      },
      {
        q: "Apa yang harus dilakukan jika akun saya bermasalah?",
        a: (
          <>
            Jika kamu mengalami kendala seperti akun tidak bisa diakses atau
            aktivitas mencurigakan:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Segera ubah password akun</li>
              <li>
                Hubungi tim Hoobiq melalui{" "}
                <a className="text-brand-400" href="mailto:hello.hoobiq@gmail.com">
                  hello.hoobiq@gmail.com
                </a>
              </li>
              <li>Sertakan informasi yang diperlukan untuk proses verifikasi</li>
            </ul>
          </>
        ),
      },
      {
        q: "Apakah data pribadi saya aman?",
        a: (
          <>
            Hoobiq berkomitmen menjaga keamanan data pengguna.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Data disimpan dan diproses dengan standar keamanan yang wajar</li>
              <li>Akses data dibatasi hanya untuk kebutuhan layanan</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: "jual",
    title: "Menjual",
    blurb: "Cara memasang listing, mengelola pesanan, dan menerima pembayaran.",
    faqs: [
      {
        q: "Bagaimana cara memasang listing?",
        a: (
          <>
            Untuk mulai menjual di Hoobiq:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Buka menu jual / tambah produk</li>
              <li>Upload foto produk (disarankan foto asli dan jelas)</li>
              <li>Isi nama produk, deskripsi, harga, berat, kondisi, dan stok</li>
              <li>Pilih kategori yang sesuai</li>
              <li>Tentukan apakah produk ready stock atau pre-order</li>
              <li>Publish listing</li>
            </ul>
            <p className="mt-2">
              Produk kamu akan langsung tampil di marketplace setelah dipublikasikan.
            </p>
          </>
        ),
      },
      {
        q: "Apakah ada potongan dari hasil penjualan?",
        a: (
          <>
            Ya. Hoobiq mengenakan biaya layanan sebesar <b>5% dari nilai transaksi</b>{" "}
            kepada penjual.
            <p className="mt-2">
              Biaya ini digunakan untuk mendukung operasional platform, termasuk
              penyediaan sistem transaksi yang aman (escrow), pengembangan fitur,
              serta membantu mempertemukan penjual dengan lebih banyak pembeli.
            </p>
            <p className="mt-2">
              Potongan akan langsung diperhitungkan secara otomatis sebelum dana
              diterima oleh penjual.
            </p>
          </>
        ),
      },
      {
        q: "Apa itu Boost dan perlu digunakan?",
        a: (
          <>
            Boost adalah fitur berbayar yang membantu meningkatkan visibilitas
            produk kamu di Hoobiq.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Produk yang di-boost akan lebih sering muncul di pencarian atau feed</li>
              <li>Membantu menjangkau lebih banyak pembeli dalam waktu lebih cepat</li>
              <li>Cocok digunakan untuk produk yang ingin cepat terjual atau meningkatkan exposure</li>
            </ul>
            <p className="mt-2">
              Biaya boost bervariasi tergantung pilihan paket atau durasi yang
              dipilih, dan akan ditampilkan sebelum kamu mengaktifkannya.
            </p>
            <p className="mt-2">
              Penggunaan boost bersifat opsional dan tidak mempengaruhi proses
              transaksi atau keamanan penjualan.
            </p>
          </>
        ),
      },
      {
        q: "Kapan dana dari penjualan masuk ke saya?",
        a: (
          <>
            Hoobiq menggunakan sistem escrow untuk menjaga keamanan transaksi.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Dana akan ditahan sementara setelah pembeli melakukan pembayaran</li>
              <li>Dana akan diteruskan setelah pembeli mengonfirmasi pesanan diterima</li>
              <li>Jika tidak ada konfirmasi, dana otomatis diteruskan dalam 3 hari setelah barang sampai</li>
            </ul>
          </>
        ),
      },
      {
        q: "Apa yang harus dilakukan setelah ada pesanan masuk?",
        a: (
          <>
            Jika kamu menerima pesanan:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Segera siapkan dan kemas barang dengan aman</li>
              <li>Kirim barang melalui kurir yang dipilih pembeli</li>
              <li>Input nomor resi di sistem</li>
            </ul>
            <p className="mt-2">
              Pesanan akan berubah menjadi status "dikirim (SHIPPED)" setelah resi
              diinput.
            </p>
          </>
        ),
      },
      {
        q: "Berapa lama waktu untuk mengirim barang?",
        a: (
          <>
            <ul className="list-disc space-y-1 pl-5">
              <li>Untuk produk ready stock: maksimal 7×24 jam setelah pembayaran dikonfirmasi</li>
              <li>Untuk produk pre-order: mengikuti estimasi waktu yang kamu tentukan di listing</li>
            </ul>
            <p className="mt-2">
              Pastikan estimasi yang diberikan realistis untuk menghindari pembatalan.
            </p>
          </>
        ),
      },
      {
        q: "Apa itu produk pre-order (PO)?",
        a: (
          <>
            Pre-order adalah produk yang tidak langsung tersedia dan membutuhkan
            waktu sebelum dikirim.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Penjual menentukan estimasi pengiriman (2–30 hari)</li>
              <li>Terdapat tambahan waktu maksimal untuk proses pengiriman</li>
              <li>Pembeli tidak dapat membatalkan pesanan sebelum melewati estimasi tersebut</li>
            </ul>
          </>
        ),
      },
      {
        q: "Apa saja yang tidak boleh dijual di Hoobiq?",
        a: (
          <>
            Beberapa contoh barang yang dilarang:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Barang bajakan atau tidak original tanpa keterangan jelas</li>
              <li>Barang ilegal atau melanggar hukum</li>
              <li>Barang hasil curian atau sengketa</li>
              <li>Klaim autentikasi palsu</li>
            </ul>
            <p className="mt-2">
              Listing yang melanggar dapat dihapus dan akun dapat dikenakan sanksi.
            </p>
          </>
        ),
      },
      {
        q: "Bagaimana jika pembeli ingin membatalkan pesanan?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Pembeli hanya dapat mengajukan pembatalan sebelum barang dikirim</li>
            <li>Kamu dapat menyetujui atau menolak permintaan tersebut</li>
            <li>Jika tidak merespons dalam 24 jam, pesanan akan otomatis dibatalkan</li>
          </ul>
        ),
      },
      {
        q: "Bagaimana jika terjadi retur atau dispute?",
        a: (
          <>
            Jika ada masalah:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Diskusikan terlebih dahulu dengan pembeli melalui chat</li>
              <li>Jika tidak ada kesepakatan, kasus dapat diajukan ke sistem dispute</li>
              <li>Hoobiq akan meninjau dan memberikan keputusan akhir</li>
            </ul>
          </>
        ),
      },
      {
        q: "Apakah saya bertanggung jawab atas kerusakan saat pengiriman?",
        a: (
          <>
            Ya, jika kerusakan disebabkan oleh pengemasan yang tidak memadai.
            <p className="mt-2">Pastikan:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Barang dikemas dengan aman sesuai jenis produk</li>
              <li>Menggunakan pelindung tambahan untuk barang fragile</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: "beli",
    title: "Membeli",
    blurb: "Cara memilih produk, melakukan pembayaran, dan menerima pesanan.",
    faqs: [
      {
        q: "Bagaimana cara membeli barang di Hoobiq?",
        a: (
          <>
            Untuk membeli produk di Hoobiq:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Pilih produk yang kamu inginkan</li>
              <li>(Opsional) Hubungi penjual melalui chat untuk bertanya</li>
              <li>Klik beli / checkout</li>
              <li>Isi alamat pengiriman (jika belum ada)</li>
              <li>Pilih metode pengiriman dan lihat ongkir</li>
              <li>Lakukan pembayaran</li>
            </ul>
            <p className="mt-2">
              Setelah pembayaran berhasil, pesanan akan diproses oleh penjual.
            </p>
          </>
        ),
      },
      {
        q: "Metode pembayaran apa saja yang tersedia?",
        a: (
          <>
            Hoobiq menyediakan berbagai metode pembayaran melalui sistem payment
            gateway.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Metode pembayaran akan ditampilkan saat checkout: BCA VA, Mandiri
                VA, BNI VA, BRI VA, GoPay, OVO, ShopeePay, DANA, LinkAja, QRIS, dan
                kartu kredit Visa/Mastercard/JCB. Semua diproses melalui Midtrans.
              </li>
              <li>Pilih metode yang paling sesuai sebelum menyelesaikan pembayaran</li>
            </ul>
          </>
        ),
      },
      {
        q: "Apakah pembayaran di Hoobiq aman?",
        a: (
          <>
            Ya. Hoobiq menggunakan sistem escrow untuk melindungi transaksi.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Dana akan ditahan sementara setelah pembayaran</li>
              <li>Dana tidak langsung diterima penjual</li>
              <li>Dana hanya akan diteruskan setelah pesanan diterima</li>
            </ul>
          </>
        ),
      },
      {
        q: "Apakah ada biaya layanan di Hoobiq?",
        a: (
          <>
            Hoobiq mengenakan biaya layanan sebesar <b>1% dari nilai transaksi</b>{" "}
            kepada pembeli.
            <p className="mt-2">
              Biaya ini digunakan untuk mendukung operasional platform, termasuk
              pengembangan fitur, sistem keamanan, dan layanan pengguna. Biaya
              layanan akan ditampilkan secara transparan saat proses checkout.
            </p>
          </>
        ),
      },
      {
        q: "Bagaimana cara melacak pesanan saya?",
        a: (
          <>
            Setelah penjual mengirim barang:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Penjual akan menginput nomor resi</li>
              <li>Kamu dapat melihat status pengiriman di halaman pesanan</li>
              <li>Gunakan nomor resi untuk melacak paket melalui kurir</li>
            </ul>
          </>
        ),
      },
      {
        q: "Kapan saya harus mengonfirmasi pesanan diterima?",
        a: (
          <>
            Setelah barang sampai:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Periksa kondisi barang terlebih dahulu</li>
              <li>Jika sudah sesuai, klik "pesanan diterima"</li>
            </ul>
            <p className="mt-2">
              Jika tidak dikonfirmasi, sistem akan otomatis menyelesaikan pesanan
              dalam 3 hari setelah status pengiriman selesai.
            </p>
          </>
        ),
      },
      {
        q: "Bagaimana jika barang tidak dikirim oleh penjual?",
        a: (
          <>
            Jika penjual tidak mengirim barang:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Sistem akan membatalkan pesanan secara otomatis setelah batas waktu tertentu</li>
              <li>Dana akan dikembalikan kepada kamu</li>
            </ul>
            <p className="mt-2">
              Kamu juga dapat mengajukan pembatalan selama pesanan belum berstatus
              dikirim.
            </p>
          </>
        ),
      },
      {
        q: "Bagaimana jika barang rusak atau tidak sesuai?",
        a: (
          <>
            Jika barang yang diterima tidak sesuai atau rusak:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Dokumentasikan kondisi barang (foto/video, disarankan saat unboxing)</li>
              <li>Hubungi penjual melalui chat</li>
              <li>Jika tidak ada kesepakatan, ajukan dispute melalui sistem</li>
            </ul>
          </>
        ),
      },
      {
        q: "Bagaimana cara mengajukan pembatalan pesanan?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Pembatalan hanya dapat diajukan sebelum barang dikirim</li>
            <li>Penjual dapat menyetujui atau menolak pembatalan</li>
            <li>Jika penjual tidak merespons dalam 24 jam, pesanan akan otomatis dibatalkan</li>
          </ul>
        ),
      },
      {
        q: "Bagaimana sistem pre-order (PO)?",
        a: (
          <>
            Produk pre-order memiliki waktu pengiriman yang lebih lama dibanding
            ready stock.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Estimasi pengiriman ditentukan oleh penjual</li>
              <li>Selama masih dalam estimasi, pesanan tidak dapat dibatalkan</li>
              <li>Pembatalan dapat diajukan setelah melewati estimasi waktu</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: "pengiriman",
    title: "Pengiriman",
    blurb: "Informasi tentang proses pengiriman, kurir, dan pelacakan pesanan.",
    faqs: [
      {
        q: "Kurir apa saja yang tersedia di Hoobiq?",
        a: (
          <>
            Hoobiq menyediakan berbagai pilihan kurir yang dapat dipilih saat
            checkout.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Pilihan kurir akan muncul berdasarkan layanan yang tersedia</li>
              <li>Ongkir akan dihitung otomatis sesuai alamat dan berat barang</li>
            </ul>
          </>
        ),
      },
      {
        q: "Bagaimana cara cek ongkir?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Ongkir akan otomatis dihitung saat kamu mengisi alamat pengiriman</li>
            <li>Biaya pengiriman tergantung lokasi, berat barang, dan kurir yang dipilih</li>
          </ul>
        ),
      },
      {
        q: "Berapa lama waktu pengiriman?",
        a: (
          <>
            Waktu pengiriman terdiri dari dua bagian:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Waktu proses dari penjual (maksimal 7×24 jam untuk ready stock)</li>
              <li>Waktu pengiriman oleh kurir</li>
            </ul>
            <p className="mt-2">
              Untuk produk pre-order, waktu pengiriman mengikuti estimasi yang
              ditentukan penjual.
            </p>
          </>
        ),
      },
      {
        q: "Bagaimana cara melacak pesanan?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Setelah barang dikirim, penjual akan menginput nomor resi</li>
            <li>Kamu dapat melihat status pengiriman di halaman pesanan</li>
            <li>Gunakan nomor resi untuk melacak paket melalui kurir</li>
          </ul>
        ),
      },
      {
        q: "Apa yang harus dilakukan jika barang belum dikirim?",
        a: (
          <>
            Jika pesanan belum dikirim:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Kamu dapat menghubungi penjual melalui chat</li>
              <li>Kamu dapat mengajukan pembatalan selama status belum "dikirim (SHIPPED)"</li>
              <li>Sistem akan membatalkan pesanan secara otomatis jika melebihi batas waktu pengiriman yaitu 7 × 24 jam sejak pesanan diterima</li>
            </ul>
          </>
        ),
      },
      {
        q: "Apa yang harus dilakukan jika barang belum sampai?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Cek status pengiriman menggunakan nomor resi</li>
            <li>Hubungi pihak kurir untuk informasi lebih lanjut</li>
            <li>Jika terjadi kendala, kamu dapat menghubungi penjual</li>
          </ul>
        ),
      },
      {
        q: "Bagaimana jika barang rusak saat pengiriman?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Dokumentasikan kondisi paket dan barang (disarankan saat unboxing)</li>
            <li>Hubungi penjual melalui chat</li>
            <li>Ajukan retur atau dispute jika diperlukan</li>
          </ul>
        ),
      },
      {
        q: "Apakah pengiriman diasuransikan?",
        a: (
          <>
            Untuk transaksi tertentu, kamu dapat menggunakan asuransi pengiriman
            yang disediakan oleh kurir.
            <p className="mt-2">Tanpa asuransi:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Penanganan kehilangan atau kerusakan mengikuti kebijakan pihak kurir</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: "dispute",
    title: "Dispute & Refund",
    blurb: "Cara menyelesaikan masalah transaksi, retur, dan pengembalian dana.",
    faqs: [
      {
        q: "Kapan saya bisa mengajukan dispute?",
        a: (
          <>
            Kamu dapat mengajukan dispute jika:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Barang tidak sesuai dengan deskripsi</li>
              <li>Barang rusak saat diterima</li>
              <li>Barang tidak lengkap atau berbeda dari pesanan</li>
            </ul>
            <p className="mt-2">
              Dispute sebaiknya diajukan setelah barang diterima dan sebelum pesanan
              diselesaikan.
            </p>
          </>
        ),
      },
      {
        q: "Bagaimana cara mengajukan dispute?",
        a: (
          <>
            <ul className="list-disc space-y-1 pl-5">
              <li>Buka halaman pesanan terkait</li>
              <li>Pilih opsi ajukan dispute</li>
              <li>Sertakan bukti berupa foto atau video</li>
              <li>Jelaskan masalah yang terjadi</li>
            </ul>
            <p className="mt-2">
              Setelah itu, kamu dapat berdiskusi dengan penjual melalui chat.
            </p>
          </>
        ),
      },
      {
        q: "Apa yang terjadi setelah dispute diajukan?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Pembeli dan penjual dapat berdiskusi untuk mencapai kesepakatan</li>
            <li>Jika tidak ada kesepakatan, kasus akan ditinjau oleh Hoobiq</li>
            <li>Dana akan tetap ditahan selama proses berlangsung</li>
          </ul>
        ),
      },
      {
        q: "Bukti apa yang perlu disiapkan?",
        a: (
          <>
            Untuk mempercepat proses:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Foto atau video kondisi barang</li>
              <li>Video unboxing (sangat disarankan)</li>
              <li>Bukti komunikasi dengan penjual (jika ada)</li>
            </ul>
            <p className="mt-2">Semakin lengkap bukti, semakin cepat proses penyelesaian.</p>
          </>
        ),
      },
      {
        q: "Apa saja kemungkinan hasil dari dispute?",
        a: (
          <>
            Berdasarkan hasil peninjauan:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Barang dikembalikan ke penjual dan dana dikembalikan ke pembeli</li>
              <li>Barang tidak perlu dikembalikan dan dana dikembalikan ke pembeli</li>
              <li>Dana tetap diteruskan ke penjual</li>
            </ul>
            <p className="mt-2">Keputusan Hoobiq bersifat final.</p>
          </>
        ),
      },
      {
        q: "Bagaimana cara mengajukan retur (pengembalian barang)?",
        a: (
          <>
            Jika disepakati untuk retur:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Ajukan retur melalui sistem</li>
              <li>Tunggu persetujuan dari penjual</li>
            </ul>
            <p className="mt-2">Setelah disetujui:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Kirim barang kembali maksimal 5 hari</li>
              <li>Input nomor resi pengembalian</li>
              <li>Penjual akan mengonfirmasi setelah barang diterima</li>
            </ul>
            <p className="mt-2">
              Jika penjual tidak merespons dalam 48 jam, retur dapat dilanjutkan
              secara otomatis.
            </p>
          </>
        ),
      },
      {
        q: "Kapan dana refund dikembalikan?",
        a: (
          <>
            Refund akan diproses setelah:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Retur selesai dan dikonfirmasi</li>
              <li>Atau keputusan dispute menyatakan refund dilakukan</li>
            </ul>
            <p className="mt-2">
              Dana akan dikembalikan melalui metode pembayaran atau saldo sesuai
              kebijakan yang berlaku.
            </p>
          </>
        ),
      },
      {
        q: "Apakah saya bisa membatalkan retur?",
        a: (
          <>
            Ya, selama proses retur belum selesai dan kedua pihak sepakat, retur
            dapat dibatalkan dan transaksi dilanjutkan.
          </>
        ),
      },
    ],
  },
  {
    id: "reputasi",
    title: "Reputasi, Level, Badge & Membership",
    blurb: "Sistem level, EXP, badge, dan keuntungan yang bisa kamu dapatkan di Hoobiq.",
    faqs: [
      {
        q: "Apa itu sistem level di Hoobiq?",
        a: (
          <>
            Hoobiq memiliki sistem level yang mencerminkan aktivitas dan reputasi
            pengguna di platform.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Level akan meningkat seiring bertambahnya EXP (experience)</li>
              <li>Semakin tinggi level, semakin banyak benefit yang bisa kamu dapatkan</li>
              <li>Level juga membantu meningkatkan kepercayaan antar pengguna</li>
            </ul>
          </>
        ),
      },
      {
        q: "Bagaimana cara mendapatkan EXP?",
        a: (
          <>
            EXP (experience) diperoleh dari aktivitas di Hoobiq, seperti:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Melakukan transaksi (membeli atau menjual)</li>
              <li>Menyelesaikan pesanan dengan baik</li>
              <li>Memberikan rating dan review</li>
              <li>Aktivitas lain yang berkontribusi pada ekosistem platform</li>
            </ul>
            <p className="mt-2">
              Semakin aktif kamu menggunakan Hoobiq, semakin cepat EXP kamu
              bertambah.
            </p>
          </>
        ),
      },
      {
        q: "Apa itu badge dan fungsinya?",
        a: (
          <>
            Badge adalah penanda pencapaian yang diberikan berdasarkan aktivitas
            tertentu di Hoobiq.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Badge mencerminkan pengalaman dan kepercayaan pengguna</li>
              <li>Dapat diperoleh dari milestone tertentu (misalnya jumlah transaksi)</li>
              <li>Ditampilkan di profil untuk meningkatkan kredibilitas</li>
            </ul>
            <p className="mt-2">
              Badge tidak mempengaruhi sistem transaksi secara langsung, tetapi
              dapat meningkatkan kepercayaan pengguna lain.
            </p>
          </>
        ),
      },
      {
        q: "Apakah level dan badge mempengaruhi penjualan?",
        a: (
          <>
            Secara langsung tidak, namun:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Level dan badge dapat meningkatkan kepercayaan pembeli</li>
              <li>Profil dengan reputasi baik cenderung lebih dipilih</li>
              <li>Membantu membangun kredibilitas di marketplace</li>
            </ul>
          </>
        ),
      },
      {
        q: "Apa itu membership di Hoobiq?",
        a: (
          <>
            Hoobiq menyediakan sistem membership untuk memberikan keuntungan
            tambahan kepada pengguna. Terdapat dua jenis:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Basic (default)</li>
              <li>Premium (berbayar)</li>
            </ul>
          </>
        ),
      },
      {
        q: "Apa perbedaan Basic dan Premium?",
        a: (
          <>
            Pengguna Premium mendapatkan benefit tambahan dibanding Basic, seperti:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Keuntungan eksklusif dalam penggunaan fitur</li>
              <li>Potensi peningkatan visibilitas</li>
              <li>Akses ke fitur atau benefit tertentu</li>
            </ul>
            <p className="mt-2">
              Detail benefit dapat berkembang seiring dengan pengembangan platform.
            </p>
          </>
        ),
      },
      {
        q: "Apakah membership Premium wajib?",
        a: (
          <>
            Tidak.
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Semua pengguna dapat menggunakan Hoobiq tanpa Premium</li>
              <li>Premium bersifat opsional untuk mendapatkan keuntungan tambahan</li>
            </ul>
          </>
        ),
      },
      {
        q: "Bagaimana cara upgrade ke Premium?",
        a: (
          <>
            <ul className="list-disc space-y-1 pl-5">
              <li>Buka halaman membership di Hoobiq</li>
              <li>Pilih paket Premium yang tersedia</li>
              <li>Lakukan pembayaran sesuai metode yang disediakan</li>
            </ul>
            <p className="mt-2">
              Setelah pembayaran berhasil, benefit Premium akan langsung aktif.
            </p>
          </>
        ),
      },
      {
        q: "Apakah EXP, level, atau badge bisa hilang?",
        a: (
          <>
            <ul className="list-disc space-y-1 pl-5">
              <li>EXP dan level bersifat progresif dan tidak berkurang</li>
              <li>Badge tetap tersimpan selama akun aktif</li>
            </ul>
            <p className="mt-2">
              Namun, dalam kondisi tertentu (seperti pelanggaran), Hoobiq dapat
              mengambil tindakan terhadap akun.
            </p>
          </>
        ),
      },
      {
        q: "Apakah sistem ini mempengaruhi keamanan transaksi?",
        a: (
          <>
            Tidak secara langsung. Keamanan transaksi tetap dijaga melalui sistem
            escrow. Namun, sistem reputasi membantu pengguna dalam menilai
            kepercayaan satu sama lain.
          </>
        ),
      },
    ],
  },
  {
    id: "pembayaran",
    title: "Pembayaran & Dana",
    blurb: "Informasi tentang pembayaran, saldo, dan pencairan dana di Hoobiq.",
    faqs: [
      {
        q: "Bagaimana cara melakukan pembayaran?",
        a: (
          <>
            <ul className="list-disc space-y-1 pl-5">
              <li>Pilih produk dan lanjut ke checkout</li>
              <li>Pilih metode pembayaran yang tersedia</li>
              <li>Selesaikan pembayaran sesuai instruksi</li>
            </ul>
            <p className="mt-2">
              Setelah pembayaran berhasil, status pesanan akan berubah menjadi{" "}
              <b>PAID</b> dan penjual akan mulai memproses pesanan.
            </p>
          </>
        ),
      },
      {
        q: "Kapan dana diteruskan ke penjual?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Setelah pembeli mengonfirmasi pesanan diterima</li>
            <li>Jika tidak dikonfirmasi, otomatis dalam 3 hari setelah barang sampai</li>
          </ul>
        ),
      },
      {
        q: "Bagaimana jika pembayaran gagal?",
        a: (
          <>
            Jika pembayaran tidak berhasil:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Pastikan metode pembayaran yang dipilih benar</li>
              <li>Coba ulangi proses pembayaran</li>
              <li>Gunakan metode pembayaran lain jika diperlukan</li>
            </ul>
            <p className="mt-2">Jika masalah berlanjut, hubungi tim Hoobiq.</p>
          </>
        ),
      },
      {
        q: "Bagaimana jika saya sudah bayar tapi status belum berubah?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Tunggu beberapa saat hingga sistem memperbarui status</li>
            <li>Periksa kembali riwayat pembayaran</li>
            <li>Jika belum berubah, hubungi tim Hoobiq dengan bukti pembayaran</li>
          </ul>
        ),
      },
      {
        q: "Bagaimana cara menarik saldo (withdraw)?",
        a: (
          <>
            <ul className="list-disc space-y-1 pl-5">
              <li>Masuk ke halaman saldo / wallet</li>
              <li>Pilih opsi tarik dana</li>
              <li>Masukkan rekening tujuan</li>
              <li>Konfirmasi penarikan</li>
            </ul>
            <p className="mt-2">Dana akan diproses sesuai waktu yang ditentukan.</p>
          </>
        ),
      },
      {
        q: "Berapa lama proses penarikan dana?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Proses penarikan biasanya membutuhkan waktu tertentu sesuai sistem</li>
            <li>Waktu dapat berbeda tergantung metode dan kondisi sistem</li>
          </ul>
        ),
      },
      {
        q: "Apakah ada biaya penarikan dana?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Biaya penarikan (jika ada) akan ditampilkan sebelum konfirmasi</li>
            <li>Besaran biaya dapat berbeda tergantung metode yang digunakan</li>
          </ul>
        ),
      },
      {
        q: "Bagaimana jika terjadi refund?",
        a: (
          <ul className="list-disc space-y-1 pl-5">
            <li>Dana akan dikembalikan setelah pembatalan atau dispute disetujui</li>
            <li>Refund dapat masuk ke metode pembayaran atau saldo pengguna</li>
          </ul>
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
              <a className="text-brand-400" href="mailto:hello.hoobiq@gmail.com">
                hello.hoobiq@gmail.com
              </a>
              .
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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
            <h2 className="text-2xl font-bold text-fg">Masih belum menemukan jawaban?</h2>
            <p className="mt-2 text-fg-muted">
              Tim kami siap membantu. Hubungi kami melalui email di bawah, dan kami
              akan merespons secepat mungkin. Untuk kasus mendesak (seperti
              penipuan, akun bermasalah, atau kendala transaksi), kamu bisa
              menuliskan <b>"URGENT"</b> di subject email.
            </p>
            <div className="mt-6">
              <a
                href="mailto:hello.hoobiq@gmail.com"
                className="inline-flex flex-col gap-1 rounded-xl border border-rule bg-canvas px-5 py-4 transition-colors hover:border-brand-400/50"
              >
                <span className="text-xs uppercase tracking-wider text-fg-subtle">Bantuan Hoobiq</span>
                <span className="text-base font-semibold text-brand-400">hello.hoobiq@gmail.com</span>
              </a>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-fg-subtle">
            <Link href="/ketentuan" className="text-brand-400 hover:underline">Ketentuan Layanan</Link>
            {" · "}
            <Link href="/privasi" className="text-brand-400 hover:underline">Kebijakan Privasi</Link>
          </p>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
