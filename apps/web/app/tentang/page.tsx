import { Bullets, DocPage, Para, SubHead } from "@/components/doc-page";

export const metadata = { title: "Tentang · Hoobiq" };

export default function TentangPage() {
  return (
    <DocPage
      eyebrow="Tentang Hoobiq"
      title="Rumah kolektor hobi Indonesia."
      lead="Hoobiq adalah marketplace sekaligus komunitas untuk kolektor trading cards, action figure, blind box, merchandise, dan komik. Kami bikin tempat jual-beli yang aman dan komunitas yang beneran paham — supaya ritual mengoleksi tidak lagi harus lewat grup WhatsApp atau thread Twitter yang gampang ilang."
      updated="24 April 2026"
      sections={[
        {
          id: "kisah",
          heading: "Kenapa Hoobiq ada",
          body: (
            <>
              <Para>
                Di Indonesia, jual-beli koleksi hobi masih berserakan: grup Facebook yang
                banyak bot, thread Twitter yang cepat tenggelam, DM Instagram yang gampang
                kena penipuan. Harga kartu langka dan figure limited bisa puluhan juta —
                tapi mekanisme perlindungan pembeli-penjualnya masih setara transaksi di
                pasar loak.
              </Para>
              <Para>
                Hoobiq dibangun sebagai respons dari frustrasi itu. Kami ingin kolektor
                Indonesia punya <em>satu tempat</em> yang: (1) aman secara finansial,
                (2) terkurasi secara konten, dan (3) menghargai reputasi yang sudah dibangun
                pelan-pelan selama bertahun-tahun.
              </Para>
            </>
          ),
        },
        {
          id: "nilai",
          heading: "Yang kami pegang",
          body: (
            <>
              <SubHead>Transaksi, bukan harapan</SubHead>
              <Para>
                Setiap pembelian di atas Rp 100.000 wajib lewat Hoobiq Pay. Pembayaran
                aman sampai pembeli konfirmasi barang diterima. Tidak ada lagi "transfer dulu,
                barang belakangan".
              </Para>
              <SubHead>Reputasi di atas follower</SubHead>
              <Para>
                Badge, level, dan Trust Score di Hoobiq dihitung dari aktivitas nyata —
                jumlah trade selesai, rating, konsistensi. Angka follower tidak dipakai
                sebagai metrik reputasi.
              </Para>
              <SubHead>Kurasi, bukan feed algoritmik</SubHead>
              <Para>
                Feed komunitas terorganisir sampai level sub-seri (contoh: Pokémon, Crown
                Zenith, Rainbow Rare). Kamu tidak perlu scrolling acak untuk ketemu orang
                yang ngejar hal yang sama.
              </Para>
            </>
          ),
        },
        {
          id: "kategori",
          heading: "Kategori yang didukung",
          body: (
            <>
              <Para>
                Fokus kami di lima kategori koleksi utama. Daftar sub-seri dikurasi bersama
                admin kategori (kolektor yang kami verifikasi).
              </Para>
              <Bullets
                items={[
                  <><b className="text-fg">Trading Cards</b> — Pokémon TCG, One Piece Card Game, Genshin Impact TCG, Honkai: Star Rail, Yu-Gi-Oh!, MTG.</>,
                  <><b className="text-fg">Action Figure</b> — Nendoroid, Scale (1/7, 1/8), Figma, PVC, Gunpla.</>,
                  <><b className="text-fg">Blind Box</b> — Pop Mart (Labubu, Skullpanda, Dimoo), Sonny Angel, Kemelife.</>,
                  <><b className="text-fg">Merchandise</b> — Apparel, acrylic stand, plush, poster resmi.</>,
                  <><b className="text-fg">Komik</b> — Manga Jepang, comics US/EU, doujinshi, first prints.</>,
                ]}
              />
            </>
          ),
        },
        {
          id: "tim",
          heading: "Siapa di balik Hoobiq",
          body: (
            <>
              <Para>
                Hoobiq dibangun oleh dua founder, yang bukan cuma membangun platform,
                tapi juga hidup di dunia kolektor itu sendiri.
              </Para>
              <Bullets
                items={[
                  <><b className="text-fg">Cendria Vanessa</b> — Founder.</>,
                  <><b className="text-fg">Ebentera Santosa</b> — Founder.</>,
                ]}
              />
              <Para>
                Kami memulai Hoobiq dari keresahan yang sama: tidak adanya satu tempat
                yang benar-benar terasa “rumah” untuk para kolektor. Hoobiq memiliki
                tujuan untuk menjadi tempat untuk berbagi dan bertransaksi dalam satu
                ruang yang hidup.
              </Para>
              <Para>
                Hoobiq dikembangkan dari Jakarta dan Yogyakarta, dengan banyak
                keputusan produk yang kami bentuk bersama komunitas.
              </Para>
              <Para>
                Bagi kami, Hoobiq bukan sekadar marketplace. Ini adalah ruang yang
                dibangun bersama, untuk mereka yang peduli dengan koleksi, cerita, dan
                passion di balik setiap barang koleksi.
              </Para>
            </>
          ),
        },
        {
          id: "kontak",
          heading: "Hubungi kami",
          body: (
            <>
              <Bullets
                items={[
                  <>Email umum: <a className="text-brand-400" href="mailto:halo@hoobiq.com">halo@hoobiq.com</a></>,
                  <>Dukungan pengguna: <a className="text-brand-400" href="mailto:bantuan@hoobiq.com">bantuan@hoobiq.com</a></>,
                  <>Laporan penyalahgunaan & penipuan: <a className="text-brand-400" href="mailto:trust@hoobiq.com">trust@hoobiq.com</a></>,
                  <>Press / kerjasama: <a className="text-brand-400" href="mailto:press@hoobiq.com">press@hoobiq.com</a></>,
                ]}
              />
              <Para>
                Alamat terdaftar: Jl. Kemang Raya No. 42, Mampang Prapatan, Jakarta
                Selatan 12730. Kami biasanya membalas email dalam 1×24 jam di hari kerja.
              </Para>
            </>
          ),
        },
      ]}
    />
  );
}
