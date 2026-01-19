export default function RecentTransfers() {
  const transfers = [
    { id: 1, name: 'John Doe', amount: '50,000', date: 'Today' },
    { id: 2, name: 'Jane Smith', amount: '75,000', date: 'Yesterday' },
  ];

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Recent Transfers</h3>
      <div className="space-y-3">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="flex justify-between items-center p-3 border rounded-lg">
            <div>
              <p className="font-medium">{transfer.name}</p>
              <p className="text-sm text-muted-foreground">{transfer.date}</p>
            </div>
            <p className="font-semibold">Rp {transfer.amount}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
