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
  const [tasks, setTasks] = useState([]);
  const [userTasks, setUserTasks] = useState({});

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

  // Global Listener for Tasks (Static/Admin data)
  useEffect(() => {
    const tasksRef = ref(database, "tasks");
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Flatten logic
        const tasksArray = Object.entries(data).flatMap(([category, categoryTasks]) => {
          if (!categoryTasks || typeof categoryTasks !== 'object') return [];
          return Object.entries(categoryTasks).map(([key, task]) => ({
            ...task,
            id: task.id || key,
            category: task.category || category
          }));
        });
        setTasks(tasksArray);
      } else {
        setTasks([]);
      }
    });
    return () => off(tasksRef, "value", unsubscribe);
  }, []);

  // Listener for User's Tasks/Scores status
  useEffect(() => {
    if (!user.id) return;

    const scoreRef = ref(database, `users/${user.id}/Score`);
    const userTasksRef = ref(database, `connections/${user.id}`);

    // Listen for real-time scores updates
    const unsubScore = onValue(scoreRef, (snapshot) => {
      if (snapshot.exists()) {
        setScores(snapshot.val());
      } else {
        setScores(null);
      }
    });

    // Listen for real-time task status updates
    const unsubUserTasks = onValue(userTasksRef, (snapshot) => {
      setUserTasks(snapshot.exists() ? snapshot.val() : {});
    });

    // Cleanup function to remove listener when user.id changes or component unmounts
    return () => {
       off(scoreRef, "value", unsubScore);
       off(userTasksRef, "value", unsubUserTasks);
    };
  }, [user.id]);

  const value = useMemo(() => ({ user, scores, tasks, userTasks }), [user, scores, tasks, userTasks]);

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
