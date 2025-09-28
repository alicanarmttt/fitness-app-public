Harika, anlıyorum. Tüm içeriği, başlık, kod bloğu ve tablolar dahil, tek bir büyük ve kesintisiz Markdown bloğu (metin dosyası) olarak aşağıda sunuyorum. Bu metni doğrudan GitHub'a kopyalayıp yapıştırabilirsiniz.

-----

````markdown
# 🏋️ Fitness Planner App: Public Demo Version

Bu depo, tam teşekküllü bir fitness planlama web uygulamasının **Public Demo** versiyonudur. Proje, hem frontend hem de backend becerilerini sergilemek üzere tasarlanmıştır.

**ÖNEMLİ:** Gizlilik ve güvenlik nedeniyle, canlı sistemdeki hassas API anahtarları, şifreler ve production veritabanı şeması bu repoda bulunmaz. Tüm veritabanı işlemleri **Dummy (Sahte) SQL tabloları** üzerinden çalışmaktadır.

## ✨ Uygulama Özellikleri

| Kategori | Özellikler |
| :--- | :--- |
| **Programlama** | Haftanın herhangi bir günü için antrenman programı oluşturma ve yönetme. |
| **Egzersiz Yönetimi** | Egzersiz (ad, set, tekrar, kas grubu) ekleme, güncelleme ve silme (CRUD). |
| **Takip & Görselleştirme**| Haftalık rutini takvim üzerinde görselleştirme ve tamamlanan egzersizleri işaretleme. |
| **Analiz** | Haftalık/aylık set/tekrar analizi, kas grubu dağılımı, program tutarlılığı ve en iyi seri (streak) takibi. |
| **Kimlik Doğrulama**| Güvenli **JWT (JSON Web Token)** tabanlı kullanıcı giriş/kayıt sistemi. |

## ⚙️ Teknolojiler

| Kategori | Teknolojiler |
| :--- | :--- |
| **Frontend** | React, Redux Toolkit, React Router DOM, Bootstrap, CSS Modules |
| **Backend** | **Node.js, Express.js, JWT** |
| **Veritabanı** | Microsoft SQL Server (Yerel Geliştirme) |
| **Mimari** | **RESTful API Mimarisi**, async/await, Form Validasyonu |

---

## 🛠️ Kurulum ve Başlangıç (Dummy Ortam)

### A. Backend Kurulumu (`fitness-backend`)

1.  **Bağımlılıkları Kurun:**
    ```bash
    cd fitness-backend
    npm install
    ```

2.  **.env Dosyası ve Güvenlik:** Kök dizinde bir `.env` dosyası oluşturun ve gerekli değerleri girin. **Bu dosya `.gitignore` ile koruma altındadır.**

    ```env
    # DB Bağlantı Ayarları (Local MSSQL için)
    PORT=5000
    DB_USER=sa
    DB_PASSWORD=yourStrong(!)Password
    DB_SERVER=localhost
    DB_DATABASE=fitness_demo

    # JWT Ayarları (Public Demo İçin)
    JWT_SECRET=demo_secret_key_12345 
    ```

### B. MSSQL Dummy Tabloları Oluşturma

Aşağıdaki SQL betiğini MSSQL Server'da (veya Azure SQL'de) çalıştırarak dummy tablolarınızı oluşturun.

```sql
-- DUMMY KULLANICI VE PROGRAM TEMELLERİ
CREATE TABLE SampleUsers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    passwordHash NVARCHAR(255) NOT NULL,
    createdAt DATETIME2(7) DEFAULT GETDATE()
);

CREATE TABLE SampleDayPrograms (
    id INT IDENTITY(1,1) PRIMARY KEY,
    day VARCHAR(20) NOT NULL,
    isLocked BIT NOT NULL DEFAULT 0,
    user_id INT FOREIGN KEY REFERENCES SampleUsers(id) 
);

-- DUMMY EGZERSİZ, LOG VE TAKİP TABLOLARI
CREATE TABLE SampleExercise (
    id INT IDENTITY(1,1) PRIMARY KEY,
    program_id INT NOT NULL FOREIGN KEY REFERENCES SampleDayPrograms(id),
    name VARCHAR(50) NOT NULL,
    sets INT NOT NULL,
    reps INT NOT NULL,
    muscle VARCHAR(30),
    isCompleted BIT DEFAULT 0
);

CREATE TABLE SampleWorkoutLog (
    id INT IDENTITY(1,1) PRIMARY KEY,
    [date] DATE NOT NULL,
    program_id INT NOT NULL FOREIGN KEY REFERENCES SampleDayPrograms(id)
);

CREATE TABLE SampleWorkoutLogExercise (
    id INT IDENTITY(1,1) PRIMARY KEY,
    workout_log_id INT NOT NULL FOREIGN KEY REFERENCES SampleWorkoutLog(id),
    exercise_id INT, 
    exercise_name VARCHAR(50) NOT NULL,
    sets INT,
    reps INT,
    muscle VARCHAR(30),
    isCompleted BIT DEFAULT 0
);
````

### C. API Testi ve Başlatma

Sunucuyu başlatın:

```bash
npm run dev
```

API endpoint'leri:

| Metot | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Yeni kullanıcı kaydı oluşturur. |
| `POST` | `/auth/login` | **JWT alarak oturum açar.** |
| `POST` | `/program/generate` | Program günlüklerini oluşturur. |
| `GET` | `/programs` | Dummy program listesini getirir. |
| `PATCH` | `/workoutlog-exercise/:id/completed` | Egzersizi tamamlandı olarak işaretler. |

```
```
