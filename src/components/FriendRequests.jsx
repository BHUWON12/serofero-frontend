import React, { useState, useEffect } from 'react';
import { getReceivedFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../services/api';
import { Check, X, UserPlus } from 'lucide-react';

const FriendRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await getReceivedFriendRequests();
        setRequests(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load friend requests.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleAction = async (requestId, action) => {
    try {
      if (action === 'accept') {
        await acceptFriendRequest(requestId);
      } else {
        await rejectFriendRequest(requestId);
      }
      setRequests(prevRequests => prevRequests.filter(req => req.id !== requestId));
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      // Optionally show an error message to the user
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading friend requests...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-error-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2"><UserPlus size={24} /> Friend Requests</h2>
      {requests.length === 0 ? (
        <div className="text-center p-4 text-gray-500 dark:text-gray-400">No pending friend requests.</div>
      ) : (
        <ul className="space-y-3">
          {requests.map(request => (
            <li key={request.id} className="card p-3 sm:p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <img
                  src={request.sender.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${request.sender.username}`}
                  alt={request.sender.username}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                />
                <div>
                  <p className="font-semibold">{request.sender.full_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{request.sender.username}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleAction(request.id, 'accept')} className="p-2 rounded-full bg-success-500 text-white hover:bg-green-600 transition-colors" aria-label={`Accept friend request from ${request.sender.full_name}`}><Check size={20} /></button>
                <button onClick={() => handleAction(request.id, 'reject')} className="p-2 rounded-full bg-error-500 text-white hover:bg-red-600 transition-colors" aria-label={`Reject friend request from ${request.sender.full_name}`}><X size={20} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FriendRequests;