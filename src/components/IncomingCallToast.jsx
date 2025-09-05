import React from 'react';
import { FaPhone, FaPhoneSlash } from 'react-icons/fa';

const IncomingCallToast = ({ caller, onAccept, onDecline }) => {
  if (!caller) return null;

  return (
    <div className="fixed top-5 right-5 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 animate-pulse">
      <div className="flex items-center">
        <img src={caller.avatar_url || `https://ui-avatars.com/api/?name=${caller.full_name}`} alt={caller.full_name} className="w-12 h-12 rounded-full mr-4" />
        <div>
          <p className="font-bold">{caller.full_name}</p>
          <p className="text-sm text-gray-300">Incoming call...</p>
        </div>
      </div>
      <div className="flex justify-end mt-4 space-x-3">
        <button onClick={onDecline} className="p-3 bg-red-600 rounded-full hover:bg-red-700 text-white">
          <FaPhoneSlash />
        </button>
        <button onClick={onAccept} className="p-3 bg-green-600 rounded-full hover:bg-green-700 text-white">
          <FaPhone />
        </button>
      </div>
    </div>
  );
};

export default IncomingCallToast;