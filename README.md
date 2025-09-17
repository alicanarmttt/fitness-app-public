# Fitness Planner App

A full-stack fitness planner web application where users can create weekly workout programs, manage daily exercises, and track their progress. The app features a dynamic calendar, CRUD operations, and SQL database integration.

## Features

- **Create Weekly Programs:** Add a training program for any day of the week (Monday–Sunday).
- **Dynamic Exercises:** Add, update, or remove exercises (with name, sets, reps, muscle group).
- <img width="1919" height="867" alt="image" src="https://github.com/user-attachments/assets/432113ad-eacd-43e8-bc94-533ebe452fdb" />
- **Calendar View:** Visualize your weekly routine with a calendar. Workout days are highlighted, and you can check off completed exercises.
- <img width="1919" height="869" alt="image" src="https://github.com/user-attachments/assets/6827fbe4-66bc-4a03-b223-64e86a654f16" />

## **Analysis Page:**

- Weekly and monthly total sets/reps analysis
- Distribution and ranking by muscle groups
- Program consistency and completion rate
- Best streak and current streak tracking
- Goal comparison (e.g., 50 chest sets per week)
- Average training intensity (based on sets/reps)
- <img width="1909" height="856" alt="image" src="https://github.com/user-attachments/assets/aadfbb72-5f63-4818-96d3-29dd02052f73" />

- **Track Completion:** Mark exercises as completed, and analyze your consistency.
- **Data Persistence:** All data is stored securely in a SQL Server database.
- **Edit & Delete:** Update or remove day programs and exercises easily.
- **Responsive UI:** Clean, simple, and responsive interface with React, Redux, and Bootstrap.

## Technologies

- **Frontend:** React, Redux Toolkit, React Calendar, Bootstrap, CSS Modules
- **Backend:** Node.js, Express.js
- **Database:** Microsoft SQL Server
- **Other:** RESTful API, async/await, form validation

---

## 🛠️ Kurulum ve Dummy Tablolar

Bu repo **public demo** versiyonudur. Gerçek veritabanı tabloları yerine **dummy tablolar** kullanır. Kod yapısı ve API endpoint’leri gerçeğe uygundur, ancak güvenlik ve gizlilik amacıyla tablo adları ve örnek veriler değiştirilmiştir.

### .env Dosyası

Backend için `.env` dosyanızı oluşturun:

PORT=5000  
DB_USER=sa  
DB_PASSWORD=yourStrong(!)Password  
DB_SERVER=localhost  
DB_DATABASE=fitness_demo  
DB_PORT=1433

Örnek dosya: [fitness-backend/.env.example](./fitness-backend/.env.example)

### MSSQL Dummy Tabloları

Aşağıdaki scripti çalıştırarak dummy tabloları oluşturabilirsiniz:

CREATE TABLE SampleDayPrograms (  
 id INT IDENTITY(1,1) PRIMARY KEY,  
 day VARCHAR(20) NOT NULL,  
 isLocked BIT NOT NULL  
);

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
 exercise_id INT NOT NULL,  
 exercise_name VARCHAR(50) NOT NULL,  
 sets INT,  
 reps INT,  
 muscle VARCHAR(30),  
 isCompleted BIT DEFAULT 0  
);

### API Testi

Sunucuyu başlatın:

cd fitness-backend  
npm install  
npm run dev

Postman veya benzeri bir araç ile şu endpoint’leri test edebilirsiniz:

- GET /programs → Dummy day programs listesini getirir
- POST /programs → Yeni program ekler
- PUT /programs/:id → Programı günceller
- PATCH /workoutlog-exercise/:id/completed → Egzersizi tamamlandı olarak işaretler
- POST /workoutlog/generate → Dummy log üretir (30 günlük)
