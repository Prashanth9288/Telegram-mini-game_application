import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  Award,
  Zap,
  Users,
  Wallet,
  CheckSquare,
  BookOpen,
  PlayCircle,
  Send,
  Twitter,
  X,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Progress } from "../../components/ui/progress.js";
import { useTelegram } from "../../reactContext/TelegramContext";
import { useReferral } from "../../reactContext/ReferralContext";
import { useNavigate } from "react-router-dom";
import { database } from "../../services/FirebaseConfig";
import { ref, onValue, runTransaction, update } from "firebase/database";
import { addHistoryLog } from "../../services/addHistory.js";

const BOT_TOKEN = "8369156712:AAE8I8h8G8hfZxCITX7wJAkNU89KEw4t1MI";
export default function TasksPage() {
  const { user, scores } = useTelegram();
  const { invitedFriends } = useReferral();
  const [tasks, setTasks] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const navigate = useNavigate();

  const [buttonText, setButtonText] = useState({});
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoTimer, setVideoTimer] = useState(0);

  const [activeTaskId, setActiveTaskId] = useState(null);
  // const [click, setClick] = useState({}); // Removed unused state

  useEffect(() => {
    let interval;
    if (selectedVideo && videoTimer > 0) {
      interval = setInterval(() => {
        setVideoTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [selectedVideo, videoTimer]);

  const [userTasks, setUserTasks] = useState({});
  const [gameCompleted, setGameCompleted] = useState(false);
  const [newsCount, setnewsCount] = useState(0);
  const [localScores, setLocalScores] = useState(null);
  const [weeklyProgressData, setWeeklyProgressData] = useState(null);

  const userId = user.id;

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameWeek = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    // Same week check (reset on Monday)
    const day = today.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1; // Days since last Monday
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - diffToMonday);
    return date >= startOfWeek;
  };

  const isTaskDone = (task) => {
    const { id, type, category } = task;

    // CRITICAL FIX: For daily tasks, ONLY check the daily folder.
    // Ignore root `userTasks[id]` because old legacy data might exist there that never gets wiped.
    let status;
    if (category === "daily") {
      status = userTasks.tasks?.daily?.[id];
    } else {
      // For standard tasks, check root. Fallback to daily just in case.
      status = userTasks[id] || userTasks.tasks?.daily?.[id];
    }

    if (status === undefined || status === null || status === false)
      return false;

    // Video Task Logic: Check for Admin updates (Video URL Change)
    if (type === "watch") {
      const currentVideoUrl = task.videoUrl || task.url;
      // If we have a claimed status record
      if (status && typeof status === "object" && status.videoUrl) {
        // If the video URL has changed since we claimed it, it's NOT done (User can watch again)
        if (status.videoUrl !== currentVideoUrl) return false;
      }
      // Legacy handling or standard boolean status
      return !!status;
    }

    const RESET_TYPES = ["game", "news", "partnership", "referral"];
    if (RESET_TYPES.includes(type)) {
      // Legacy 'true' means old data -> Expired/Reset
      if (status === true) return false;

      if (typeof status === "object" && status.lastClaimed) {
        // Double check date, though App.js should wipe it.
        return isToday(status.lastClaimed);
      }
      return false;
    }

    // Default: Permanent completion for other tasks
    return true;
  };

  useEffect(() => {
    const tasksRef = ref(database, "tasks");
    const gameTaskRef = ref(
      database,
      `connections/${user.id}/tasks/daily/game`,
    );
    const newsRef = ref(database, `connections/${user.id}/tasks/daily/news`);
    const userTasksRef = ref(database, `connections/${user.id}`);
    const userScoreRef = ref(database, `users/${user.id}/Score`);
    const weeklyProgressRef = ref(database, `users/${user.id}/weekly_progress`);

    const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
      // Logic from lines 52-62
      if (snapshot.exists()) {
        const data = snapshot.val();
        const tasksArray = Object.entries(data).flatMap(
          ([category, categoryTasks]) => {
            if (!categoryTasks || typeof categoryTasks !== "object") return [];
            return Object.entries(categoryTasks).map(([key, task]) => ({
              ...task,
              id: task.id || key, // Ensure ID exists
              category: task.category || category, // Fallback to folder name if category property is missing
            }));
          },
        );
        setTasks(tasksArray);
      } else {
        setTasks([]);
      }
    });

    const unsubscribeGame = onValue(gameTaskRef, (snapshot) => {
      setGameCompleted(snapshot.val() === true);
    });

    const unsubscribeNews = onValue(newsRef, (snapshot) => {
      setnewsCount(
        snapshot.exists() ? Object.keys(snapshot.val() || {}).length : 0,
      );
    });

    const unsubscribeUserTasks = onValue(userTasksRef, (snapshot) => {
      setUserTasks(snapshot.exists() ? snapshot.val() : {});
    });

    const unsubscribeScores = onValue(userScoreRef, (snapshot) => {
      if (snapshot.exists()) {
        setLocalScores(snapshot.val());
      }
    });

    const unsubscribeWeekly = onValue(weeklyProgressRef, (snapshot) => {
      if (snapshot.exists()) {
        // Map this to a local state if needed, or we just rely on it updating 'scores' if we put it there?
        // Actually, we calculate 'weeklyPoints' later. Ideally we just store this data.
        // Let's assume we might need a state for it.
        setWeeklyProgressData(snapshot.val());
      }
    });

    return () => {
      unsubscribeTasks();
      unsubscribeGame();
      unsubscribeNews();
      unsubscribeUserTasks();
      unsubscribeScores();
      unsubscribeWeekly();
    };
  }, [user.id]);

  // Use localScores for real-time updates, fallback to context
  const scoreData = localScores || scores;
  const displayTaskScore = isToday(scoreData?.task_updated_at)
    ? scoreData?.task_score || 0
    : 0;

  const IconMap = useMemo(
    () => ({
      Zap: <Zap className="h-5 w-5 text-indigo-300" />,
      Award: <Award className="h-5 w-5 text-pink-300" />,
      Users: <Users className="h-5 w-5 text-amber-300" />,
      CheckSquare: <CheckSquare className="h-5 w-5 text-emerald-300" />,
      Wallet: <Wallet className="h-5 w-5 text-blue-300" />,
      BookOpen: <BookOpen className="h-5 w-5 text-blue-300" />,
      PlayCircle: <PlayCircle className="h-5 w-5 text-purple-300" />,
      Send: <Send className="h-5 w-5 text-blue-400" />,
      Twitter: <Twitter className="h-5 w-5 text-sky-400" />,
    }),
    [],
  );

  // Use `points` as primary reward â€” fallback to `score`, then 100
  // Use `points` as primary reward â€” fallback to `score`, then 100
  // Updated Weekly Logic: Use 'current_week_days' from our new tracker
  const weeklyDaysCompleted = weeklyProgressData?.current_week_days || 0;

  // Wrap mapTask in useCallback to be stable for useMemo
  const mapTask = useCallback(
    (task) => {
      // Check points, then score, then default to 100
      // Ensure it's treated as a number
      const rawReward =
        task.points !== undefined
          ? task.points
          : task.score !== undefined
            ? task.score
            : 100;
      const reward = Number(rawReward) || 0;

      // Normalize icon key to handle case sensitivity (e.g., "users" -> "Users")
      const iconKey =
        typeof task.icon === "string"
          ? Object.keys(IconMap).find(
              (k) => k.toLowerCase() === task.icon.toLowerCase(),
            )
          : null;

      let completedVal = task.completed || 0;
      // Map specific dynamic progress
      if (task.title && task.title.toLowerCase().includes("news")) {
        completedVal = newsCount;
      } else if (
        task.title &&
        task.title.toLowerCase().includes("daily tasks")
      ) {
        // 7-day streak task
        completedVal = weeklyDaysCompleted;
      } else if (
        task.title &&
        (task.title.toLowerCase().includes("invite") ||
          task.title.toLowerCase().includes("refer"))
      ) {
        // FORCE 'daily' category for generic "Refer a Friend" tasks to ensure strict daily reset logic applies
        task.category = "daily";

        if (task.category === "daily") {
          completedVal = invitedFriends
            ? invitedFriends.filter((f) => isToday(f.referralDate)).length
            : 0;
        } else {
          completedVal = invitedFriends ? invitedFriends.length : 0;
        }
      } else if (task.title && task.title.toLowerCase().includes("points")) {
        // 500 points task - Ensure we use the weeklyPoints logic (which draws from scoreData.weekly_points)
        // scoreData is 'localScores' which we update in the transaction now.
        completedVal = isSameWeek(scoreData?.weekly_updated_at)
          ? scoreData?.weekly_points || 0
          : 0;
      }

      return {
        ...task,
        category:
          task.title &&
          (task.title.toLowerCase().includes("invite") ||
            task.title.toLowerCase().includes("refer"))
            ? "daily"
            : task.category || "standard",
        type:
          task.title && task.title.toLowerCase().includes("news")
            ? "news"
            : task.title &&
                (task.title.toLowerCase().includes("invite") ||
                  task.title.toLowerCase().includes("refer"))
              ? "referral"
              : task.type,
        points: reward, // Normalize to `points` for consistency
        completed: completedVal,
        icon: iconKey
          ? IconMap[iconKey]
          : IconMap["Zap"] || <Zap className="h-5 w-5 text-indigo-300" />,
        iconBg: task.iconBg || "bg-indigo-500/30",
      };
    },
    [newsCount, weeklyDaysCompleted, invitedFriends, scoreData, IconMap],
  );

  const processedTasks = useMemo(() => tasks.map(mapTask), [tasks, mapTask]);

  const dailyTasks = processedTasks.filter(
    (task) =>
      (task.category === "daily" ||
        task.category === "standard" ||
        (!task.category && !["weekly", "achievements"].includes(task.type))) &&
      task.type !== "social" &&
      !(task.type === "watch" && isTaskDone(task)),
  );
  const weeklyTasks = processedTasks.filter(
    (task) => task.category === "weekly",
  );
  const achievements = processedTasks.filter(
    (task) => task.category === "achievements",
  );

  const fetchChatMember = async (chatId, userId) => {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`,
      );
      const data = await response.json();
      return data.ok ? data.result : null;
    } catch (err) {
      console.error("API Request Failed:", err);
      return null;
    }
  };

  const handleChatId = async (url) => {
    if (!url) return { chatId: null };
    try {
      // Extract username from t.me/username or telegram.me/username
      // Handle both simple usernames and joinchat links (though joinchat is harder, usually public channels use username)
      const match = url.match(/(?:t\.me|telegram\.me)\/([^/?]+)/);
      if (match && match[1]) {
        // If it's a join link (starts with +), we technically can't check via API easily without user ID being known to bot in that chat
        // But for public channels @username works.
        return { chatId: `@${match[1]}` };
      }
      return { chatId: null };
    } catch (err) {
      console.error("Error parsing chat ID:", err);
      return { chatId: null };
    }
  };

  const startMembershipCheck = async (taskId, chatId) => {
    let checkCount = 0;
    const interval = setInterval(async () => {
      checkCount += 1;
      if (!chatId) {
        setButtonText((prev) => ({ ...prev, [taskId]: "Failed" }));
        clearInterval(interval);
        return;
      }

      const chatMember = await fetchChatMember(chatId, user.id);
      if (!chatMember || !chatMember.status) {
        // converting @username to id might fail if bot isn't admin or channel is private
        // But for public channels it should work if bot is just added
        // If failed, maybe keep trying or just fail?
        // Failing fast is better than hanging.
        // Actually, if bot hasn't seen the chat, it returns 400.
        // so chatMember will be null.
        // We act as if failed.
        // setButtonText(prev => ({ ...prev, [taskId]: "Failed" }));
        // clearInterval(interval);
        // return;
        // Wait, maybe loop a few times incase of network glitch?
      }

      if (chatMember && chatMember.status) {
        const { status } = chatMember;
        const isMember = ["member", "administrator", "creator"].includes(
          status,
        );

        if (isMember) {
          const userTasksRef = ref(database, `connections/${user.id}`);
          await update(userTasksRef, { [taskId]: false });
          setButtonText((prev) => ({ ...prev, [taskId]: "Claim" }));
          clearInterval(interval);
          return;
        }
      } else {
        // If chatMember is null (API error), we count it as a fail or just wait?
      }

      // Update text to "Checking..." is already set.

      if (checkCount >= 100) {
        setButtonText((prev) => ({ ...prev, [taskId]: "Failed" }));
        clearInterval(interval);
      }
    }, 3000);
  };

  /*
   * CRITICALLY OPTIMIZED handleTitle
   * Uses Transactions for Atomic Score Updates
   * Handles Weekly Progress Tracking
   * Manages Video URL Versioning
   */
  const handleTitle = async (task, taskId) => {
    const clickBtn = document.getElementById(`clickBtn${taskId}`);
    const currentText = buttonText[taskId] || "Start Task";

    // UI Feedback Helper
    const setBtnLoading = () =>
      setButtonText((prev) => ({ ...prev, [taskId]: "Processing..." }));
    const setBtnFailed = () => {
      setButtonText((prev) => ({ ...prev, [taskId]: "Failed" }));
      setTimeout(
        () => setButtonText((prev) => ({ ...prev, [taskId]: "Try Again" })),
        2000,
      );
    };

    // --- SHARED CLAIM LOGIC START ---
    const executeClaim = async (taskObj, extraData = {}) => {
      setBtnLoading();
      try {
        const taskPoints = Number(taskObj.points) || 0;

        // 1. Transactional Score Update (Prevents Race Conditions)
        const userScoreRef = ref(database, `users/${user.id}/Score`);
        const scoreTransactionResult = await runTransaction(
          userScoreRef,
          (currentScoreData) => {
            if (!currentScoreData) {
              return {
                task_score: taskPoints,
                total_score: taskPoints,
                weekly_points: taskPoints,
                weekly_updated_at: Date.now(),
                task_updated_at: Date.now(),
                farming_score: 0,
                game_score: 0,
                network_score: 0,
                news_score: 0,
              };
            }

            // Calculate new totals safely
            const new_task_score =
              (Number(currentScoreData.task_score) || 0) + taskPoints;
            const new_total_score =
              (Number(currentScoreData.farming_score) || 0) +
              (Number(currentScoreData.game_score) || 0) +
              (Number(currentScoreData.network_score) || 0) +
              (Number(currentScoreData.news_score) || 0) +
              new_task_score;

            // Weekly Points Logic (with Reset)
            let new_weekly_points = Number(currentScoreData.weekly_points) || 0;
            if (isSameWeek(currentScoreData.weekly_updated_at)) {
              new_weekly_points += taskPoints;
            } else {
              new_weekly_points = taskPoints; // Reset for new week
            }

            return {
              ...currentScoreData,
              task_score: new_task_score,
              total_score: new_total_score,
              weekly_points: new_weekly_points,
              weekly_updated_at: Date.now(), // Always update timestamp to keep it fresh
              task_updated_at: Date.now(),
            };
          },
        );

        if (scoreTransactionResult.committed) {
          // 2. Update Task Status (Atomic per user action)
          // Store specific data like videoUrl to handle Admin updates
          const claimData = {
            lastClaimed: Date.now(),
            ...extraData,
          };

          // Store in daily folder IF it's a daily task, ensuring auto-reset works
          const claimPath =
            taskObj.category === "daily"
              ? `connections/${user.id}/tasks/daily/${taskId}`
              : `connections/${user.id}/${taskId}`;

          await update(ref(database, claimPath), claimData);

          // Reset game task completed status after claiming to ensure daily cycle works properly
          if (taskObj.type === "game") {
            await update(ref(database, `connections/${user.id}/tasks/daily`), {
              game: false,
            });
          }

          // 3. Weekly Progress Logic
          // Check if this was a Daily Task and if we finished the day
          if (
            taskObj.category === "daily" ||
            taskObj.type === "news" ||
            taskObj.type === "game" ||
            taskObj.type === "watch"
          ) {
            // Optimization: We verify client-side first to avoid spamming transactions
            // Filter *all* daily tasks from our local 'tasks' state
            const currentDailyTasks = tasks.filter(
              (t) =>
                t.category === "daily" ||
                t.type === "game" ||
                t.type === "news",
            );

            // Check if ALL are done (including the one we just claimed)
            // We pass the new status for *this* task explicitly to the checker helper logic or just rely on 'userTasks' locally updated?
            // React state 'userTasks' won't be updated yet. We need to be careful.
            const allDone = currentDailyTasks.every((t) => {
              if (t.id === taskId) return true; // Optimistically assume this one is done
              return isTaskDone(t);
            });

            if (allDone) {
              // Check and increment weekly progress transactionally
              const weeklyRef = ref(
                database,
                `users/${user.id}/weekly_progress`,
              );
              await runTransaction(weeklyRef, (currentWeekly) => {
                const now = new Date();
                // Simple date string for unique day check
                const todayStr = now.toISOString().split("T")[0];

                if (!currentWeekly) {
                  return {
                    current_week_days: 1,
                    last_completed_date: todayStr,
                  };
                }

                // If already incremented for today, ignore
                if (currentWeekly.last_completed_date === todayStr) {
                  return currentWeekly; // No change
                }

                // Check for Week Reset
                // If the last completion was NOT in the same week, reset count to 1
                // Note: We use 'last_completed_date' as the reference point
                let newDays;
                if (isSameWeek(currentWeekly.last_completed_date)) {
                  newDays = (currentWeekly.current_week_days || 0) + 1;
                } else {
                  newDays = 1; // New Week -> First day completed
                }

                return {
                  ...currentWeekly,
                  current_week_days: Math.min(newDays, 7),
                  last_completed_date: todayStr,
                };
              });
            }
          }

          // History Log
          addHistoryLog(userId, {
            action: `Task Reward: ${taskObj.title}`,
            points: taskPoints,
            type: taskObj.type || "task",
          });

          if (clickBtn) clickBtn.style.display = "none";
        } else {
          throw new Error("Transaction failed");
        }
      } catch (error) {
        console.error("Claim Error:", error);
        setBtnFailed();
      }
    };
    // --- SHARED CLAIM LOGIC END ---

    switch (task.type?.toLowerCase()) {
      case "watch":
        // For Watch tasks, we check if we need to show the video
        // Status check: If not done OR text is "Start Task"/"Join Again"
        // Also if we have a mismatch videoUrl, isTaskDone returns false, so we enter here.
        if (
          ["Start Task", "Join Again"].includes(currentText) &&
          !isTaskDone(task)
        ) {
          // Open Video Modal
          const videoUrl = task.videoUrl || task.url;
          if (videoUrl) {
            setSelectedVideo(videoUrl);
            setVideoTimer(30);
            setActiveTaskId(taskId);
          }
        } else if (!isTaskDone(task) || currentText === "Claim") {
          // Pass videoUrl to be stored in the claim record
          executeClaim(task, { videoUrl: task.videoUrl || task.url });
        }
        break;

      case "social":
        // setClick(prev => ({ ...prev, [task.title]: true }));
        if (["Start Task", "Join Again", "Failed"].includes(currentText)) {
          setButtonText((prev) => ({ ...prev, [taskId]: "Checking..." }));
          window.open(task.url, "_blank");
          const { chatId } = await handleChatId(task.url);
          startMembershipCheck(taskId, chatId);
        } else if (currentText === "Claim" && !isTaskDone(task)) {
          executeClaim(task);
        }
        break;

      case "partnership":
        navigate("/network");
        break;

      case "misc":
        window.open(task.url, "_blank");
        break;

      case "game":
        // Check if game is completed or explicitly ready to claim
        if (
          gameCompleted ||
          userTasks[taskId] === false ||
          currentText === "Claim"
        ) {
          executeClaim(task);
        } else {
          // OPTIMIZATION: Immediate navigation
          setTimeout(() => navigate("/game"), 0);
        }
        break;

      case "news":
        // If task is not done, check if we can claim or need to navigate
        if (!isTaskDone(task)) {
          // Check if ready to claim (e.g. read 5 news)
          // Hardcoded 5 matching the logic user requested/implied
          if (newsCount >= 5) {
            executeClaim(task);
          } else {
            // Not enough news read -> Navigate
            setTimeout(() => navigate("/news"), 0);
          }
        } else {
          // Already done, just navigate for review
          setTimeout(() => navigate("/news"), 0);
        }
        break;

      case "referral":
        // Logic for Referral Claim
        if (!isTaskDone(task)) {
          if (task.completed >= task.total) {
            executeClaim(task);
          } else {
            // Navigate to invite page if not enough referrals
            setTimeout(() => navigate("/network"), 0);
          }
        }
        break;

      case "weekly":
        if (!isTaskDone(task)) {
          if (task.completed >= task.total) {
            executeClaim(task);
          } else {
            // Visual feedback that it's not ready
            const updatedButtonTexts = { ...buttonText };
            updatedButtonTexts[taskId] = "In Progress";
            setButtonText(updatedButtonTexts);
            setTimeout(() => {
              setButtonText((prev) => {
                const next = { ...prev };
                delete next[taskId]; // Reset to default
                return next;
              });
            }, 1000);
          }
        }
        break;

      default:
        // No action for unknown types
        break;
    }
  };

  const filterTasks =
    filterType === "all"
      ? processedTasks
      : processedTasks.filter((task) => task.type === filterType);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-indigo-600/90 via-purple-600/80 to-pink-600/90">
      {/* Background SVGs unchanged */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-purple-600/80 to-pink-600/90 z-0">
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="smallGrid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                  opacity="0.5"
                />
              </pattern>
              <pattern
                id="grid"
                width="80"
                height="80"
                patternUnits="userSpaceOnUse"
              >
                <rect width="80" height="80" fill="url(#smallGrid)" />
                <path
                  d="M 80 0 L 0 0 0 80"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                  opacity="0.8"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        {/* Floating shapes (unchanged) */}
        <div className="absolute top-[10%] left-[20%] w-20 h-20 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-20 blur-xl animate-float"></div>
        <div className="absolute top-[60%] right-[15%] w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 opacity-20 blur-xl animate-float-delayed"></div>
        <div className="absolute bottom-[20%] left-[30%] w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-400 opacity-20 blur-xl animate-float-slow"></div>
        <div className="absolute inset-0 opacity-30">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            {[...Array(8)].map((_, i) => (
              <path
                key={i}
                d={`M0,${100 + i * 100} C150,${50 + i * 100} 250,${150 + i * 100} 400,${100 + i * 100}`}
                stroke="white"
                strokeWidth="0.5"
                fill="none"
              />
            ))}
          </svg>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden z-10">
        <header className="sticky top-0 z-10 bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-white hover:bg-white/10"
                onClick={() => navigate("/")}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-white">Tasks</h1>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm text-white">
                {displayTaskScore}
              </span>
              <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-white/80">
                  Your Task Score
                </h3>
                <p className="text-2xl font-bold text-white">
                  {displayTaskScore} <span className="text-amber-300">XP</span>
                </p>
              </div>
              <div className="bg-white/10 rounded-full p-3">
                <CheckSquare className="h-6 w-6 text-amber-300" />
              </div>
            </div>
          </div>

          <Tabs defaultValue="daily" className="mb-6">
            <TabsList className="flex gap-4 bg-white/10 p-0.5 overflow-auto scroll-hidden">
              {[
                "daily",
                "weekly",
                "achievements",
                "all",
                "watch",
                "social",
                "partnership",
                "misc",
              ].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="data-[state=active]:bg-white/20 text-white"
                  onClick={() => {
                    if (
                      [
                        "all",
                        "watch",
                        "social",
                        "partnership",
                        "misc",
                      ].includes(tab)
                    ) {
                      setFilterType(tab);
                    }
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="daily" className="mt-4 space-y-3">
              {dailyTasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-none shadow-md bg-white/10 backdrop-blur-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`${task.iconBg} p-2 rounded-full mt-1`}>
                        {task.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">
                              {task.title}
                            </h3>
                            <div className="flex flex-col">
                              <p className="text-xs text-white/70 mt-1">
                                {task.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <Badge className="bg-amber-500/90 whitespace-nowrap">
                              +{task.points} XP
                            </Badge>
                            <button
                              className={`rounded text-white text-sm px-2 py-1 mt-1 whitespace-nowrap ${isTaskDone(task) && task.type !== "partnership" && task.type !== "social" ? "bg-gray-500 cursor-not-allowed" : "bg-violet-500 hover:bg-violet-700"}`}
                              id={`clickBtn${task.id}`}
                              disabled={
                                isTaskDone(task) &&
                                task.type !== "partnership" &&
                                task.type !== "social"
                              }
                              onClick={() => handleTitle(task, task.id)}
                            >
                              {isTaskDone(task)
                                ? task.type === "partnership" ||
                                  task.type === "social"
                                  ? "Open"
                                  : "Done"
                                : (userTasks[task.id] === false &&
                                      (task.type !== "news" ||
                                        newsCount >= 5)) ||
                                    (task.type === "weekly" &&
                                      task.completed >= task.total) ||
                                    ((task.type === "referral" ||
                                      task.category === "daily") &&
                                      task.completed >= task.total)
                                  ? "Claim"
                                  : buttonText[task.id] || "Start Task"}
                            </button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-white/70 mb-1">
                            <span>Progress</span>
                            <span>
                              {(task.type === "game" && gameCompleted) ||
                              isTaskDone(task)
                                ? task.total
                                : task.completed}
                              /{task.total}
                            </span>
                          </div>
                          <Progress
                            value={
                              task.type === "game" && gameCompleted
                                ? 100
                                : isTaskDone(task)
                                  ? 100
                                  : (task.completed / task.total) * 100
                            }
                            className="h-1.5 bg-white/10"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="weekly" className="mt-4 space-y-3">
              {weeklyTasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-none shadow-md bg-white/10 backdrop-blur-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`${task.iconBg} p-2 rounded-full mt-1`}>
                        {task.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">
                              {task.title}
                            </h3>
                            <p className="text-xs text-white/70 mt-1">
                              {task.description}
                            </p>
                          </div>
                          <Badge className="bg-amber-500/90">
                            +{task.points} XP
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-white/70 mb-1">
                            <span>Progress</span>
                            <span>
                              {(task.type === "game" && gameCompleted) ||
                              isTaskDone(task)
                                ? task.total
                                : task.completed}
                              /{task.total}
                            </span>
                          </div>
                          <Progress
                            value={
                              isTaskDone(task)
                                ? 100
                                : (task.completed / task.total) * 100
                            }
                            className="h-1.5 bg-white/10"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="achievements" className="mt-4 space-y-3">
              {achievements.map((task) => (
                <Card
                  key={task.id}
                  className="border-none shadow-md bg-white/10 backdrop-blur-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`${task.iconBg} p-2 rounded-full mt-1`}>
                        {task.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">
                              {task.title}
                            </h3>
                            <p className="text-xs text-white/70 mt-1">
                              {task.description}
                            </p>
                          </div>
                          <Badge className="bg-amber-500/90">
                            +{task.points} XP
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-white/70 mb-1">
                            <span>Progress</span>
                            <span>
                              {(task.type === "game" && gameCompleted) ||
                              isTaskDone(task)
                                ? task.total
                                : task.completed}
                              /{task.total}
                            </span>
                          </div>
                          <Progress
                            value={(task.completed / task.total) * 100}
                            className="h-1.5 bg-white/10"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value={filterType} className="mt-4 space-y-3">
              {filterTasks.map((task) => {
                const taskId = task.id;
                return (
                  <Card
                    key={task.id}
                    className="border-none shadow-md bg-white/10 backdrop-blur-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`${task.iconBg} p-2 rounded-full mt-1`}>
                          {task.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-white">
                                {task.title}
                              </h3>
                              <div className="flex flex-col">
                                <p className="text-xs text-white/70 mt-1">
                                  {task.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Badge className="bg-amber-500/90 whitespace-nowrap">
                                +{task.points} XP
                              </Badge>
                              <button
                                className={`rounded text-white text-sm px-2 py-1 mt-1 whitespace-nowrap ${isTaskDone(task) && task.type !== "partnership" && task.type !== "social" ? "bg-gray-500 cursor-not-allowed" : "bg-violet-500 hover:bg-violet-700"}`}
                                id={`clickBtn${taskId}`}
                                disabled={
                                  isTaskDone(task) &&
                                  task.type !== "partnership" &&
                                  task.type !== "social"
                                }
                                onClick={() => handleTitle(task, taskId)}
                              >
                                {isTaskDone(task)
                                  ? task.type === "partnership" ||
                                    task.type === "social"
                                    ? "Open"
                                    : "Done"
                                  : userTasks[taskId] === false ||
                                      (task.type === "weekly" &&
                                        task.completed >= task.total) ||
                                      (task.type === "game" && gameCompleted) ||
                                      ((task.type === "referral" ||
                                        task.category === "daily") &&
                                        task.completed >= task.total) ||
                                      (task.type === "news" && newsCount >= 5)
                                    ? "Claim"
                                    : buttonText[taskId] || "Start Task"}
                              </button>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-white/70 mb-1">
                              <span>Progress</span>
                              <span>
                                {(task.type === "game" && gameCompleted) ||
                                isTaskDone(task)
                                  ? task.total
                                  : task.completed}
                                /{task.total}
                              </span>
                            </div>
                            <Progress
                              value={
                                isTaskDone(task)
                                  ? 100
                                  : (task.completed / task.total) * 100
                              }
                              className="h-1.5 bg-white/10"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </main>
      </div>
      {/* Video Modal Popup */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden w-full max-w-2xl shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
              <h3 className="text-white font-medium">Watch Video</h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black relative">
              <iframe
                src={
                  selectedVideo.includes("youtube.com/watch?v=")
                    ? selectedVideo.replace("watch?v=", "embed/")
                    : selectedVideo
                }
                className="absolute inset-0 w-full h-full"
                title="Task Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="p-4 flex justify-between items-center bg-white/5">
              <div className="text-white/70 text-sm">
                {videoTimer > 0
                  ? `Reward available in ${videoTimer}s`
                  : "Review complete!"}
              </div>
              <button
                disabled={videoTimer > 0}
                onClick={async () => {
                  if (activeTaskId) {
                    const userTasksRef = ref(
                      database,
                      `connections/${user.id}`,
                    );
                    await update(userTasksRef, { [activeTaskId]: false });
                    setButtonText((prev) => ({
                      ...prev,
                      [activeTaskId]: "Claim",
                    }));
                  }
                  setSelectedVideo(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  videoTimer > 0
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {videoTimer > 0 ? `Wait ${videoTimer}s` : "Claim Reward"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
