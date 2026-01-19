interface PayButtonProps {
  onClick?: () => void;
}

export default function PayButton({ onClick }: PayButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center text-2xl"
    >
      +
    </button>
  );
}
