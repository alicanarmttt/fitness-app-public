import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom"; // Sayfalara link vermek için
import "../css/Info.css"; // Birazdan oluşturacağımız stil dosyası

function Info() {
  // Get user information from the Redux store
  const user = useSelector((state) => state.auth.user);

  return (
    <div className="info-page">
      <header className="info-header">
        <h1>
          Welcome to Your Fitness Journey, {user ? user.email : "Athlete"}!
        </h1>
        <p>
          This is your personal command center for reaching your goals. Here's
          what you can do:
        </p>
      </header>

      <div className="info-grid">
        {/* --- Create Program Card --- */}
        <div className="info-card">
          <div className="info-card__icon">🏋️‍♂️</div>
          <h2 className="info-card__title">Create Your Program</h2>
          <p className="info-card__description">
            Design your own weekly training plan. Choose your days, add custom
            exercises, and set the sets and reps to create a template that's
            uniquely yours.
          </p>
          <Link to="/create-program" className="info-card__link">
            Go to Your Program →
          </Link>
        </div>

        {/* --- Calendar Card --- */}
        <div className="info-card">
          <div className="info-card__icon">📅</div>
          <h2 className="info-card__title">
            See Your Workouts on the Calendar
          </h2>
          <p className="info-card__description">
            Once your program is saved, all your workouts for the next 30 days
            are automatically added to your calendar. Mark completed exercises
            and track your progress day by day!
          </p>
          <Link to="/calendar" className="info-card__link">
            View Calendar →
          </Link>
        </div>

        {/* --- Analysis Card --- */}
        <div className="info-card">
          <div className="info-card__icon">📊</div>
          <h2 className="info-card__title">Analyze Your Progress</h2>
          <p className="info-card__description">
            In this section, you can see how much volume you're producing in
            your workouts, broken down by muscle group.
          </p>
          <div className="info-card__advantage">
            <strong>So, what's the benefit?</strong>
            <p>
              This analysis is the key to your progress. It allows you to
              clearly see which muscle groups need more focus and which areas
              you might be neglecting. You can use this data to optimize your
              workouts for balanced growth and to break through plateaus.
            </p>
          </div>
          <Link to="/analysis" className="info-card__link">
            Go to Analysis →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Info;
