import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { database } from "../services/FirebaseConfig.js";
import { ref, onValue, off } from "firebase/database";

const TelegramContext = createContext(null);

export const TelegramProvider = ({ children }) => {
  const [user, setUser] = useState({
    id: null,
    username: "Anonymous",
    photo_url: "",
  });

  const [scores, setScores] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {

      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();


      if (tg.initDataUnsafe?.user) {
        const { id, first_name, last_name, username, photo_url } = tg.initDataUnsafe.user;
        setUser({
          id: id || null,
          firstName: first_name || "",
          lastName: last_name || "",
          username: username || "", // The actual Telegram handle (no @)
          displayName: (first_name || "") + " " + (last_name || "") || username || "Anonymous",
          photo_url: photo_url || "",
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!user.id) return;

    const scoreRef = ref(database, `users/${user.id}/Score`);

    // Listen for real-time updates
    const unsubscribe = onValue(scoreRef, (snapshot) => {
      if (snapshot.exists()) {
        setScores(snapshot.val());
      } else {
        setScores(null);
      }
    });

    // Cleanup function to remove listener when user.id changes or component unmounts
    return () => off(scoreRef, "value", unsubscribe);
  }, [user.id]);

  const value = useMemo(() => ({ user, scores }), [user, scores]);

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
};

// Custom hook to use Telegram context
export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error("useTelegram must be used within a TelegramProvider");
  }
  return context;
};
