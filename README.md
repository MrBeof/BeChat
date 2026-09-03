# BeChat — tarayıcı prototipi

Android prototipinin HTML, CSS ve JavaScript ile çalışan sürümüdür. Sunucu başlatmadan `index.html` dosyasına çift tıklayarak açılır. Supabase yapılandırılmamışsa çalışan demo modu sunar.

## Supabase kurulumu

1. Supabase projesi oluşturun. **Authentication > Providers > Email** sağlayıcısının açık olduğundan emin olun.
2. SQL Editor'da `supabase.sql` dosyasının tamamını çalıştırın.
3. `supabase-config.js` içine Project URL ve **anon/public** anahtarını yazın. `service_role` anahtarını tarayıcı koduna kesinlikle eklemeyin.
4. `index.html` dosyasını çift tıklayın. Kullanıcılar görünen ad, e-posta ve en az 8 karakterli parolayla kayıt olabilir; ardından e-posta ve parolalarıyla giriş yapabilir.
5. İkinci bir kullanıcıyla test etmek için farklı tarayıcı profili veya başka bir cihaz kullanın.

`supabase.sql` tek kurulum dosyasıdır. Eski telefon tabanlı şemayı veri silmeden günceller; profil, kişi, engelleme, mesaj, güvenlik politikaları ve Realtime ayarlarının tamamını kurar.

Supabase panelindeki **Confirm email** ayarı açıksa yeni kullanıcı önce gelen e-postadaki bağlantıya tıklamalıdır. Kod ekranı kullanılmaz. Onaysız ve hemen giriş isteniyorsa bu ayarı Email sağlayıcısı altında kapatabilirsiniz.

Mesaj metni Web Crypto API ile tarayıcıda P-256 ECDH + AES-256-GCM kullanılarak şifrelenir. Supabase yalnızca şifreli metni, IV değerini, özeti ve teslim bilgisini saklar. Özel anahtar yalnızca ilgili tarayıcıda tutulur; tarayıcı verileri temizlenirse eski mesajlar çözülemez.

> Bu çalışma üretim güvenlik denetiminden geçmiş bir mesajlaşma ürünü değildir. Anahtar yedekleme, çoklu cihaz, anahtar yenileme ve kötüye kullanım önleme üretim öncesinde ayrıca tasarlanmalıdır.

Mesaj kutusunda `Enter` mesajı gönderir; `Shift+Enter` yeni satır açar. Şifreleme anahtarları hesap kimliğine göre ayrı saklanır. Tarayıcı verileri daha önce silindiyse eski mesajların anahtarı geri getirilemez; düzeltmeden sonra gönderilen yeni mesajlar çözülebilir.
