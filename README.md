

# Fitness Planner App: Public Demo

Bu depo, tam teşekküllü bir fitness planlama web uygulamasının **Public Demo** versiyonudur. Proje, hem frontend hem de backend becerilerini sergilemek üzere tasarlanmıştır. **Gizlilik ve güvenlik** nedeniyle, canlı sistemdeki hassas veriler, API anahtarları ve production veritabanı şeması bu repoda bulunmaz.

## ✨ Özellikler
  * **Kimlik Doğrulama** Güvenli **JWT (JSON Web Token)** tabanlı kullanıcı giriş/kayıt sistemi. 

  <img width="1899" height="890" alt="image" src="https://github.com/user-attachments/assets/98b92dfb-1fba-43e3-a218-f47b7c602fb2" />

  * **Create Weekly Programs:** Haftanın herhangi bir günü için antrenman programı oluşturma ve yönetme.
  * **Dynamic Exercises:** Egzersiz (ad, set, tekrar, kas grubu) ekleme, güncelleme ve silme (CRUD).
  * <img width="1875" height="908" alt="image" src="https://github.com/user-attachments/assets/f342aacc-7a07-40e2-8c15-08e3457d931e" />
  
  * **Calendar View:** Haftalık rutini takvim üzerinde görselleştirme ve tamamlanan egzersizleri işaretleme.
  * <img width="1839" height="911" alt="image" src="https://github.com/user-attachments/assets/29623a63-b29c-4fa0-a3d8-4d9058bce612" />
  * **Track Completion:** Egzersizleri tamamlandı olarak işaretleme ve ilerlemeyi analiz etme.
  * **Analysis Page:** Haftalık/aylık set/tekrar analizi, kas grubu dağılımı, program tutarlılığı ve en iyi seri (streak) takibi.
  * <img width="1888" height="901" alt="image" src="https://github.com/user-attachments/assets/75fefc2a-19e7-40d4-93f7-1d3c099fea1f" />
  * **Responsive UI:** React, Redux ve Bootstrap ile temiz ve duyarlı kullanıcı arayüzü.
 

## ⚙️ Teknolojiler

| Kategori | Teknolojiler |
| :--- | :--- |
| **Frontend** | React, Redux Toolkit, React Router DOM, Bootstrap, CSS Modules |
| **Backend** | **Node.js, Express.js, JWT (JSON Web Token)** |
| **Veritabanı** | Microsoft SQL Server (Yerel Geliştirme) |
| **Diğer** | **RESTful API Mimarisi**, async/await, Form Validasyonu |

-----

## 🛠️ Kurulum ve Başlangıç (Dummy Ortam)

Bu demo, gerçek bir veritabanı yerine, uygulamanın işlevselliğini göstermek için **dummy tablolar** kullanır.

### A. Backend Kurulumu (`fitness-backend`)

1.  **Bağımlılıkları Kurun:**

    ```bash
    cd fitness-backend
    npm install
    ```

2.  **.env Dosyası:** Kök dizinde bir `.env` dosyası oluşturun ve gerekli değerleri girin.

      * **Güvenlik Notu:** Bu repoda gerçek JWT SECRET ve DB şifreleri bulunmaz.

    <!-- end list -->

    ```env
    # DB Bağlantı Ayarları (Local MSSQL için)
    PORT=5000
    DB_USER=sa
    DB_PASSWORD=yourStrong(!)Password
    DB_SERVER=localhost
    DB_DATABASE=fitness_demo
    DB_PORT=1433

    # JWT Ayarları (Demo için herhangi bir gizli dize olabilir)
    JWT_SECRET=demo_secret_key_12345
    ```

### B. MSSQL Dummy Tabloları Oluşturma

Aşağıdaki SQL betiğini MSSQL Server'da (`fitness_demo` veritabanı içinde) çalıştırarak dummy tablolarınızı oluşturun. Bu tablolar, gerçek yapıdaki sütun adlarını taklit eder ve **güvenlik (Foreign Key) ilişkilerini** korur.

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
```

### C. API Testi ve Başlatma

Sunucuyu başlatın:

```bash
npm run dev
```

API endpoint'leri (JWT gerektirenler için geçerli bir kullanıcı ile login olmanız gerekir):

| Metot | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Yeni kullanıcı kaydı oluşturur. |
| `POST` | `/auth/login` | JWT alarak oturum açar. |
| `POST` | `/program/generate` | Program günlüklerini (30 günlük) oluşturur. |
| `GET` | `/programs` | Dummy program listesini getirir. |
| `PATCH` | `/workoutlog-exercise/:id/completed` | Egzersizi tamamlandı olarak işaretler (Durumunu değiştirir). |
