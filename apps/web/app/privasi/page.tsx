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
          id: "pendahuluan",
          heading: "1. Pendahuluan",
          body: (
            <>
              <Para>
                Hoobiq menghargai dan melindungi privasi setiap pengguna. Kebijakan
                Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan,
                menyimpan, dan melindungi data pribadi kamu saat menggunakan layanan
                Hoobiq.
              </Para>
              <Para>
                Dengan mendaftar dan menggunakan Hoobiq, kamu dianggap telah membaca
                dan memahami isi Kebijakan Privasi ini.
              </Para>
              <Para>
                Kami hanya mengumpulkan data yang diperlukan untuk menjalankan
                layanan, meningkatkan pengalaman pengguna, serta menjaga keamanan
                platform.
              </Para>
              <Para>
                Jika ada pertanyaan terkait kebijakan ini atau data pribadi kamu,
                silakan hubungi kami melalui{" "}
                <a className="text-brand-400" href="mailto:hello.hoobiq@gmail.com">
                  hello.hoobiq@gmail.com
                </a>
                .
              </Para>
            </>
          ),
        },
        {
          id: "data",
          heading: "2. Data yang kami kumpulkan",
          body: (
            <>
              <Para>
                Kami mengumpulkan beberapa jenis data untuk menjalankan layanan
                Hoobiq dengan aman dan optimal.
              </Para>

              <SubHead>Data yang kamu berikan langsung</SubHead>
              <Para>Saat mendaftar atau menggunakan layanan, kamu dapat memberikan data seperti:</Para>
              <Bullets
                items={[
                  "Nama",
                  "Alamat email",
                  "Nomor telepon",
                  "Alamat pengiriman",
                  "Informasi profil (termasuk minat atau preferensi)",
                ]}
              />
              <Para>Untuk keperluan tertentu (seperti verifikasi penjual), kami juga dapat meminta:</Para>
              <Bullets
                items={[
                  "Data identitas (seperti KTP)",
                  "Foto selfie untuk verifikasi",
                ]}
              />

              <SubHead>Data transaksi</SubHead>
              <Para>Kami mengumpulkan informasi terkait aktivitas jual beli di platform, termasuk:</Para>
              <Bullets
                items={[
                  "Detail produk yang dibeli atau dijual",
                  "Nilai transaksi",
                  "Metode pembayaran",
                  "Status pengiriman dan nomor resi",
                ]}
              />

              <SubHead>Data penggunaan</SubHead>
              <Para>Kami mengumpulkan data mengenai aktivitas kamu saat menggunakan Hoobiq, seperti:</Para>
              <Bullets
                items={[
                  "Riwayat pencarian dan interaksi",
                  "Produk yang dilihat, disimpan, atau dibeli",
                  "Aktivitas dalam fitur komunitas dan chat",
                ]}
              />

              <SubHead>Data perangkat & teknis</SubHead>
              <Para>Kami juga dapat mengumpulkan data teknis secara otomatis, seperti:</Para>
              <Bullets
                items={[
                  "Alamat IP",
                  "Jenis perangkat dan browser",
                  "Informasi sistem dan log aktivitas",
                ]}
              />
              <Para>Data ini digunakan untuk menjaga keamanan sistem dan meningkatkan performa layanan.</Para>
            </>
          ),
        },
        {
          id: "pemakaian",
          heading: "3. Cara kami menggunakan data",
          body: (
            <>
              <Para>
                Kami menggunakan data yang dikumpulkan untuk menjalankan layanan
                Hoobiq secara optimal, aman, dan terpercaya.
              </Para>

              <SubHead>Menjalankan layanan</SubHead>
              <Bullets
                items={[
                  "Memproses transaksi antara pembeli dan penjual",
                  "Mengelola akun pengguna dan aktivitas di dalam platform",
                  "Mengatur pengiriman serta pelacakan pesanan",
                ]}
              />

              <SubHead>Verifikasi & keamanan</SubHead>
              <Bullets
                items={[
                  "Melakukan verifikasi identitas pengguna (termasuk verifikasi KTP)",
                  "Mencegah penipuan, penyalahgunaan, dan aktivitas mencurigakan",
                  "Menjaga keamanan akun dan sistem",
                ]}
              />

              <SubHead>Meningkatkan pengalaman pengguna</SubHead>
              <Bullets
                items={[
                  "Menampilkan rekomendasi produk yang relevan",
                  "Menyesuaikan konten dan pengalaman pengguna",
                  "Mengembangkan serta meningkatkan fitur layanan",
                ]}
              />

              <SubHead>Komunikasi</SubHead>
              <Bullets
                items={[
                  "Mengirimkan notifikasi terkait transaksi dan aktivitas akun",
                  "Memberikan informasi penting terkait layanan",
                  "Menanggapi pertanyaan atau permintaan pengguna",
                ]}
              />

              <SubHead>Kepatuhan & perlindungan hukum</SubHead>
              <Bullets
                items={[
                  "Memenuhi kewajiban hukum yang berlaku",
                  "Melindungi hak, keamanan, dan kepentingan Hoobiq maupun pengguna",
                ]}
              />
            </>
          ),
        },
        {
          id: "mitra",
          heading: "4. Berbagi data dengan pihak ketiga",
          body: (
            <>
              <Para>
                Kami hanya membagikan data yang diperlukan untuk menjalankan layanan
                Hoobiq, dan hanya kepada pihak ketiga yang relevan.
              </Para>

              <SubHead>Layanan pembayaran</SubHead>
              <Bullets
                items={[
                  "Kami bekerja sama dengan penyedia payment gateway untuk memproses transaksi pembayaran",
                  "Data yang dibagikan dapat mencakup informasi pembayaran dan rekening tujuan untuk keperluan transaksi",
                ]}
              />

              <SubHead>Layanan logistik</SubHead>
              <Bullets
                items={[
                  "Kami bekerja sama dengan penyedia layanan logistik untuk pengiriman pesanan",
                  "Data yang dibagikan meliputi nama penerima, alamat pengiriman, dan nomor telepon yang diperlukan untuk proses pengiriman",
                ]}
              />

              <SubHead>Penyedia layanan pendukung</SubHead>
              <Bullets
                items={[
                  "Kami dapat menggunakan pihak ketiga untuk mendukung operasional platform, seperti pengiriman notifikasi atau penyimpanan data",
                  "Data yang dibagikan terbatas pada yang diperlukan untuk menjalankan fungsi tersebut",
                ]}
              />

              <Para>
                Kami memastikan bahwa setiap pihak ketiga yang bekerja sama dengan
                Hoobiq memiliki standar keamanan yang memadai dan hanya menggunakan
                data sesuai dengan kebutuhan layanan.
              </Para>
            </>
          ),
        },
        {
          id: "penyimpanan",
          heading: "5. Penyimpanan & keamanan data",
          body: (
            <>
              <Para>
                Hoobiq menyimpan dan memproses data pribadi pengguna hanya untuk
                jangka waktu yang diperlukan guna menjalankan layanan, memenuhi
                kewajiban hukum, serta melindungi kepentingan Hoobiq dan pengguna.
              </Para>

              <SubHead>Keamanan data</SubHead>
              <Bullets
                items={[
                  "Hoobiq menerapkan langkah-langkah teknis dan organisasi yang wajar untuk melindungi data pribadi dari akses, penggunaan, perubahan, atau pengungkapan yang tidak sah",
                  "Akses terhadap data pribadi dibatasi hanya kepada pihak yang memiliki kewenangan dan kebutuhan untuk menjalankan layanan",
                  "Hoobiq dapat melakukan pemantauan, pengujian, dan evaluasi sistem secara berkala untuk menjaga keamanan dan integritas data",
                ]}
              />

              <SubHead>Penyimpanan data (retensi)</SubHead>
              <Bullets
                items={[
                  "Data pribadi akan disimpan selama akun pengguna masih aktif atau selama diperlukan untuk tujuan pengumpulan data tersebut",
                  "Dalam kondisi tertentu, Hoobiq dapat menyimpan data lebih lama untuk memenuhi kewajiban hukum, penyelesaian sengketa, audit, atau pencegahan penipuan",
                  "Setelah data tidak lagi diperlukan, Hoobiq dapat menghapus atau menganonimkan data sesuai kebijakan internal",
                ]}
              />

              <SubHead>Batasan keamanan</SubHead>
              <Para>
                Meskipun Hoobiq berupaya menjaga keamanan data dengan standar yang
                wajar, pengguna memahami bahwa tidak ada sistem elektronik yang
                sepenuhnya aman atau bebas dari risiko.
              </Para>
              <Para>
                Pengguna juga bertanggung jawab untuk menjaga kerahasiaan akun,
                termasuk informasi login dan aktivitas yang terjadi di dalam akun.
                Hoobiq tidak bertanggung jawab atas kebocoran data yang disebabkan
                oleh kelalaian pengguna dalam menjaga keamanan akun.
              </Para>
            </>
          ),
        },
        {
          id: "hak",
          heading: "6. Hak pengguna",
          body: (
            <>
              <Para>
                Pengguna memiliki hak atas data pribadi yang diberikan kepada Hoobiq,
                sesuai dengan ketentuan yang berlaku.
              </Para>

              <SubHead>Akses & pembaruan data</SubHead>
              <Bullets
                items={[
                  "Pengguna berhak untuk mengakses dan memperbarui data pribadi yang tersimpan di akun Hoobiq",
                  "Pengguna bertanggung jawab untuk memastikan bahwa data yang diberikan akurat dan terkini",
                ]}
              />

              <SubHead>Permintaan penghapusan data</SubHead>
              <Bullets
                items={[
                  "Pengguna dapat mengajukan permintaan penghapusan data pribadi atau penutupan akun melalui fitur yang tersedia atau dengan menghubungi Hoobiq",
                  "Permintaan penghapusan akan diproses sesuai dengan ketentuan yang berlaku, termasuk kewajiban penyimpanan data untuk kepentingan hukum, audit, atau penyelesaian sengketa",
                ]}
              />

              <SubHead>Pembatasan & keberatan</SubHead>
              <Bullets
                items={[
                  "Pengguna dapat mengajukan keberatan atau pembatasan terhadap penggunaan data pribadi dalam kondisi tertentu",
                  "Hoobiq akan mempertimbangkan permintaan tersebut sepanjang tidak bertentangan dengan kewajiban hukum atau kepentingan sah dalam menjalankan layanan",
                ]}
              />

              <SubHead>Penarikan persetujuan</SubHead>
              <Bullets
                items={[
                  "Dalam hal pemrosesan data didasarkan pada persetujuan, pengguna berhak untuk menarik persetujuan tersebut sewaktu-waktu",
                  "Penarikan persetujuan dapat mempengaruhi kemampuan pengguna dalam menggunakan sebagian atau seluruh layanan Hoobiq",
                ]}
              />
            </>
          ),
        },
        {
          id: "cookies",
          heading: "7. Cookie & teknologi serupa",
          body: (
            <>
              <Para>
                Hoobiq menggunakan cookie dan teknologi serupa untuk mendukung fungsi
                layanan, meningkatkan pengalaman pengguna, serta menjaga keamanan
                platform.
              </Para>

              <SubHead>Penggunaan cookie</SubHead>
              <Bullets
                items={[
                  "Cookie digunakan untuk menyimpan preferensi pengguna dan menjaga sesi login",
                  "Cookie membantu memahami bagaimana pengguna berinteraksi dengan platform untuk meningkatkan performa dan fitur layanan",
                  "Cookie juga dapat digunakan untuk mendeteksi aktivitas yang mencurigakan atau penyalahgunaan",
                ]}
              />

              <SubHead>Pengelolaan cookie</SubHead>
              <Bullets
                items={[
                  "Pengguna dapat mengatur atau menonaktifkan cookie melalui pengaturan browser masing-masing",
                  "Perlu diperhatikan bahwa penonaktifan cookie dapat mempengaruhi fungsi tertentu dalam layanan Hoobiq",
                ]}
              />
              <Para>
                Dengan menggunakan layanan Hoobiq, pengguna dianggap menyetujui
                penggunaan cookie sebagaimana dijelaskan dalam kebijakan ini.
              </Para>
            </>
          ),
        },
        {
          id: "retensi",
          heading: "8. Retensi data",
          body: (
            <>
              <Para>
                Hoobiq menyimpan data pribadi pengguna selama diperlukan untuk
                menjalankan layanan, memenuhi kewajiban hukum, serta melindungi
                kepentingan Hoobiq dan pengguna.
              </Para>

              <SubHead>Jangka waktu penyimpanan</SubHead>
              <Bullets
                items={[
                  "Data pribadi akan disimpan selama akun pengguna masih aktif",
                  "Data dapat tetap disimpan setelah akun ditutup sepanjang diperlukan untuk: pemenuhan kewajiban hukum, penyelesaian sengketa, pencegahan penipuan atau penyalahgunaan, kepentingan audit dan pencatatan internal",
                ]}
              />

              <SubHead>Penghapusan dan anonimisasi</SubHead>
              <Bullets
                items={[
                  "Data yang sudah tidak lagi diperlukan akan dihapus atau dianonimkan sesuai dengan kebijakan internal Hoobiq",
                  "Proses penghapusan data dilakukan dengan mempertimbangkan keamanan sistem dan kewajiban yang berlaku",
                ]}
              />
            </>
          ),
        },
        {
          id: "anak",
          heading: "9. Kebijakan pengguna di bawah umur",
          body: (
            <>
              <Para>
                Layanan Hoobiq ditujukan untuk pengguna yang telah berusia minimal 17
                tahun atau telah menikah sesuai dengan ketentuan hukum yang berlaku.
              </Para>
              <Para>
                Pengguna di bawah usia tersebut hanya diperbolehkan menggunakan
                layanan Hoobiq dengan persetujuan dan pengawasan dari orang tua atau
                wali yang sah.
              </Para>
              <Para>
                Hoobiq tidak secara sengaja mengumpulkan atau memproses data pribadi
                dari pengguna di bawah umur tanpa persetujuan yang sesuai. Apabila
                ditemukan bahwa data pribadi pengguna di bawah umur dikumpulkan
                tanpa persetujuan tersebut, Hoobiq berhak untuk menghapus data
                tersebut dan/atau menonaktifkan akun terkait.
              </Para>
            </>
          ),
        },
        {
          id: "perubahan",
          heading: "10. Perubahan kebijakan privasi",
          body: (
            <>
              <Para>
                Hoobiq berhak untuk mengubah atau memperbarui Kebijakan Privasi ini
                dari waktu ke waktu untuk menyesuaikan dengan perkembangan layanan
                maupun peraturan yang berlaku.
              </Para>
              <Para>
                Setiap perubahan akan mulai berlaku sejak dipublikasikan di platform
                Hoobiq.
              </Para>
              <Para>
                Pengguna disarankan untuk meninjau Kebijakan Privasi ini secara
                berkala. Dengan tetap menggunakan layanan Hoobiq setelah perubahan
                berlaku, pengguna dianggap telah membaca, memahami, dan menyetujui
                kebijakan terbaru.
              </Para>
            </>
          ),
        },
        {
          id: "kontak",
          heading: "11. Kontak kami",
          body: (
            <>
              <Para>
                Jika pengguna memiliki pertanyaan, permintaan, atau keluhan terkait
                Kebijakan Privasi maupun data pribadi, pengguna dapat menghubungi
                Hoobiq melalui:
              </Para>
              <Para>
                Email:{" "}
                <a className="text-brand-400 font-semibold" href="mailto:hello.hoobiq@gmail.com">
                  hello.hoobiq@gmail.com
                </a>
              </Para>
              <Para>
                Hoobiq akan berupaya menanggapi setiap permintaan dalam jangka waktu
                yang wajar sesuai dengan ketentuan yang berlaku.
              </Para>
            </>
          ),
        },
      ]}
    />
  );
}
