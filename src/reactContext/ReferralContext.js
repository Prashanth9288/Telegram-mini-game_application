// src/reactContext/ReferralContext.js

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from "react";

import { useTelegram } from "./TelegramContext.js";
import { database } from "../services/FirebaseConfig.js";
import {
  ref,
  get,
  update,
  onValue,
  runTransaction
} from "firebase/database";

const ReferralContext = createContext();
export const useReferral = () => useContext(ReferralContext);

export const ReferralProvider = ({ children }) => {
  const { user } = useTelegram();

  const [inviteLink, setInviteLink] = useState("");
  const [invitedFriends, setInvitedFriends] = useState([]);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  // ==============================
  // DEV MODE (TURN OFF IN PROD)
  // ==============================
  const DEV_FORCE_REFERRAL = false;
  const DEV_REFERRER_ID = "6743986736";

  // ======================================
  // SAFE SCORE UPDATE (FULL USER TXN)
  // ======================================
  const updateScores = useCallback(async (userId, amount) => {
    const userRef = ref(database, `users/${userId}`);

    await runTransaction(userRef, (data) => {
      if (!data) return data;

      if (!data.Score) {
        data.Score = {
          farming_score: 0,
          network_score: 0,
          game_score: 0,
          news_score: 0,
          task_score: 0,
          total_score: 0,
          game_highest_score: 0,
          no_of_tickets: 3,
        };
      }

      data.Score.network_score =
        (data.Score.network_score || 0) + amount;

      data.Score.total_score =
        (data.Score.total_score || 0) + amount;

      return data;
    });
  }, []);

  // ======================================
  // MAIN REFERRAL LOGIC (ONLY HERE)
  // ======================================
  const processReferralReward = useCallback(
    async (referrerId, newUserId) => {
      if (!referrerId || !newUserId) return;
      if (referrerId === newUserId) return;

      const referrerSnap = await get(
        ref(database, `users/${referrerId}`)
      );
      const newUserSnap = await get(
        ref(database, `users/${newUserId}`)
      );

      if (!referrerSnap.exists() || !newUserSnap.exists()) return;

      // IMPORTANT: check if already processed
      const referredBySnap = await get(
        ref(database, `users/${newUserId}/referredBy`)
      );

      if (referredBySnap.exists()) {
        return; // already rewarded
      }

      const timestamp = Date.now();
      const newUserName =
        newUserSnap.val().name || "Unknown";

      const updates = {};

      // set referredBy
      updates[`users/${newUserId}/referredBy`] = {
        id: referrerId,
        name: referrerSnap.val().name || "Unknown",
      };

      updates[`users/${newUserId}/referralSource`] = "Invite";

      // add inside referrer
      updates[`users/${referrerId}/referrals/${newUserId}`] = {
        id: newUserId,
        name: newUserName,
        joinedAt: timestamp,
        xp: 50,
      };

      await update(ref(database), updates);

      // 🔥 LEVEL 1
      await updateScores(referrerId, 100);
      await updateScores(newUserId, 50);

      // 🔥 LEVEL 2
      const parent = referrerSnap.val().referredBy;
      if (parent?.id) {
        await updateScores(parent.id, 20);

        const grandSnap = await get(
          ref(database, `users/${parent.id}`)
        );
        const grand = grandSnap.val()?.referredBy;

        if (grand?.id) {
          await updateScores(grand.id, 10);
        }
      }

      setShowWelcomePopup(true);
    },
    [updateScores]
  );

  // ======================================
  // HANDLE START PARAM
  // ======================================
  useEffect(() => {
    if (!user?.id) return;

    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();

    const handleReferral = async () => {
      let startParam = tg.initDataUnsafe?.start_param;

      if (!startParam && DEV_FORCE_REFERRAL) {
        startParam = `ref_dev_${DEV_REFERRER_ID}`;
      }

      if (!startParam) return;

      if (startParam.startsWith("ref_")) {
        const parts = startParam.split("_");
        if (parts.length >= 3) {
          const referrerId = parts[2];
          await processReferralReward(
            referrerId,
            String(user.id)
          );
        }
      }
    };

    handleReferral();
  }, [user?.id, processReferralReward, DEV_FORCE_REFERRAL, DEV_REFERRER_ID]);

  // ======================================
  // GENERATE INVITE LINK
  // ======================================
  useEffect(() => {
    if (!user?.id) return;

    const botUsername = "fruitgameapplication_bot";

    const code = btoa(`${user.id}_${Date.now()}`)
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 12);

    setInviteLink(
      `https://t.me/${botUsername}?startapp=ref_${code}_${user.id}`
    );
  }, [user?.id]);

  // ======================================
  // REFERRAL LIST (NO UNKNOWN BUG)
  // ======================================
  useEffect(() => {
    if (!user?.id) return;

    const referralsRef = ref(
      database,
      `users/${user.id}/referrals`
    );

    const unsubscribe = onValue(
      referralsRef,
      async (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setInvitedFriends([]);
          return;
        }

        const list = Object.values(data).map(
          (val) => ({
            id: val.id,
            name: val.name || "Unknown",
            referralDate: val.joinedAt || 0,
            xp: val.xp || 50,
          })
        );

        setInvitedFriends(list);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  // ======================================
  // SHARE HELPERS
  // ======================================
  const copyToClipboard = async () => {
    if (!inviteLink) return false;
    await navigator.clipboard.writeText(inviteLink);
    return true;
  };

  const shareToTelegram = () => {
    if (!inviteLink) return;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(
        inviteLink
      )}`,
      "_blank"
    );
  };

  const shareToWhatsApp = () => {
    if (!inviteLink) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        inviteLink
      )}`,
      "_blank"
    );
  };

  const shareToTwitter = () => {
    if (!inviteLink) return;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        inviteLink
      )}`,
      "_blank"
    );
  };

  const value = {
    inviteLink,
    invitedFriends,
    showWelcomePopup,
    setShowWelcomePopup,
    copyToClipboard,
    shareToTelegram,
    shareToWhatsApp,
    shareToTwitter,
  };

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
};
