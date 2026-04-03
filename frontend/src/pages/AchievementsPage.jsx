import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/achievements.css';

const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    fetchAchievements();
    fetchStreak();
  }, []);

  const fetchAchievements = async () => {
    try {
      const res = await api.get('/achievements');
      setAchievements(res.data);
    } catch (err) {
      console.error('Error fetching achievements:', err);
    }
  };

  const fetchStreak = async () => {
    try {
      const res = await api.get('/achievements/streak');
      setStreak(res.data);
    } catch (err) {
      console.error('Error fetching streak:', err);
    }
  };

  const achievementIcons = {
    streak: '🔥',
    budget_maintained: '💰',
    goal_reached: '🎉',
    money_saved: '💎'
  };

  return (
    <div className="achievements-container">
      <div className="streak-card">
        <h3>🔥 Current Streak</h3>
        <p className="streak-number">{streak.current}</p>
        <p>Longest Streak: {streak.longest} days</p>
      </div>

      <h2>🏆 Your Achievements</h2>
      
      <div className="achievements-grid">
        {achievements.length === 0 ? (
          <p className="empty-state">Keep tracking to unlock achievements!</p>
        ) : (
          achievements.map((ach, idx) => (
            <div key={idx} className="achievement-card">
              <div className="achievement-icon">{achievementIcons[ach.type]}</div>
              <h4>{ach.title}</h4>
              <p>{ach.description}</p>
              <p className="unlock-date">Unlocked: {new Date(ach.unlockedAt).toLocaleDateString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AchievementsPage;