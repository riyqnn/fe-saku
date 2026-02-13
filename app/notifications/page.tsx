"use client";

import { useNotifications, Notification } from "@/hooks/useNotifications";
import Header from "@/components/layout/Header";
import { Loader2, Bell, CheckCircle, ArrowRight, TrendingUp, Download, ArrowUpRight, ArrowDownLeft, Gift } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from "next/navigation";

const NotificationIcon = ({ type }: { type: string }) => {
  const iconProps = {
    className: "w-5 h-5 text-white"
  };
  let bgClass = "bg-gray-400";

  switch (type) {
    case 'TRANSFER_IN':
      bgClass = "bg-green-500";
      return <div className={`p-2 rounded-full ${bgClass}`}><ArrowDownLeft {...iconProps} /></div>;
    case 'TRANSFER_OUT':
      bgClass = "bg-red-500";
      return <div className={`p-2 rounded-full ${bgClass}`}><ArrowUpRight {...iconProps} /></div>;
    case 'TOPUP_SUCCESS':
      bgClass = "bg-blue-500";
      return <div className={`p-2 rounded-full ${bgClass}`}><Download {...iconProps} /></div>;
    case 'WITHDRAW_SUCCESS':
      bgClass = "bg-orange-500";
      return <div className={`p-2 rounded-full ${bgClass}`}><ArrowUpRight {...iconProps} /></div>;
    case 'STAKE_SUCCESS':
    case 'UNSTAKE_SUCCESS':
      bgClass = "bg-indigo-500";
      return <div className={`p-2 rounded-full ${bgClass}`}><TrendingUp {...iconProps} /></div>;
    case 'CLAIM_SUCCESS':
       bgClass = "bg-yellow-500";
      return <div className={`p-2 rounded-full ${bgClass}`}><Gift {...iconProps} /></div>;
    default:
      return <div className={`p-2 rounded-full ${bgClass}`}><Bell {...iconProps} /></div>;
  }
};

const NotificationItem = ({ notification }: { notification: Notification }) => {
  const router = useRouter();

  const handleNotificationClick = () => {
    if (notification.metadata?.tx_hash) {
      const explorerUrl = `https://sepolia.basescan.org/tx/${notification.metadata.tx_hash}`;
      window.open(explorerUrl, '_blank');
    }
  };

  return (
    <div 
      onClick={handleNotificationClick}
      className={`flex items-start gap-4 p-4 border-b border-gray-100 transition-colors ${!notification.is_read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50'} cursor-pointer`}
    >
      <NotificationIcon type={notification.type} />
      <div className="flex-1">
        <p className={`text-sm ${!notification.is_read ? 'font-bold text-gray-800' : 'font-medium text-gray-700'}`}>
          {notification.message}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full self-center"></div>
      )}
    </div>
  );
};


export default function NotificationsPage() {
  const { notifications, isLoading, error, fetchNotifications } = useNotifications();

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col max-w-lg mx-auto">
      <div className="bg-white flex-1 flex flex-col">
        <Header title="Notifications" showBack />
        
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full p-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
          )}

          {!isLoading && error && (
             <div className="text-center p-8">
                <p className="text-gray-600">Error loading notifications.</p>
                <button onClick={() => fetchNotifications()} className="mt-4 px-4 py-2 bg-primary text-black font-semibold rounded-lg">
                  Try Again
                </button>
             </div>
          )}

          {!isLoading && !error && notifications.length === 0 && (
            <div className="text-center p-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Bell className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="mt-6 text-lg font-bold text-gray-800">No Notifications Yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Important updates about your account will appear here.
              </p>
            </div>
          )}

          {!isLoading && !error && notifications.length > 0 && (
            <div>
              {notifications.map(notif => (
                <NotificationItem key={notif.id} notification={notif} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
