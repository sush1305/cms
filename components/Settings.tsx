import React, { useState } from 'react';
import { db } from '../store';
import { User } from '../types';

interface SettingsProps {
  user: User;
  onUpdate: (user: User) => void;
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdate, onBack }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  // FIX: handleChangePassword made async to await db.changePassword
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (currentPassword !== user.password) {
      setMessage({ text: 'Current password is incorrect.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }

    const success = await db.changePassword(user.id, newPassword);
    if (success) {
      const updatedUser = { ...user, password: newPassword };
      onUpdate(updatedUser);
      localStorage.setItem('chaishorts_user', JSON.stringify(updatedUser));
      setMessage({ text: 'Password updated successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setMessage({ text: 'An error occurred. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <header className="flex items-center space-x-6">
        <button 
          onClick={onBack} 
          className="p-4 hover:bg-black hover:text-white bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage your personal profile and security preferences.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full mx-auto flex items-center justify-center text-4xl font-black mb-4 border-4 border-white shadow-lg">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-xl font-black text-slate-900 leading-tight">{user.username}</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">{user.email}</p>
            <div className="mt-3 inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
              {user.role} Access
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-lg font-black text-slate-900">Security & Authentication</h4>
              <p className="text-sm text-slate-500 font-medium">Update your password to keep your account secure.</p>
            </div>
            
            <div className="p-8">
              <form onSubmit={handleChangePassword} className="space-y-6">
                {message.text && (
                  <div className={`p-4 rounded-2xl text-sm font-bold border ${
                    message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 ml-1">Current Password</label>
                  <input 
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 ml-1">New Password</label>
                    <input 
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 ml-1">Confirm New Password</label>
                    <input 
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-amber-200 transition-all transform hover:-translate-y-0.5 active:scale-95"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;