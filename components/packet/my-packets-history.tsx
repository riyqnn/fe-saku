"use client";

import { useMyPackets, MyPacket } from "@/hooks/useMyPackets";
import { Loader2, Gift, Link, Copy, Check } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from 'date-fns';
import { toast } from "sonner";

const PacketHistoryItem = ({ packet }: { packet: MyPacket }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(packet.shareLink);
    setIsCopied(true);
    toast.success("Share link copied!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getStatusChip = () => {
    if (packet.isExpired) return <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">Expired</span>;
    if (packet.isFullyClaimed) return <span className="px-2 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">Claimed</span>;
    return <span className="px-2 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full">Active</span>;
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200/80 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(packet.created_at), { addSuffix: true })}
          </p>
          <p className="font-bold text-lg text-gray-800">
            {packet.total_amount} <span className="text-base font-semibold text-gray-500">USDC</span>
          </p>
        </div>
        {getStatusChip()}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Code</span>
          <span className="font-mono font-bold text-primary">{packet.packet_code}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Winners</span>
          <span className="font-bold text-gray-800">{packet.winner_count} / {packet.max_winners}</span>
        </div>
      </div>
      <button 
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-lg transition-colors"
      >
        {isCopied ? <Check size={16} /> : <Link size={16} />}
        {isCopied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
};

export default function MyPacketsHistory() {
  const { packets, isLoading, error } = useMyPackets();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }
  
  if (packets.length === 0) {
    return (
      <div className="text-center p-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <Gift className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="mt-6 text-lg font-bold text-gray-800">No Packets Created</h3>
        <p className="mt-2 text-sm text-gray-500">
          Your created packets will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {packets.map(packet => (
        <PacketHistoryItem key={packet.id} packet={packet} />
      ))}
    </div>
  );
}
