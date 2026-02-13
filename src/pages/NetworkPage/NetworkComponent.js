import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Zap, ChevronLeft, UserPlus, Share2, Gift, Trophy, Star, Users } from "lucide-react"
import { ref, onValue, query, orderByChild, limitToLast } from "firebase/database"
import { database } from "../../services/FirebaseConfig"
import InviteModal from "./InviteModel"
import { useTelegram } from "../../reactContext/TelegramContext"
import { useReferral } from "../../reactContext/ReferralContext"

// --- Local UI Components ---
const Button = ({ children, className = "", variant = "default", size = "default", onClick = () => { }, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background"
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "underline-offset-4 hover:underline text-primary",
  }
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    lg: "h-11 px-8 rounded-md",
    icon: "h-10 w-10",
  }
  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} onClick={onClick} {...props}>
      {children}
    </button>
  )
}

const Card = ({ children, className = "", ...props }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props}>
    {children}
  </div>
)

const CardContent = ({ children, className = "", ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
)

const Avatar = ({ children, className = "", ...props }) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`} {...props}>
    {children}
  </div>
)

const AvatarFallback = ({ children, className = "", ...props }) => (
  <div className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className}`} {...props}>
    {children}
  </div>
)

// --- Main Component ---
export default function NetworkComponent() {
  const navigate = useNavigate()

  // Contexts
  const { scores } = useTelegram()
  // useReferral provides all sharing logic and the invited friends list
  const { invitedFriends, shareToWhatsApp, shareToTwitter, inviteLink, referralError } = useReferral()

  // Local State
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [leaderboardTotal, setLeaderboardTotal] = useState([])
  const [leaderboardHighest, setLeaderboardHighest] = useState([])
  const [isModalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("invites") // 'invites' | 'leaderboard'

  // Toggle states for leaderboards
  const [isHighestExpanded, setHighestExpanded] = useState(false)
  const [isTotalExpanded, setTotalExpanded] = useState(false)

  // Fetch Leaderboard Data (OPTIMIZED)
  useEffect(() => {
    // SCALABILITY FIX: Do NOT load the entire "users" node.
    // Query only the top 100 users ordered by total_score.
    const usersRef = query(
      ref(database, "users"),
      orderByChild("Score/total_score"),
      limitToLast(100)
    );

    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val()
        // Firebase queries return objects where keys are IDs. 
        // Order is respected in the snapshot enumeration if using forEach, 
        // but Object.keys might not guarantee it.
        // We map to array and re-sort to be safe.
        const leaderboardData = Object.keys(usersData)
          .map((uid) => ({
            id: uid,
            name: usersData[uid].name,
            username: usersData[uid].username, // Capture handle if available
            highest: usersData[uid].Score?.game_highest_score || 0,
            total: usersData[uid].Score?.total_score || 0,
          }))
          .filter((player) => player.name && player.name.trim() !== "" && player.name !== "Unknown")
          .map(player => ({
            ...player,
            // Display Logic: Show Handle if exists, else Name
            displayName: player.username ? `@${player.username}` : player.name
          }));

        // Create sorted arrays
        // Sort descending by highest score
        const sortedHighest = [...leaderboardData].sort((a, b) => b.highest - a.highest)
        // Sort descending by total score
        const sortedTotal = [...leaderboardData].sort((a, b) => b.total - a.total)

        setLeaderboardHighest(sortedHighest)
        setLeaderboardTotal(sortedTotal)
      }
    })
    return () => unsubscribe()
  }, [])

  // Handlers
  const handleShareToggle = () => setShowShareOptions(!showShareOptions)

  // Using pure context functions for sharing
  const handleWhatsApp = () => shareToWhatsApp()
  const handleTwitter = () => shareToTwitter()

  // Helper for Rank Badge Color
  const getRankBadgeColor = (index) => {
    if (index === 0) return "bg-amber-400 text-amber-900 border-amber-200" // Gold
    if (index === 1) return "bg-gray-300 text-gray-800 border-gray-100" // Silver
    if (index === 2) return "bg-amber-700 text-amber-100 border-amber-600" // Bronze
    return "bg-white/10 text-white border-white/10" // Default
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex flex-col font-sans">

      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-purple-600/80 to-pink-600/90 z-0">
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
              </pattern>
              <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
                <rect width="80" height="80" fill="url(#smallGrid)" />
                <path d="M 80 0 L 0 0 0 80" fill="none" stroke="white" strokeWidth="1" opacity="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative z-10">
        <header className="sticky top-0 z-20 bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10" onClick={() => navigate("/")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="font-bold text-base text-white">Network</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center ">
                <span className="text-white font-medium mr-1">{scores?.network_score || 0}</span>
                <Zap className="h-4 w-4 text-amber-300 fill-amber-300 mr-3" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          <div className="max-w-md mx-auto">

            {/* 1. Invite Friends Card (Always Visible) */}
            <Card className="mb-6 overflow-hidden border-none shadow-lg bg-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center">
                  <UserPlus className="h-5 w-5 mr-2 text-indigo-300" />
                  Invite Friends
                </h2>
                <p className="text-sm text-white/80 mb-4">Invite friends and both earn rewards!</p>

                <div className="flex items-center justify-center gap-6 mb-6 text-center">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-14 w-14 border-2 border-indigo-300 mb-2">
                      <AvatarFallback className="bg-indigo-600/30 text-white">You</AvatarFallback>
                    </Avatar>
                    <div className="bg-indigo-500/20 px-3 py-1 rounded-full text-white flex items-center">
                      <Zap className="h-4 w-4 text-amber-300 fill-amber-300 mr-1" />
                      <span className="font-bold">+100 XP</span>
                    </div>
                  </div>
                  <div className="text-white opacity-70">
                    <Gift className="h-7 w-7" />
                  </div>
                  <div className="flex flex-col items-center">
                    <Avatar className="h-14 w-14 border-2 border-pink-300 mb-2">
                      <AvatarFallback className="bg-pink-600/30 text-white">Friend</AvatarFallback>
                    </Avatar>
                    <div className="bg-pink-500/20 px-3 py-1 rounded-full text-white flex items-center">
                      <Zap className="h-4 w-4 text-amber-300 fill-amber-300 mr-1" />
                      <span className="font-bold">+50 XP</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={inviteLink ? handleShareToggle : undefined}
                  disabled={!inviteLink}
                  className={`w-full text-white py-2 h-12 font-bold ${inviteLink
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600"
                    : "bg-gray-600 opacity-50 cursor-not-allowed"
                    }`}
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  {inviteLink ? (showShareOptions ? "Hide Share Options" : "Share Invite Link") : (referralError || "Referrals currently unavailable")}
                </Button>

                {showShareOptions && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="text-white border-white/20 bg-white/5 flex flex-col items-center py-3"
                      onClick={handleWhatsApp}
                    >
                      <span className="text-xs">WhatsApp</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="text-white border-white/20 bg-white/5 flex flex-col items-center py-3"
                      onClick={handleTwitter}
                    >
                      <span className="text-xs">Twitter</span>
                    </Button>
                    <Button
                      id="inviteButton"
                      onClick={() => setModalOpen(true)}
                      variant="outline"
                      className="text-white border-white/20 bg-white/5 flex flex-col items-center py-3"
                    >
                      <span className="text-xs">QR Code</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Tab Navigation */}
            <div className="flex bg-white/10 p-1 rounded-xl mb-6">
              <button
                onClick={() => setActiveTab("invites")}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "invites" ? "bg-white/20 text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Users className="h-4 w-4" />
                My Invites
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "leaderboard" ? "bg-white/20 text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Trophy className="h-4 w-4" />
                Leaderboard
              </button>
            </div>

            {/* 3. Conditional Content */}

            {activeTab === "invites" ? (
              // --- MY INVITES TAB ---
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-300" />
                    Invited Friends
                  </h3>
                  <span className="bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {invitedFriends?.length || 0}/infinite
                  </span>
                </div>

                {/* Minimal Stats Bar */}
                <div className="bg-white/5 rounded-lg p-3 flex justify-between text-xs text-white/70 mb-2">
                  <span>Total Invites Sent <b className="text-white ml-1">{invitedFriends?.length || 0}</b></span>
                  <span>Active Friends <b className="text-white ml-1">{invitedFriends?.filter(f => f.status === 'active').length || 0}</b></span>
                  <span className="text-amber-300 flex items-center gap-1"> <Zap className="h-3 w-3" /> 0</span>
                </div>

                {invitedFriends && invitedFriends.length > 0 ? (
                  <div className="space-y-2">
                    {invitedFriends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between bg-white/10 p-3 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 bg-indigo-500/30">
                            <AvatarFallback className="text-xs text-white">
                              {friend.name ? friend.name.substring(0, 2).toUpperCase() : "??"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white font-medium">{friend.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-300 font-bold text-sm">
                          +{friend.xp} XP
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/60">You haven't invited anyone yet.</p>
                  </div>
                )}
              </div>
            ) : (
              // --- LEADERBOARD TAB ---
              <div className="space-y-6">

                {/* Global Score Card */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-4 flex items-center justify-between border-b border-white/10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-400" />
                      Global Score
                    </h3>
                    <span className="bg-amber-500/80 text-white text-xs font-bold px-3 py-1 rounded-full border border-amber-400/50">
                      Top Players
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    {/* Dynamic Slice based on expansion state */}
                    {(isTotalExpanded ? leaderboardTotal : leaderboardTotal.slice(0, 3)).map((player, index) => (
                      <div key={player.id} className="flex items-center justify-between bg-indigo-900/40 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${getRankBadgeColor(index)}`}>
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 bg-indigo-500/20">
                              <AvatarFallback className="text-xs text-white">
                                {player.name ? player.name.substring(0, 1).toUpperCase() : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white font-medium text-sm">{player.name}</span>
                          </div>
                        </div>
                        <div className="bg-amber-400/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full flex items-center border border-amber-400/30">
                          <Zap className="h-3 w-3 mr-1" fill="currentColor" />
                          {player.total} XP
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 pt-0">
                    <Button
                      onClick={() => setTotalExpanded(!isTotalExpanded)}
                      className="w-full bg-indigo-600/50 hover:bg-indigo-600 border border-white/10 text-white text-sm"
                    >
                      {isTotalExpanded ? "Show Less" : "View Leaderboard"}
                    </Button>
                  </div>
                </div>

                {/* Game Highest Score Card */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-4 flex items-center justify-between border-b border-white/10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Star className="h-5 w-5 text-pink-400" />
                      Game Highest Score
                    </h3>
                    <span className="bg-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full border border-pink-400/50">
                      Fruit Ninja
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    {(isHighestExpanded ? leaderboardHighest : leaderboardHighest.slice(0, 3)).map((player, index) => (
                      <div key={player.id} className="flex items-center justify-between bg-purple-900/40 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${getRankBadgeColor(index)}`}>
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 bg-pink-500/20">
                              <AvatarFallback className="text-xs text-white">
                                {player.name ? player.name.substring(0, 1).toUpperCase() : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white font-medium text-sm">{player.name}</span>
                          </div>
                        </div>
                        <div className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
                          {player.highest} pts
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 pt-0 space-y-2">
                    <Button
                      onClick={() => setHighestExpanded(!isHighestExpanded)}
                      className="w-full bg-purple-600/50 hover:bg-purple-600 border border-white/10 text-white text-sm"
                    >
                      {isHighestExpanded ? "Show Less" : "View Leaderboard"}
                    </Button>
                    <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-bold shadow-lg" onClick={() => navigate("/game")}>
                      Play Again
                    </Button>
                  </div>
                </div>

              </div>
            )}


            <InviteModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
          </div>
        </main>
      </div>
    </div>
  )
}
