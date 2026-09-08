# Tilki alfa 0.3 — film, dizi ve sosyal sohbet

Katalog misafirlere açıktır. Kütüphane, arkadaşlık, profil ve sohbet normal Supabase hesabı gerektirir. Mesaj şifreleme, cihaz anahtarı, anahtar eşleştirme ve güvenlik numarası kaldırılmıştır. Aynı hesaba başka bir tarayıcıdan giriş yapılabilir.

## Kurulum / mevcut sürümden geçiş

**Supabase SQL Editor'da `setup.sql` dosyasının tamamını çalıştırın.** Bu dosya temel hesap/mesaj tablolarını ve kütüphane/arkadaşlık tablolarını birlikte kurar; önceki kurulumları veri silmeden günceller. Tekrar çalıştırılabilir. `supabase.sql` + `cinema.sql` kaynaklarından `node prepare-setup.cjs` ile üretilir.

`supabase-config.js` mevcut URL ve anon/public anahtarını kullanır. Sunucu anahtarı eklemeyin. Authentication bölümünde Email sağlayıcısı açık olmalıdır. E-posta onayı açıksa kullanıcı bağlantıyı açtıktan sonra giriş yapar. Anında kayıt/giriş gerekiyorsa test projesinde Confirm email kapatılabilir; uygulama iki durumu da destekler.

E-posta onayı ve parola yenilemesi için Supabase **URL Configuration** altında kullanılan adresi **Site URL** ve **Redirect URLs** listesine ekleyin. Yerelde `http://127.0.0.1:4173/`, yayımlanan sürümde kendi HTTPS adresiniz kullanılmalıdır. Parola yenileme dönüşü `#auth` üzerinden işlenir. Akış [Supabase parola yenileme API'sine](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) dayanır.

Bu çalışma canlı Supabase şemasını değiştirmez; SQL dosyası yönetici tarafından uygulanmalıdır. Geçiş yapılmazsa uygulama bunu açıklayan hata gösterir. Mevcut Sites yayını otomatik güncellenmez; yerel sürüm ayrı test edilebilir.

## Çalıştırma

`node server.cjs` → `http://127.0.0.1:4173`

Uygulamanın derlenmesi için paket kurulumu gerekmez. Node.js 22 veya üstü kullanın.

## Özellikler

- Üyeliksiz 12 yapımlık film/dizi kataloğu, arama, filtre ve detay ekranları.
- E-posta/parola ile kayıt, giriş, oturum geri yükleme, e-posta onayı, parola sıfırlama ve çıkış.
- Otomatik profil oluşturma, profil düzenleme, arkadaşlık isteği, kabul/ret/iptal.
- Hesaba bağlı mesaj geçmişi; metin, görsel ve tıklanabilir film önerisi gönderimi.
- Realtime mesajlar, okunmamış sayacı, teslim/okundu durumu ve tekrar bağlantıda eşitleme.
- Konuşma başına önceki mesajları 50'şer yükleme; aynı anda gelen kayıtların tekilleştirilmesi.
- Gönderim hatasında taslağı koruma, tekrar denemede aynı mesaj kimliğiyle mükerrer gönderimi engelleme.
- Engelleme ve engel kaldırma; iki yönlü mesaj engeli veritabanında denetlenir.
- İzlenecekler, izlenenler, izliyorum ve favoriler.

Mesajlar artık `messages.content` içinde normal JSON içeriği olarak saklanır. Erişim Supabase oturumu ve RLS politikalarıyla yalnızca katılımcılara açılır; bu uçtan uca şifreleme değildir. Supabase parolaları kendi Auth altyapısında yönetir, uygulama parolayı profil tablosuna kaydetmez.

Eski şifreli mesajların kayıtları silinmez veya otomatik çözülemez. Uygulama bunları eski sürüm mesajı olarak gösterir. Eski tarayıcı anahtarları okunmaz, kullanılmaz veya silinmez. Yeni kayıt ve mesajlar bunlara bağımlı değildir.

## Testler

`node --test tests/chat.cjs tests/cinema.cjs`

SQL geçişi ve gerçek PostgreSQL RLS testleri için bir defa `node install-test-db.cjs`, ardından `node --test tests/database.cjs` çalıştırın. Sabit sürümlü PGlite yalnızca `.test-tools/` altında tutulur; site çıktısına dahil edilmez.

`node build.cjs` → statik çıktı `dist/`, birleşik kurulum `setup.sql`.

Yerel testler yeni kurulum, eski şemadan geçiş, tekrar migration, otomatik profil, mesaj yetkileri, arkadaşlık onayı, engelleme ve kütüphane gizliliğini kapsar. Canlı Supabase, e-posta teslimi ve iki gerçek tarayıcıyla uçtan uca test ayrıca yapılmalıdır. Katalog sabit bir alfa seçkisidir; film yayın servisi değildir.
