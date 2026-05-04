import { Bullets, DocPage, Para, SubHead } from "@/components/doc-page";

export const metadata = { title: "Ketentuan Layanan · Hoobiq" };

export default function KetentuanPage() {
  return (
    <DocPage
      eyebrow="Ketentuan Layanan"
      title="Aturan main di Hoobiq."
      lead="Dengan mendaftar dan menggunakan Hoobiq, kamu dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan yang berlaku. Kami berusaha menyusun dengan sejelas dan sesederhana mungkin agar mudah dipahami. Jika ada hal yang masih kurang jelas, kamu bisa hubungi kami di hello.hoobiq@gmail.com — kami akan dengan senang hati membantu."
      updated="2 Mei 2026"
      sections={[
        {
          id: "akun",
          heading: "1. Akun & keanggotaan",
          body: (
            <>
              <Para>
                Hoobiq terbuka untuk Warga Negara Indonesia yang berusia minimal
                17 tahun atau telah menikah (sesuai ketentuan hukum yang berlaku).
                Pengguna di bawah 17 tahun wajib mendapatkan persetujuan dari
                orang tua atau wali untuk menggunakan layanan dan melakukan
                transaksi.
              </Para>

              <SubHead>Kepemilikan akun</SubHead>
              <Para>
                Setiap pengguna bertanggung jawab penuh atas keamanan dan
                aktivitas akun masing-masing, termasuk menjaga kerahasiaan kata
                sandi dan data login.
              </Para>
              <Para>
                Untuk menjaga keamanan dan kepercayaan dalam transaksi, setiap
                pengguna hanya diperbolehkan memiliki <b>1 (satu) akun terverifikasi
                identitas (KTP)</b>.
              </Para>
              <Para>Kami melarang penggunaan akun untuk:</Para>
              <Bullets
                items={[
                  "Manipulasi rating atau ulasan",
                  "Penyalahgunaan sistem transaksi atau escrow",
                  "Aktivitas penipuan atau tindakan yang merugikan pengguna lain",
                ]}
              />
              <Para>
                Hoobiq berhak melakukan pembatasan, penangguhan, atau penonaktifan
                akun yang terindikasi melakukan pelanggaran, termasuk meninjau
                saldo yang tertahan sesuai kebijakan yang berlaku.
              </Para>

              <SubHead>Keakuratan data</SubHead>
              <Para>
                Pengguna wajib memberikan informasi yang benar, akurat, dan terbaru
                saat mendaftar maupun menggunakan layanan Hoobiq. Hoobiq berhak
                melakukan verifikasi data dan membatasi akses akun apabila
                ditemukan ketidaksesuaian atau indikasi penyalahgunaan.
              </Para>

              <SubHead>Verifikasi seller</SubHead>
              <Para>
                Untuk menjaga keamanan transaksi, Hoobiq dapat meminta seller
                untuk melakukan verifikasi identitas (misalnya KTP dan selfie),
                terutama untuk transaksi dengan nilai tertentu. Data verifikasi
                tidak ditampilkan secara publik dan akan disimpan secara aman
                sesuai dengan Kebijakan Privasi yang berlaku.
              </Para>

              <SubHead>Status akun & pembatasan</SubHead>
              <Para>Hoobiq berhak untuk:</Para>
              <Bullets
                items={[
                  "Menangguhkan atau menonaktifkan akun",
                  "Membatasi fitur tertentu",
                  "Menahan atau meninjau dana dalam sistem",
                ]}
              />
              <Para>
                Apabila ditemukan aktivitas yang melanggar ketentuan, mencurigakan,
                atau berpotensi merugikan pihak lain maupun platform.
              </Para>
            </>
          ),
        },
        {
          id: "listing",
          heading: "2. Aturan penjual & listing produk",
          body: (
            <>
              <Para>
                Setiap produk yang dipublikasikan di Hoobiq dianggap sebagai
                penawaran yang sah dan mengikat. Penjual bertanggung jawab untuk
                memastikan seluruh informasi yang ditampilkan akurat, jujur, dan
                tidak menyesatkan.
              </Para>

              <SubHead>Kewajiban penjual</SubHead>
              <Para>Penjual wajib:</Para>
              <Bullets
                items={[
                  "Mengisi informasi produk secara lengkap dan jelas (foto, deskripsi, harga, kondisi, dan detail lainnya)",
                  "Menampilkan foto asli atau representatif dari produk yang dijual",
                  "Menjelaskan kondisi barang secara jujur, termasuk cacat atau kekurangan jika ada",
                  "Mencantumkan status produk (ready stock atau pre-order) secara jelas",
                  "Menentukan berat dan kategori produk dengan tepat",
                ]}
              />

              <SubHead>Produk yang dilarang</SubHead>
              <Para>Penjual dilarang memperjualbelikan:</Para>
              <Bullets
                items={[
                  "Barang bajakan, bootleg, atau reproduksi tanpa keterangan yang jelas sebagai replika",
                  "Barang hasil curian, penggelapan, atau yang sedang dalam sengketa hukum",
                  "Barang yang melanggar hukum Indonesia (termasuk senjata, narkotika, dan satwa dilindungi)",
                  "Akun digital, karakter game, atau aset virtual yang melanggar ketentuan platform asalnya",
                  "Barang dengan klaim autentikasi palsu atau menyesatkan",
                ]}
              />
              <Para>
                Hoobiq berhak menghapus listing dan/atau menonaktifkan akun
                apabila ditemukan pelanggaran.
              </Para>

              <SubHead>Standar kondisi produk</SubHead>
              <Para>
                Penjual wajib memilih dan menyesuaikan kondisi produk dengan
                standar berikut:
              </Para>
              <Bullets
                items={[
                  "Brand New (Sealed)",
                  "Like New",
                  "Excellent",
                  "Good",
                  "Fair",
                  "Poor",
                ]}
              />
              <Para>
                Definisi masing-masing kondisi mengikuti standar yang ditetapkan
                oleh Hoobiq dan dapat berbeda pada setiap kategori. Penjual
                bertanggung jawab atas kesesuaian kondisi yang dipilih dengan
                kondisi nyata produk.
              </Para>

              <SubHead>Produk Pre-order (PO)</SubHead>
              <Para>
                Penjual dapat menawarkan produk dengan sistem pre-order dengan
                ketentuan sebagai berikut:
              </Para>

              <SubHead>Estimasi pengiriman</SubHead>
              <Bullets
                items={[
                  "Penjual wajib menentukan estimasi waktu pengiriman, minimal 2 hari dan maksimal 30 hari",
                  "Estimasi ini merupakan waktu dasar yang dipilih oleh penjual",
                ]}
              />

              <SubHead>Kompensasi waktu pengiriman</SubHead>
              <Bullets
                items={[
                  "Untuk produk pre-order, penjual diberikan tambahan waktu maksimal 30 hari dari estimasi awal",
                  "Contoh: estimasi 15 hari → total waktu pengiriman maksimal menjadi 45 hari",
                  "Apabila melebihi batas tersebut, penjual dapat mengajukan perpanjangan tambahan maksimal 30 hari dengan memberikan alasan yang jelas dan dapat dipertanggungjawabkan",
                ]}
              />

              <SubHead>Pembatalan pesanan pre-order</SubHead>
              <Bullets
                items={[
                  <><b>Pembeli tidak dapat mengajukan pembatalan</b> selama masih berada dalam estimasi waktu yang ditentukan penjual</>,
                  <>Pembeli dapat mengajukan pembatalan <b>setelah melewati estimasi waktu pengiriman (H+1)</b></>,
                ]}
              />
              <Para>Ketentuan pembatalan setelah melewati estimasi:</Para>
              <Bullets
                items={[
                  "Jika penjual menyetujui → pesanan dibatalkan",
                  "Jika penjual tidak merespons dalam 24 jam → pesanan otomatis dibatalkan",
                ]}
              />
              <Para>
                Dalam kondisi ini, pembatalan bersifat lebih fleksibel dan dapat
                disepakati antara penjual dan pembeli melalui komunikasi langsung.
                Pembeli juga dapat membatalkan permintaan pembatalan yang telah
                diajukan apabila kedua belah pihak sepakat untuk melanjutkan
                transaksi.
              </Para>

              <SubHead>Pelanggaran & tindakan</SubHead>
              <Para>Hoobiq berhak untuk:</Para>
              <Bullets
                items={[
                  "Menghapus listing yang tidak sesuai ketentuan",
                  "Membatasi visibilitas produk",
                  "Menangguhkan atau menonaktifkan akun penjual",
                  "Menahan atau meninjau dana dalam sistem",
                ]}
              />
              <Para>
                Apabila ditemukan aktivitas yang melanggar atau berpotensi
                merugikan pengguna lain maupun platform.
              </Para>
            </>
          ),
        },
        {
          id: "transaksi",
          heading: "3. Proses transaksi & sistem pembayaran",
          body: (
            <>
              <SubHead>Sistem pembayaran & escrow</SubHead>
              <Para>
                Setiap transaksi di Hoobiq menggunakan sistem pembayaran aman
                (escrow), di mana dana dari pembeli akan ditahan sementara oleh
                Hoobiq hingga pesanan diterima sesuai ketentuan.
              </Para>
              <Para>Dana akan diteruskan kepada penjual apabila:</Para>
              <Bullets
                items={[
                  "Pembeli telah mengonfirmasi bahwa pesanan telah diterima, atau",
                  "Tidak ada konfirmasi dalam waktu 3 (tiga) hari setelah status pengiriman dinyatakan selesai",
                ]}
              />

              <SubHead>Proses pembelian</SubHead>
              <Para>Pembeli dapat melakukan transaksi melalui tahapan berikut:</Para>
              <Bullets
                items={[
                  "Memilih produk dan melakukan checkout",
                  "Mengisi alamat pengiriman dan memilih metode pengiriman",
                  "Melakukan pembayaran",
                  "Menunggu penjual memproses dan mengirimkan pesanan",
                  "Melakukan konfirmasi penerimaan barang",
                ]}
              />

              <SubHead>Kewajiban penjual</SubHead>
              <Para>Penjual wajib:</Para>
              <Bullets
                items={[
                  "Mengirimkan barang sesuai deskripsi dan kondisi yang tertera",
                  "Memproses pesanan dan menginput nomor resi pengiriman",
                  "Menjaga komunikasi yang baik dengan pembeli",
                ]}
              />
              <Para>
                Hoobiq berhak membatalkan transaksi secara otomatis apabila
                penjual tidak mengirimkan pesanan dalam waktu 7 (tujuh) hari sejak
                pembayaran diterima.
              </Para>

              <SubHead>Pembatalan pemesanan</SubHead>
              <Para>
                Pembeli dapat mengajukan pembatalan pesanan selama pesanan belum
                berstatus dikirim (SHIPPED).
              </Para>
              <Para>Ketentuan pembatalan:</Para>
              <Bullets
                items={[
                  "Jika penjual menyetujui → pesanan dibatalkan dan dana dikembalikan kepada pembeli",
                  "Jika penjual tidak merespons dalam 24 jam → pesanan otomatis dibatalkan",
                  "Jika penjual menolak → pesanan tetap dilanjutkan",
                ]}
              />

              <SubHead>Produk pre-order</SubHead>
              <Para>
                Beberapa produk di Hoobiq dapat dijual dalam sistem pre-order.
                Waktu pengiriman untuk produk pre-order mengikuti estimasi yang
                ditentukan oleh penjual dan dapat berbeda dari produk ready stock.
                Dengan melakukan pembelian produk pre-order, pembeli dianggap
                telah memahami dan menyetujui estimasi waktu pengiriman yang
                berlaku.
              </Para>

              <SubHead>Pengiriman</SubHead>
              <Para>
                Penjual wajib menginput nomor resi sebagai bukti pengiriman.
                Pembeli dapat memantau status pengiriman melalui sistem yang
                tersedia. Apabila pesanan tidak dikirim dalam waktu yang
                ditentukan:
              </Para>
              <Bullets
                items={[
                  "Sistem akan membatalkan pesanan secara otomatis",
                  "Dana akan dikembalikan kepada pembeli",
                ]}
              />

              <SubHead>Barang tidak sesuai / rusak</SubHead>
              <Para>Jika barang yang diterima tidak sesuai atau dalam kondisi rusak:</Para>
              <Bullets
                items={[
                  "Pembeli wajib menyertakan bukti berupa foto atau video",
                  "Pembeli dan penjual dapat melakukan diskusi terlebih dahulu melalui fitur chat",
                ]}
              />
              <Para>Jika tidak tercapai kesepakatan:</Para>
              <Bullets items={["Kasus akan ditinjau oleh Hoobiq"]} />

              <SubHead>Retur (pengembalian barang)</SubHead>
              <Para>Pembeli dapat mengajukan retur setelah barang diterima.</Para>
              <Para>Ketentuan retur:</Para>
              <Bullets
                items={[
                  "Jika penjual menyetujui → pembeli dapat mengirimkan barang kembali maksimal 5 hari",
                  "Jika penjual tidak merespons dalam 48 jam → retur otomatis dapat dilakukan",
                  "Jika penjual menolak → masuk ke proses dispute",
                ]}
              />
              <Para>Setelah barang diterima kembali oleh penjual:</Para>
              <Bullets
                items={[
                  "Penjual wajib melakukan konfirmasi maksimal 3 hari",
                  "Jika tidak ada konfirmasi → retur dianggap disetujui otomatis",
                  "Refund akan diproses kepada pembeli",
                ]}
              />

              <SubHead>Penyelesaian sengketa (dispute)</SubHead>
              <Para>Jika pembeli dan penjual tidak mencapai kesepakatan:</Para>
              <Bullets
                items={[
                  "Hoobiq akan melakukan peninjauan berdasarkan bukti yang tersedia",
                  "Bukti dapat berupa chat, foto, video, dan data pengiriman",
                ]}
              />
              <Para>Keputusan Hoobiq dapat berupa:</Para>
              <Bullets
                items={[
                  "Barang dikembalikan ke penjual dan dana dikembalikan ke pembeli",
                  "Barang tidak perlu dikembalikan dan dana dikembalikan ke pembeli",
                  "Dana tetap diteruskan ke penjual",
                ]}
              />
              <Para>
                Keputusan Hoobiq bersifat <b>final dan mengikat</b> bagi kedua
                belah pihak.
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
                Pengiriman dilakukan melalui mitra logistik yang tersedia di
                Hoobiq (seperti JNE, J&amp;T, SiCepat, GoSend, dan mitra yang
                tersedia di Komerce).
              </Para>
              <Para>
                Penjual wajib mengirimkan pesanan dalam waktu maksimal 2×24 jam
                setelah pembayaran dikonfirmasi, kecuali terdapat ketentuan lain
                pada halaman produk (misalnya pre-order).
              </Para>
              <Para>
                Penjual wajib menginput nomor resi yang valid sebagai bukti
                pengiriman. Status pesanan akan dianggap dikirim (SHIPPED)
                setelah nomor resi berhasil diinput.
              </Para>

              <SubHead>Tanggung jawab pengiriman</SubHead>
              <Bullets
                items={[
                  "Penjual bertanggung jawab memastikan barang dikirim sesuai pesanan dan dalam kondisi aman",
                  "Pembeli bertanggung jawab memastikan alamat pengiriman yang diinput sudah benar dan lengkap",
                  "Risiko keterlambatan pengiriman oleh pihak kurir berada di luar tanggung jawab Hoobiq",
                ]}
              />

              <SubHead>Standar pengemasan</SubHead>
              <Para>
                Penjual wajib mengemas barang dengan aman dan sesuai standar
                kategori produk. Contoh standar minimum:
              </Para>
              <Bullets
                items={[
                  "Trading card / kartu koleksi / slab → menggunakan pelindung (top loader / hard case) + bubble wrap",
                  "Figure / barang fragile → menggunakan box pelindung (disarankan double box) + pelindung tambahan",
                ]}
              />
              <Para>
                Penjual bertanggung jawab atas kerusakan yang disebabkan oleh
                pengemasan yang tidak memadai.
              </Para>

              <SubHead>Barang rusak saat pengiriman</SubHead>
              <Para>Jika barang diterima dalam kondisi rusak:</Para>
              <Bullets
                items={[
                  "Pembeli wajib menyertakan bukti berupa foto/video saat unboxing",
                  "Proses penanganan akan mengikuti ketentuan pada bagian retur dan dispute",
                ]}
              />
              <Para>Apabila kerusakan disebabkan oleh kelalaian pengemasan:</Para>
              <Bullets items={["Penjual bertanggung jawab atas kerugian yang terjadi"]} />

              <SubHead>Asuransi pengiriman</SubHead>
              <Para>
                Untuk transaksi dengan nilai tinggi, pembeli disarankan untuk
                menggunakan asuransi pengiriman yang disediakan oleh mitra
                logistik.
              </Para>
              <Para>Tanpa asuransi:</Para>
              <Bullets
                items={[
                  "Tanggung jawab atas kehilangan atau kerusakan dalam proses pengiriman akan mengikuti kebijakan dari pihak kurir",
                ]}
              />
            </>
          ),
        },
        {
          id: "dispute",
          heading: "5. Dispute & refund",
          body: (
            <>
              <Para>
                Hoobiq menyediakan mekanisme penyelesaian masalah untuk
                melindungi pembeli dan penjual dalam setiap transaksi. Selama
                proses dispute berlangsung, dana transaksi akan tetap ditahan
                oleh sistem hingga keputusan akhir ditentukan.
              </Para>

              <SubHead>Kondisi yang dapat diajukan dispute</SubHead>
              <Para>Pembeli dapat mengajukan dispute apabila:</Para>
              <Bullets
                items={[
                  "Barang tidak sesuai dengan deskripsi",
                  "Barang rusak saat diterima",
                  "Barang tidak lengkap atau berbeda dari pesanan",
                ]}
              />
              <Para>
                Dispute hanya dapat diajukan setelah barang diterima atau dalam
                kondisi tertentu sebelum dana diteruskan ke penjual.
              </Para>

              <SubHead>Proses penyelesaian</SubHead>
              <Bullets
                items={[
                  "Pembeli mengajukan dispute dengan menyertakan bukti yang relevan",
                  "Pembeli dan penjual dapat melakukan diskusi melalui fitur chat",
                  "Jika tidak tercapai kesepakatan, kasus akan ditinjau oleh tim Hoobiq",
                ]}
              />

              <SubHead>Bukti yang dibutuhkan</SubHead>
              <Para>Untuk mempercepat proses, pembeli disarankan menyertakan:</Para>
              <Bullets
                items={[
                  "Foto atau video unboxing (disarankan direkam sejak paket dibuka)",
                  "Foto kondisi barang dari beberapa sudut",
                  "Bukti komunikasi dengan penjual (jika ada kesepakatan khusus)",
                ]}
              />
              <Para>
                Hoobiq berhak menolak pengajuan dispute apabila bukti tidak
                memadai.
              </Para>

              <SubHead>Keputusan penyelesaian</SubHead>
              <Para>Berdasarkan hasil peninjauan, Hoobiq dapat memutuskan:</Para>
              <Bullets
                items={[
                  "Barang dikembalikan ke penjual dan dana dikembalikan ke pembeli",
                  "Barang tidak perlu dikembalikan dan dana dikembalikan ke pembeli",
                  "Dana tetap diteruskan ke penjual",
                ]}
              />
              <Para>
                Keputusan Hoobiq bersifat <b>final dan mengikat</b>.
              </Para>

              <SubHead>Ketentuan refund</SubHead>
              <Para>Refund hanya dapat diproses apabila:</Para>
              <Bullets
                items={[
                  "Transaksi dibatalkan sebelum pengiriman",
                  "Dispute disetujui oleh penjual atau Hoobiq",
                  "Retur telah selesai sesuai prosedur",
                ]}
              />
              <Para>
                Dana refund akan dikembalikan melalui metode pembayaran yang
                digunakan atau ke saldo pengguna sesuai kebijakan yang berlaku.
              </Para>

              <SubHead>Batas waktu & ketentuan tambahan</SubHead>
              <Bullets
                items={[
                  <>Pembeli wajib mengajukan dispute dalam waktu maksimal <b>3 hari setelah barang diterima</b></>,
                  "Jika tidak ada pengajuan dispute dalam periode tersebut, transaksi dianggap selesai dan dana akan diteruskan ke penjual",
                  "Pengajuan dispute yang terindikasi penyalahgunaan dapat ditolak oleh Hoobiq",
                ]}
              />
            </>
          ),
        },
        {
          id: "konten",
          heading: "6. Konten komunitas",
          body: (
            <>
              <Para>
                Hoobiq menyediakan fitur komunitas untuk berbagi koleksi,
                informasi, dan interaksi antar pengguna.
              </Para>
              <Para>
                Konten yang kamu unggah tetap menjadi milik kamu. Namun, dengan
                mengunggah konten, kamu memberikan izin kepada Hoobiq untuk
                menampilkan, menyimpan, dan mempromosikan konten tersebut di
                dalam platform.
              </Para>

              <SubHead>Tanggung jawab pengguna</SubHead>
              <Para>
                Pengguna bertanggung jawab atas konten yang diunggah, termasuk
                keaslian, kepemilikan, dan dampak dari konten tersebut terhadap
                pengguna lain.
              </Para>

              <SubHead>Konten yang tidak diperbolehkan</SubHead>
              <Para>Pengguna dilarang mengunggah konten yang:</Para>
              <Bullets
                items={[
                  "Mengandung ujaran kebencian, pelecehan, atau diskriminasi terhadap individu atau kelompok",
                  "Menyebarkan data pribadi orang lain tanpa izin (doxing)",
                  "Mengandung unsur pornografi atau konten tidak pantas",
                  "Bersifat spam, promosi berlebihan, atau mengganggu pengalaman pengguna lain",
                  "Mengandung penipuan, manipulasi, atau informasi yang menyesatkan (misalnya fake proof, flexing palsu, dll)",
                ]}
              />

              <SubHead>Keterkaitan dengan transaksi</SubHead>
              <Para>Konten komunitas tidak boleh digunakan untuk:</Para>
              <Bullets
                items={[
                  "Mengarahkan transaksi di luar Hoobiq (menghindari sistem pembayaran platform)",
                  "Menawarkan jual beli tanpa melalui sistem marketplace Hoobiq",
                ]}
              />
              <Para>
                Hoobiq berhak menghapus konten yang terindikasi melanggar
                ketentuan ini.
              </Para>

              <SubHead>Hak Hoobiq</SubHead>
              <Para>Hoobiq berhak untuk:</Para>
              <Bullets
                items={[
                  "Menghapus atau membatasi visibilitas konten",
                  "Menangguhkan atau menonaktifkan akun",
                  "Mengambil tindakan terhadap konten yang melanggar ketentuan atau merugikan pengguna lain",
                  "Menggunakan konten publik untuk keperluan promosi tanpa memberikan kompensasi kepada pengguna",
                ]}
              />
            </>
          ),
        },
        {
          id: "penghentian",
          heading: "7. Penghentian & pembatasan akun",
          body: (
            <>
              <Para>
                Pengguna dapat menutup akun kapan saja melalui pengaturan akun
                yang tersedia di platform.
              </Para>
              <Para>Sebelum akun ditutup:</Para>
              <Bullets
                items={[
                  "Seluruh transaksi yang sedang berjalan harus diselesaikan terlebih dahulu",
                  "Saldo yang tersedia akan diproses sesuai metode penarikan yang berlaku",
                ]}
              />

              <SubHead>Hak Hoobiq</SubHead>
              <Para>
                Hoobiq berhak untuk melakukan pembatasan, penangguhan, atau
                penonaktifan akun, baik sementara maupun permanen, apabila
                ditemukan:
              </Para>
              <Bullets
                items={[
                  "Pelanggaran terhadap Ketentuan Layanan",
                  "Aktivitas mencurigakan atau berpotensi merugikan pengguna lain",
                  "Penyalahgunaan sistem (termasuk manipulasi transaksi, rating, atau penyalahgunaan fitur)",
                  "Indikasi penipuan atau pelanggaran hukum",
                ]}
              />

              <SubHead>Penahanan dana</SubHead>
              <Para>
                Hoobiq berhak menahan sementara saldo atau dana dalam sistem
                apabila:
              </Para>
              <Bullets
                items={[
                  "Terdapat proses dispute yang masih berlangsung",
                  "Ditemukan aktivitas yang mencurigakan atau memerlukan verifikasi lebih lanjut",
                ]}
              />
              <Para>
                Dana akan ditinjau dan diproses sesuai hasil investigasi yang
                dilakukan oleh Hoobiq.
              </Para>

              <SubHead>Penutupan permanen</SubHead>
              <Para>Dalam kasus pelanggaran serius, Hoobiq berhak untuk:</Para>
              <Bullets
                items={[
                  "Menonaktifkan akun secara permanen",
                  "Membatasi akses ke layanan",
                  "Mengambil tindakan lanjutan sesuai ketentuan hukum yang berlaku",
                ]}
              />
            </>
          ),
        },
        {
          id: "tanggung-jawab",
          heading: "8. Batas tanggung jawab platform",
          body: (
            <>
              <Para>
                Hoobiq berperan sebagai penyedia platform yang mempertemukan
                penjual dan pembeli. Setiap transaksi yang terjadi merupakan
                kesepakatan langsung antara penjual dan pembeli.
              </Para>

              <SubHead>Peran Hoobiq</SubHead>
              <Para>
                Hoobiq tidak memiliki, menyimpan, atau mengendalikan produk
                yang dijual oleh penjual. Hoobiq juga tidak bertanggung jawab
                atas:
              </Para>
              <Bullets
                items={[
                  "Kualitas, keaslian, atau legalitas barang yang diperjualbelikan",
                  "Kesesuaian barang dengan deskripsi yang diberikan oleh penjual",
                  "Kerugian yang timbul akibat penggunaan produk oleh pembeli",
                ]}
              />

              <SubHead>Tanggung jawab pengguna</SubHead>
              <Para>Penjual dan pembeli bertanggung jawab penuh atas:</Para>
              <Bullets
                items={[
                  "Informasi yang diberikan dalam transaksi",
                  "Keputusan untuk melakukan pembelian atau penjualan",
                  "Komunikasi dan kesepakatan yang terjadi di dalam platform",
                ]}
              />

              <SubHead>Layanan pihak ketiga</SubHead>
              <Para>
                Hoobiq bekerja sama dengan pihak ketiga seperti penyedia
                pembayaran dan layanan logistik. Segala kendala yang terjadi
                pada layanan tersebut mengikuti ketentuan masing-masing penyedia
                layanan.
              </Para>

              <SubHead>Keterbatasan tanggung jawab</SubHead>
              <Para>
                Sejauh diizinkan oleh hukum yang berlaku, Hoobiq tidak
                bertanggung jawab atas:
              </Para>
              <Bullets
                items={[
                  "Kerugian tidak langsung, kehilangan keuntungan, atau kerusakan yang timbul dari penggunaan platform",
                  "Keterlambatan atau kegagalan layanan akibat faktor di luar kendali (force majeure), termasuk gangguan sistem, jaringan, atau layanan pihak ketiga",
                ]}
              />

              <SubHead>Hak Hoobiq</SubHead>
              <Para>Hoobiq berhak untuk:</Para>
              <Bullets
                items={[
                  "Menangguhkan atau menghentikan layanan sewaktu-waktu untuk perbaikan atau pengembangan sistem",
                  "Menghapus konten atau membatasi akun yang melanggar ketentuan",
                  "Menahan dana sementara apabila ditemukan indikasi penyalahgunaan atau aktivitas mencurigakan",
                ]}
              />
            </>
          ),
        },
        {
          id: "perubahan",
          heading: "9. Perubahan ketentuan",
          body: (
            <>
              <Para>
                Hoobiq dapat mengubah atau memperbarui Ketentuan Layanan ini dari
                waktu ke waktu untuk menyesuaikan dengan perkembangan layanan
                maupun peraturan yang berlaku.
              </Para>
              <Para>
                Perubahan akan mulai berlaku sejak dipublikasikan di platform
                Hoobiq.
              </Para>
              <Para>
                Pengguna disarankan untuk meninjau Ketentuan Layanan secara
                berkala. Dengan tetap menggunakan layanan Hoobiq setelah
                perubahan berlaku, pengguna dianggap telah membaca, memahami,
                dan menyetujui ketentuan terbaru.
              </Para>
            </>
          ),
        },
        {
          id: "hukum",
          heading: "10. Hukum yang berlaku",
          body: (
            <>
              <Para>
                Ketentuan Layanan ini diatur dan ditafsirkan sesuai dengan hukum
                yang berlaku di Republik Indonesia.
              </Para>
              <Para>
                Setiap sengketa yang timbul sehubungan dengan penggunaan layanan
                Hoobiq akan diselesaikan sesuai dengan peraturan
                perundang-undangan yang berlaku di Indonesia.
              </Para>
            </>
          ),
        },
      ]}
    />
  );
}
