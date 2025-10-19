import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Wallet as WalletType, Profile, Transaction } from '../lib/supabase';
import {
  Wallet,
  Send,
  Plus,
  LogOut,
  History,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [profileRes, walletRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', user!.id).maybeSingle(),
        supabase
          .from('transactions')
          .select('*')
          .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (walletRes.data) setWallet(walletRes.data);
      if (transactionsRes.data) setTransactions(transactionsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PayWallet</h1>
                <p className="text-sm text-gray-600">{profile?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white mb-8">
          <p className="text-blue-100 mb-2">Total Balance</p>
          <h2 className="text-5xl font-bold mb-6">
            ₹{wallet?.balance ? parseFloat(wallet.balance.toString()).toFixed(2) : '0.00'}
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => setShowDeposit(true)}
              className="flex-1 bg-white text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Money
            </button>
            <button
              onClick={() => setShowTransfer(true)}
              className="flex-1 bg-blue-800 text-white py-3 rounded-lg font-semibold hover:bg-blue-900 transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
            >
              <Send className="w-5 h-5" />
              Send Money
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <History className="w-6 h-6 text-gray-700" />
            <h3 className="text-2xl font-bold text-gray-900">Recent Transactions</h3>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => {
                const isReceived = tx.to_user_id === user?.id;
                const isDeposit = tx.type === 'deposit';

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          isReceived || isDeposit
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {isReceived || isDeposit ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {tx.type === 'deposit'
                            ? 'Wallet Deposit'
                            : isReceived
                            ? 'Received Money'
                            : 'Sent Money'}
                        </p>
                        <p className="text-sm text-gray-500">{tx.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          isReceived || isDeposit ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isReceived || isDeposit ? '+' : '-'}₹{parseFloat(tx.amount.toString()).toFixed(2)}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          tx.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : tx.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {(showDeposit || showTransfer) && (
        <TransactionModal
          type={showDeposit ? 'deposit' : 'transfer'}
          onClose={() => {
            setShowDeposit(false);
            setShowTransfer(false);
          }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

function TransactionModal({
  type,
  onClose,
  onSuccess,
}: {
  type: 'deposit' | 'transfer';
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      if (type === 'deposit') {
        const response = await fetch(`${supabaseUrl}/functions/v1/wallet-operations/deposit`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ amount: parseFloat(amount) }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Deposit failed');
        }
      } else {
        const response = await fetch(`${supabaseUrl}/functions/v1/transfer-money`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            recipientPhone: phone,
            amount: parseFloat(amount),
            description,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Transfer failed');
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {type === 'deposit' ? 'Add Money' : 'Send Money'}
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {type === 'transfer' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+919876543210"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Payment for..."
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                ₹
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? 'Processing...' : type === 'deposit' ? 'Add Money' : 'Send Money'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
