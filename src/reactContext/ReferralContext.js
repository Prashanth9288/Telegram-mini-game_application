// src/reactContext/ReferralContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTelegram } from './TelegramContext.js';
import { database } from '../services/FirebaseConfig.js';
import { ref, get, update, set, onValue } from 'firebase/database';

const ReferralContext = createContext();
export const useReferral = () => useContext(ReferralContext);

export const ReferralProvider = ({ children }) => {
  const { user } = useTelegram();

  const [inviteLink, setInviteLink] = useState('');
  const [invitedFriends, setInvitedFriends] = useState([]);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  // DB updates - wrapped in useCallback
  const updateScores = React.useCallback(async (refId, amount) => {
    // Update network_score
    const scoreRef = ref(database, `users/${refId}/Score/network_score`);
    const snap = await get(scoreRef);
    const curr = snap.exists() ? snap.val() : 0;
    await set(scoreRef, curr + amount);

    // Update total_score
    const totalRef = ref(database, `users/${refId}/Score/total_score`);
    const totalSnap = await get(totalRef);
    const tot = totalSnap.exists() ? totalSnap.val() : 0;
    await set(totalRef, tot + amount);
  }, []);

  const addReferralRecord = React.useCallback(async (referrerId, referredId) => {
    const referrerUserRef = ref(database, `users/${referrerId}`);
    const userSnap = await get(referrerUserRef);

    let referrerName = "Unknown";

    if (!userSnap.exists()) {
      await set(referrerUserRef, {
        referrals: {}
      });
    } else {
      referrerName = userSnap.val().name || "Unknown";
    }
    // Add to referrer list and award
    const refRef = ref(database, `users/${referrerId}/referrals`);
    const snap = await get(refRef);
    const list = snap.val() || {};
    const exists = Object.values(list).includes(referredId);
    if (exists) return;
    const idx = Object.keys(list).length + 1;
    await update(refRef, { [idx]: referredId });

    // Store "Referred By" details in the new user's record
    const referredUserRef = ref(database, `users/${referredId}`);
    await update(referredUserRef, {
      referralSource: "Invite",
      referredBy: {
        id: referrerId,
        name: referrerName
      }
    });

    // Award: referrer 100, referred 50
    await updateScores(referrerId, 100);
    await updateScores(referredId, 50);
  }, [updateScores]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      console.log('[Referral] Telegram object not found');
      return;
    }

    tg.ready();
    console.log('[Referral] tg.ready() was called');

    // Try to get the param from Telegram SDK
    let startParam = tg.initDataUnsafe?.start_param;

    // FALLBACK: If not found in SDK, check URL parameters (e.g. ?tgWebAppStartParam=...)
    if (!startParam) {
      const urlParams = new URL(window.location.href).searchParams;
      startParam = urlParams.get('tgWebAppStartParam');
    }

    const referredId = tg.initDataUnsafe?.user?.id;

    if (!startParam || !referredId) {
      return;
    }

    /* last "_" split */
    const parts = startParam.split('_');
    const referrerId = parts[2];
    console.log('[Referral] referrerId:', referrerId);

    if (!referrerId || referrerId === String(referredId)) {
      return;
    }

    const key = `referred_${referredId}`;
    if (localStorage.getItem(key)) {
      console.log('[Referral] LocalStorage flag already set → abort');
      return;
    }

    console.log('[Referral] All guards passed – calling addReferralRecord');
    addReferralRecord(referrerId, referredId)
      .then(() => {
        console.log('[Referral] addReferralRecord resolved – show popup');
        localStorage.setItem(key, 'done');
        setShowWelcomePopup(true)
      })
      .catch(err => {
        console.error('[Referral] addReferralRecord rejected:', err);
        tg.showAlert('Could not save referral, please try again later.');
      });

  }, [user.id, addReferralRecord]);




  useEffect(() => {
    if (user?.id) {
      const code = btoa(`${user.id}_${Date.now()}`)
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 12);

      // Use the environment variable for bot username, fallback to a placeholder if missing
      const botUsername = process.env.REACT_APP_BOT_USERNAME || 'Web3TodayGameAppTelegram_bot';

      // BotFather is configured! We can now use 'startapp' for correct tracking.
      // Format: https://t.me/BOT_USERNAME?startapp=ref_CODE_USERID
      setInviteLink(`https://t.me/${botUsername}?startapp=ref_${code}_${user.id}`);
    }
  }, [user?.id]);




  useEffect(() => {
    if (!user?.id) return;
    const referralsRef = ref(database, `users/${user.id}/referrals`);
    const unsub = onValue(referralsRef, async snapshot => {
      const data = snapshot.val() || {};
      const ids = Object.values(data);
      const list = await Promise.all(
        ids.map(async id => {
          const snap = await get(ref(database, `users/${id}`));
          const u = snap.val();
          return { id, name: u.name || 'Unknown', points: u.Score?.network_score || 0, status: u.status || 'active' };
        })
      );
      setInvitedFriends(list);
    });
    return () => unsub();
  }, [user?.id]);



  const shareToTelegram = React.useCallback(() => window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join me and earn rewards!')}`, '_blank'), [inviteLink]);
  const shareToWhatsApp = React.useCallback(() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join me and earn rewards! ${inviteLink}`)}`, '_blank'), [inviteLink]);
  const shareToTwitter = React.useCallback(() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me and earn rewards! ${inviteLink}`)}`, '_blank'), [inviteLink]);
  const copyToClipboard = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      return true;
    } catch (err) {
      console.error('Failed to copy: ', err);
      return false;
    }
  }, [inviteLink]);

  const value = React.useMemo(() => ({
    inviteLink,
    invitedFriends,
    shareToTelegram,
    shareToWhatsApp,
    shareToTwitter,
    copyToClipboard,
    showWelcomePopup,
    setShowWelcomePopup
  }), [
    inviteLink,
    invitedFriends,
    showWelcomePopup,
    shareToTelegram,
    shareToWhatsApp,
    shareToTwitter, // Now stable via useCallback
    copyToClipboard
  ]);

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
};
