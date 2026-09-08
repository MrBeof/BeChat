# Tilki 0.3 değişiklik özeti

Önceki kriptografi odaklı inceleme bu sürümün hedefi değildir. Ürün, film/dizi keşfi ve normal üyelik tabanlı sosyal sohbet olarak düzenlendi.

## Tamamlananlar

- Tarayıcıya bağımlı şifreleme, anahtar üretimi/yükleme, güvenlik numarası ve paket inceleme arayüzleri kaldırıldı.
- Kayıt/girişten ayrı profil kurulumu ve otomatik veritabanı profil tetikleyicisi eklendi.
- Parola sıfırlama, oturum olayları, farklı cihazdan giriş ve çıkış temizliği eklendi.
- Normal mesaj içeriği, görsel ve film önerisi, mesaj sayfalama, Realtime tekilleştirme ve okundu durumu eklendi.
- Gönderim hatasında taslak ve tekrar gönderim kimliği korunur.
- Engelleme ve engel kaldırma arayüzü, sunucuda iki yönlü mesaj engeli eklendi.
- Eski veri silinmeden geçiş için tek `setup.sql` dosyası hazırlanır.
- Yerel PostgreSQL motorunda fresh/legacy migration ve RLS testleri eklendi.

## Alfa sınırları

- Canlı Supabase yönetici erişimi olmadığı için migration canlıya uygulanmadı.
- Eski şifreli mesajlar otomatik dönüştürülmez; veritabanında korunur.
- Canlı e-posta akışı, gerçek Realtime bağlantısı ve tarayıcı etkileşimleri ayrıca doğrulanmalı.
- Büyük görseller için Storage, kötüye kullanım/rate limit, bildirimler ve hesap silme sonraki sürüm işidir.
- Arkadaşlıktan çıkarma mesaj geçmişini silmez; iletişimi kesmek için engelleme kullanılır.
