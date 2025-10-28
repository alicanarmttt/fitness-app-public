PROJENİN CANLI LİNKİ: <a href="https://fitness-app-frontend-nu.vercel.app">Fitness-app</a>
<br>
<br>
deeee@gmail.com ve 123456 şifresiyle giriş yapıp kayıtlı programla projeyi görüntüleyebilirsiniz.
<br>
<br>
Analiz sayfasının takip edilebilmesi için.Geriye dönük 30 günlük program üretilmiştir. 
<br>
Takvim sayfasından egzersizleri yapıldı olarak işaretlerseniz analiz sayfasındaki değerleri dinamik olarak inceleyebilirsiniz. 
<br>


# Fitness Planner App: Public Demo

Bu depo, tam teşekküllü bir fitness planlama web uygulamasının **Public Demo** versiyonudur. Proje, hem frontend hem de backend becerilerini sergilemek üzere tasarlanmıştır. **Gizlilik ve güvenlik** nedeniyle, canlı sistemdeki hassas veriler, API anahtarları ve production veritabanı şeması bu repoda bulunmaz.

## ✨ Özellikler
  * **Kimlik Doğrulama** Güvenli **JWT (JSON Web Token)** tabanlı kullanıcı giriş/kayıt sistemi. 

  <img width="1899" height="890" alt="image" src="https://github.com/user-attachments/assets/98b92dfb-1fba-43e3-a218-f47b7c602fb2" />
  <img width="1861" height="903" alt="image" src="https://github.com/user-attachments/assets/e8626401-24da-4f6b-abf8-c76d9634dd75" />

  * **Create Weekly Programs:** Haftanın herhangi bir günü için antrenman programı oluşturma ve yönetme.
  * **Dynamic Exercises:** Egzersiz (ad, set, tekrar, kas grubu) ekleme, güncelleme ve silme (CRUD).
  * <img width="1886" height="851" alt="image" src="https://github.com/user-attachments/assets/d585446b-4712-45a3-84e7-d122858e232c" />

  * **Calendar View:** Haftalık rutini takvim üzerinde görselleştirme ve tamamlanan egzersizleri işaretleme.
  * <img width="1871" height="900" alt="image" src="https://github.com/user-attachments/assets/9e55b8e4-499a-4c53-87d8-b87ee5973502" />

  * **Analysis Page:** Haftalık/aylık set/tekrar analizi, kas grubu dağılımı, program tutarlılığı ve en iyi seri (streak) takibi.
  * **Track Completion:** Egzersizleri tamamlandı olarak işaretleme ve ilerlemeyi analiz etme.
  * <img width="1859" height="877" alt="image" src="https://github.com/user-attachments/assets/649a7d2f-bd6e-40e7-a3a2-f3cf212e310d" />

  * **Responsive UI:** React, Redux ve Bootstrap ile temiz ve duyarlı kullanıcı arayüzü.
 

## ⚙️ Teknolojiler

| Kategori | Teknolojiler |
| :--- | :--- |
| **Frontend** | React, Redux Toolkit, React Router DOM, Bootstrap, CSS Modules |
| **Backend** | **Node.js, Express.js, JWT (JSON Web Token)** |
| **Veritabanı** | Microsoft SQL Server (Yerel Geliştirme) |
| **Diğer** | **RESTful API Mimarisi**, async/await, Form Validasyonu |

-----

🛠️ Kurulum ve Başlangıç (Dummy Ortam)

Bu demo, fitness-app projesinin temel işlevlerini Knex.js tarafından yönetilen bir dummy veritabanı üzerinde gösterir.

A. Backend Kurulumu (fitness-backend)

Bağımlılıkları Kurun:

cd fitness-backend
npm install


.env Dosyası: Kök dizinde bir .env dosyası oluşturun ve gerekli değerleri girin.

Güvenlik Notu: Bu repoda gerçek JWT SECRET ve DB şifreleri bulunmaz.

# DB Bağlantı Ayarları (Local MSSQL için)
PORT=5000
DB_USER=sa
DB_PASSWORD=yourStrong(!)Password
DB_SERVER=localhost
DB_DATABASE=fitness_demo
DB_PORT=1433

# JWT Ayarları (Demo için herhangi bir gizli dize olabilir)
JWT_SECRET=demo_secret_key_12345


B. Veritabanı Kurulumu (Knex ile)

Bu proje, veritabanı şemasını ve başlangıç verilerini yönetmek için Knex.js kullanır. Manuel SQL komutları çalıştırmanıza gerek yoktur.

Veritabanını Oluşturun:
MSSQL Server'da .env dosyanızda belirttiğiniz isimle (fitness_demo) boş bir veritabanı oluşturun.

Migrasyonları Çalıştırın (Şema Oluşturma):
Aşağıdaki komut, migrations klasöründeki dosyaları çalıştırarak SampleUsers, SamplePrograms, SampleMovements ve SampleMovement_Muscle_Impact dahil en güncel veritabanı şemasını otomatik olarak oluşturacaktır.

npx knex migrate:latest


Veritabanını Doldurun (Seeding):
Aşağıdaki komut, seeds klasörünü çalıştırarak SampleMovements ve SampleMovement_Muscle_Impact tablolarını, analizler için gerekli olan başlangıç hareket ve kas etki verileriyle doldurur.

npx knex seed:run


C. Sunucuyu Başlatma ve API Testi

Backend sunucusunu başlatın:

npm run dev


API endpoint'leri (JWT gerektirenler için geçerli bir kullanıcı ile login olmanız gerekir):

Metot

Uç Nokta

Açıklama

POST

/auth/register

Yeni kullanıcı kaydı oluşturur.

POST

/auth/login

JWT alarak oturum açar.

GET

/api/movements

Tüm hareket havuzunu listeler.

GET

/api/programs

Kullanıcının program şablonlarını listeler.

POST

/api/programs

Yeni program şablonu oluşturur.

POST

/api/workoutlog/generate

Program günlüklerini (30 günlük) oluşturur.

GET

/api/analysis

Kullanıcının 7/30 günlük analizini getirir.

PATCH

/api/workoutlog-exercise/:id/completed

Egzersizi tamamlandı olarak işaretler.

D. Frontend Kurulumu (fitness-app)

Dizine Geçin ve Bağımlılıkları Kurun:

cd ../fitness-app
npm install


.env Dosyası: Frontend kök dizininde (fitness-app içinde) bir .env dosyası oluşturun ve backend adresini belirtin:

VITE_API_BASE_URL=http://localhost:5000


Uygulamayı Başlatın:

npm run dev


Uygulama varsayılan olarak http://localhost:5173 adresinde açılacaktır.
