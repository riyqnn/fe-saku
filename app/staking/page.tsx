"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  TrendingUp, Coins, Gift, Loader2, CheckCircle, Sparkles,
  ArrowUpRight, ArrowDownRight, Clock, Wallet, Percent
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { useStaking } from "@/hooks/useStaking"
import Header from "@/components/layout/Header"
import BottomNavigation from "@/components/home/bottom-navigation"

type TabType = "stake" | "unstake" | "claim"
type SuccessType = "stake" | "unstake" | "claim" | null

// Simple animated chart component
function StakingChart({ userStaked, totalStaked }: { userStaked: string; totalStaked: string }) {
  const userPercent = totalStaked && parseFloat(totalStaked) > 0
    ? (parseFloat(userStaked) / parseFloat(totalStaked)) * 100
    : 0

  return (
    <div className="relative h-32 w-full">
      {/* Chart bars */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-full gap-2 px-4">
        {[65, 45, 80, 55, 90, 70, 85].map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/20 rounded-t-lg transition-all duration-500 hover:bg-primary/40"
            style={{
              height: `${height}%`,
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>

      {/* User share indicator */}
      {userPercent > 0 && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold text-black/60">{userPercent.toFixed(2)}% pool share</span>
        </div>
      )}
    </div>
  )
}

// Mini stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = "primary"
}: {
  icon: React.ElementType
  label: string
  value: string
  trend?: "up" | "down"
  color?: "primary" | "green" | "amber"
}) {
  const colorClasses = {
    primary: "from-primary/10 to-transparent border-primary/20",
    green: "from-green-500/10 to-transparent border-green-500/20",
    amber: "from-amber-500/10 to-transparent border-amber-500/20"
  }

  return (
    <div className={`p-4 rounded-[1.5rem] bg-gradient-to-br ${colorClasses[color]} border space-y-2`}>
      <div className="flex items-center justify-between">
        <Icon size={14} className="text-black/40" />
        {trend && (
          trend === "up"
            ? <ArrowUpRight size={14} className="text-green-500" />
            : <ArrowDownRight size={14} className="text-red-500" />
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold text-black/40 tracking-wider uppercase">{label}</p>
        <p className="text-lg font-black tracking-tight">{value}</p>
      </div>
    </div>
  )
}

export default function StakingPage() {
  const router = useRouter()
  const { user, token } = useAuth()
  const walletAddress = user?.wallet_address || null

  const { formattedBalance } = useBalance(walletAddress)
  const {
    stakingInfo,
    isLoading,
    isStaking,
    isUnstaking,
    isClaiming,
    error,
    stake,
    unstake,
    claimRewards,
    fetchStakingInfo,
  } = useStaking(token)

  const [activeTab, setActiveTab] = useState<TabType>("stake")
  const [amount, setAmount] = useState("")
  const [unstakeAmount, setUnstakeAmount] = useState("")
  const [success, setSuccess] = useState<SuccessType>(null)
  const [successData, setSuccessData] = useState<{
    amount?: string
    stUSDCReceived?: string
    amountReceived?: string
    txHash?: string
  }>({})

  // Refresh on mount
  useEffect(() => {
    fetchStakingInfo()
  }, [])

  const handleStake = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return

    const result = await stake(parseFloat(amount))
    if (result.success) {
      setSuccess("stake")
      setSuccessData({
        amount: result.amount,
        stUSDCReceived: result.stUSDCReceived,
        txHash: result.txHash,
      })
    }
  }

  const handleUnstake = async () => {
    if (!unstakeAmount && unstakeAmount !== "all") return

    const result = await unstake(unstakeAmount || "all")
    if (result.success) {
      setSuccess("unstake")
      setSuccessData({
        amount: result.amountUnstaked,
        amountReceived: result.amountReceived,
        txHash: result.txHash,
      })
    }
  }

  const handleClaim = async () => {
    const result = await claimRewards()
    if (result.success) {
      setSuccess("claim")
      setSuccessData({
        amount: result.amount,
        txHash: result.txHash,
      })
    }
  }

  const handleDone = () => {
    setSuccess(null)
    setSuccessData({})
    setAmount("")
    setUnstakeAmount("")
    fetchStakingInfo()
  }

  const formatNumber = (num: string) => {
    const n = parseFloat(num)
    if (isNaN(n)) return "0"
    return n.toLocaleString("id-ID", { maximumFractionDigits: 2 })
  }

  // Success screen
  if (success) {
    const titles = {
      stake: "Staked!",
      unstake: "Unstaked!",
      claim: "Claimed!",
    }
    const messages = {
      stake: `${formatNumber(successData.amount || "0")} IDRX → ${formatNumber(successData.stUSDCReceived || "0")} stUSDC`,
      unstake: `${formatNumber(successData.amount || "0")} stUSDC → ${formatNumber(successData.amountReceived || "0")} IDRX`,
      claim: `${formatNumber(successData.amount || "0")} IDRX rewards`,
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-primary/20">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold italic tracking-tight text-black/85">{titles[success]}</h1>
              <p className="text-black/50 font-medium">{messages[success]}</p>
            </div>

            {successData.txHash && (
              <div className="w-full p-4 rounded-[1.5rem] bg-muted/50 space-y-2">
                <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Transaction</p>
                <p className="text-xs font-mono text-black/70 break-all">{successData.txHash}</p>
              </div>
            )}

            <button
              onClick={handleDone}
              className="w-full py-4 rounded-2xl bg-primary text-black font-semibold shadow-lg shadow-primary/30 active:scale-95 transition-all"
            >
              Back Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen h-dvh bg-background flex flex-col max-w-lg mx-auto border-x border-border font-sans pb-24">
      <Header title="Staking" />

      <div className="flex-1 overflow-y-auto p-5 space-y-6 animate-in fade-in duration-500 scrollbar-hide">
        {/* Title Section */}
        <div className="space-y-1">
          <h1 className="text-4xl font-black italic tracking-tighter leading-none">STAKING</h1>
          <div className="h-1 w-12 bg-primary rounded-full" />
          <p className="text-[10px] font-bold text-black/30 tracking-widest pt-1">Earn rewards by staking IDRX</p>
        </div>

        {/* Main Stats Card */}
        <section className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 border border-primary/20 space-y-6 shadow-xl shadow-primary/20">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-amber-900" />
                  <p className="text-[10px] font-bold text-amber-900/60 tracking-[0.2em]">Your Staked Balance</p>
                </div>
                <h2 className="text-4xl font-bold tracking-tighter text-black/85">
                  {stakingInfo ? formatNumber(stakingInfo.userStaked) : "0"} IDRX
                </h2>
                <p className="text-xs text-amber-900/60 font-medium">
                  ≈ {stakingInfo ? formatNumber(stakingInfo.userStaked) : "0"} stUSDC
                </p>
              </div>

              <div className="h-px bg-black/5" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-amber-900/60 tracking-widest">PENDING REWARDS</p>
                  <p className="text-xl font-bold text-amber-900">
                    {stakingInfo ? formatNumber(stakingInfo.pendingRewards) : "0"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-amber-900/60 tracking-widest">TOTAL POOL</p>
                  <p className="text-xl font-bold text-amber-900">
                    {stakingInfo ? formatNumber(stakingInfo.totalStaked) : "0"}
                  </p>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Chart Section */}
        <section className="p-6 rounded-[2.5rem] bg-white border border-black/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black italic">Pool Activity</h3>
            <div className="flex items-center gap-1 text-[10px] font-bold text-black/40">
              <Clock size={12} />
              <span>Last 7 days</span>
            </div>
          </div>
          <StakingChart
            userStaked={stakingInfo?.userStaked || "0"}
            totalStaked={stakingInfo?.totalStaked || "0"}
          />
        </section>

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-2 gap-4">
          <StatCard
            icon={Wallet}
            label="Wallet Balance"
            value={formattedBalance.replace("Rp ", "")}
            color="amber"
          />
          <StatCard
            icon={Percent}
            label="Min Stake"
            value={stakingInfo ? `${formatNumber(stakingInfo.minStakeAmount)} IDRX` : "1 IDRX"}
            color="primary"
          />
        </section>

        {/* Action Tabs */}
        <section className="space-y-5">
          <div className="flex gap-2 p-1.5 bg-muted/50 rounded-[2rem]">
            {[
              { id: "stake" as TabType, label: "Stake", icon: Coins },
              { id: "unstake" as TabType, label: "Unstake", icon: TrendingUp },
              { id: "claim" as TabType, label: "Claim", icon: Gift },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-3 px-4 rounded-[1.5rem] font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  activeTab === id
                    ? "bg-white text-black shadow-lg"
                    : "text-black/40 hover:text-black/60"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {/* Stake Tab */}
            {activeTab === "stake" && (
              <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
                <div className="p-6 rounded-[2rem] bg-white border border-black/5 space-y-4">
                  <label className="text-sm font-bold text-black/60">Amount to Stake</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full text-3xl font-black bg-transparent outline-none placeholder:text-black/10"
                      disabled={isStaking}
                    />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm font-bold text-black/30">IDRX</span>
                  </div>
                  <div className="flex gap-2">
                    {["100K", "500K", "1M"].map((val) => (
                      <button
                        key={val}
                        onClick={() => setAmount(val.replace("K", "000").replace("M", "000000"))}
                        className="flex-1 py-2 rounded-xl bg-muted/50 text-xs font-bold hover:bg-primary/10 transition-colors"
                        disabled={isStaking}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStake}
                  disabled={!amount || isStaking || parseFloat(amount) <= 0}
                  className="w-full py-5 rounded-[2rem] bg-primary text-black font-bold text-sm shadow-xl shadow-primary/30 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
                >
                  {isStaking ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Staking...
                    </>
                  ) : (
                    <>
                      <TrendingUp size={18} />
                      Stake {amount ? formatNumber(amount) : "0"} IDRX
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Unstake Tab */}
            {activeTab === "unstake" && (
              <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
                <div className="p-6 rounded-[2rem] bg-white border border-black/5 space-y-4">
                  <label className="text-sm font-bold text-black/60">Amount to Unstake</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                      placeholder="0"
                      className="w-full text-3xl font-black bg-transparent outline-none placeholder:text-black/10"
                      disabled={isUnstaking}
                    />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm font-bold text-black/30">stUSDC</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-black/40">
                      Available: {stakingInfo ? formatNumber(stakingInfo.userStaked) : "0"} stUSDC
                    </span>
                    <button
                      onClick={() => setUnstakeAmount("all")}
                      className="font-bold text-primary hover:underline"
                      disabled={isUnstaking}
                    >
                      Unstake All
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleUnstake}
                  disabled={!unstakeAmount || isUnstaking}
                  className="w-full py-5 rounded-[2rem] bg-primary text-black font-bold text-sm shadow-xl shadow-primary/30 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
                >
                  {isUnstaking ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Unstaking...
                    </>
                  ) : unstakeAmount === "all" ? (
                    <>
                      <TrendingUp size={18} className="rotate-180" />
                      Unstake All
                    </>
                  ) : (
                    <>
                      <TrendingUp size={18} className="rotate-180" />
                      Unstake {unstakeAmount ? formatNumber(unstakeAmount) : "0"} stUSDC
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Claim Tab */}
            {activeTab === "claim" && (
              <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-primary via-amber-200 to-primary/80 border border-primary/20 space-y-4 shadow-xl shadow-primary/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center">
                      <Gift size={24} className="text-amber-900" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-amber-900/60 tracking-widest">PENDING REWARDS</p>
                      <p className="text-3xl font-bold text-amber-900">
                        {stakingInfo ? formatNumber(stakingInfo.pendingRewards) : "0"} IDRX
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClaim}
                  disabled={isClaiming || !stakingInfo || parseFloat(stakingInfo.pendingRewards) <= 0}
                  className="w-full py-5 rounded-[2rem] bg-primary text-black font-bold text-sm shadow-xl shadow-primary/30 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Gift size={18} />
                      Claim Rewards
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-[1.5rem] bg-red-500/10 border border-red-500/20">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {/* Info Section */}
        <section className="p-6 rounded-[2rem] bg-muted/30 space-y-4">
          <h4 className="text-sm font-black italic">How Staking Works</h4>
          <ul className="space-y-2 text-xs text-black/60 font-medium">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
              <span>Stake IDRX to receive stUSDC (1:1 ratio)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
              <span>Earn rewards automatically while staking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
              <span>Unstake anytime to get your IDRX back</span>
            </li>
          </ul>
        </section>
      </div>

      <BottomNavigation />
    </div>
  )
}
