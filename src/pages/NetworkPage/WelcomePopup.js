// import React from 'react';

// const WelcomePopup = ({ onClose }) => {
//   return (
//     <>
      
// <style>{`
//         .popup-overlay {
//           position: fixed;
//           inset: 0;
//           display: flex;
//           justify-content: center;
//           align-items: center;
//           background: rgba(0, 0, 0, 0.5);
//           z-index: 999;
//         }
//         .popup-container {
//           background: #fff;
//           padding: 24px;
//           border-radius: 16px;
//           width: 320px;
//           text-align: center;
//           box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
//           position: relative;
//           animation: fadeInScale 0.3s ease;
//         }
//         .close-button {
//           position: absolute;
//           top: 8px;
//           right: 12px;
//           background: transparent;
//           border: none;
//           font-size: 24px;
//           cursor: pointer;
//           color: #666;
//         }
//         .close-button:hover {
//           color: #000;
//         }
//         .points-text {
//           font-weight: bold;
//           color: #16a34a;
//         }
//         @keyframes fadeInScale {
//           from {
//             opacity: 0;
//             transform: scale(0.9);
//           }
//           to {
//             opacity: 1;
//             transform: scale(1);
//           }
//         }
//       `}</style>
//       <div className="popup-overlay">
//         <div className="popup-container">
//           <button onClick={onClose} className="close-button">×</button>
//           <h2>Welcome to Web3Today News</h2>
//           <p>You got <span className="points-text">50 points</span> 🎉</p>
//         </div>
//       </div>
//     </>
//   );
// };

// export default WelcomePopup;


import React from 'react';

const WelcomePopup = ({ onClose }) => {
  return (
    <>
      <style>{`
        .popup-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          background: rgba(49, 46, 129, 0.18); /* Softer indigo overlay */
        }
        .popup-container {
          background: linear-gradient(120deg, #f3e8ff 0%, #e0e7ff 100%);
          padding: 20px 18px 18px 18px;
          border-radius: 18px;
          width: 300px;
          min-height: 180px;
          text-align: center;
          box-shadow: 0 4px 20px 0 rgba(76,0,130,0.10), 0 1.5px 8px 0 #a21caf22;
          position: relative;
          animation: fadeInScale 0.3s cubic-bezier(.4,2,.6,1);
        }
        .close-button {
          position: absolute;
          top: 8px;
          right: 12px;
          background: transparent;
          border: none;
          font-size: 22px;
          cursor: pointer;
          color: #a21caf;
          transition: color 0.2s;
        }
        .close-button:hover {
          color: #312e81;
        }
        .popup-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #a21caf;
          margin-bottom: 0.2rem;
          letter-spacing: -0.5px;
        }
        .popup-subtitle {
          font-size: 0.98rem;
          color: #312e81;
          margin-bottom: 0.7rem;
          font-weight: 500;
        }
        .points-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: linear-gradient(90deg, #f59e42 0%, #fbbf24 100%);
          color: #fff;
          font-weight: 700;
          font-size: 1.05rem;
          border-radius: 999px;
          padding: 0.32rem 0.9rem;
          margin-bottom: 0.7rem;
          box-shadow: 0 1px 4px #fbbf2422;
        }
        .celebrate-emoji {
          font-size: 1.3rem;
          margin-left: 0.2rem;
        }
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      <div className="popup-overlay">
        <div className="popup-container">
          <button onClick={onClose} className="close-button" aria-label="Close">&times;</button>
          <div className="popup-title">Welcome to Web3Today!</div>
          <div className="popup-subtitle">You joined via a referral 🎉</div>
          <div className="points-badge">
            +100 Points <span className="celebrate-emoji">✨</span>
          </div>
          <div style={{ color: "#6d28d9", fontWeight: 500, fontSize: "0.95rem" }}>
            Enjoy your bonus and start exploring!
          </div>
        </div>
      </div>
    </>
  );
};

export default WelcomePopup;