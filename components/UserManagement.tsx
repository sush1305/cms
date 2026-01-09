
import React, { useState, useCallback, useEffect } from 'react';
import { db } from '../store';
import { User, Role } from '../types';

interface UserManagementProps {
  onBack: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBack, showToast }) => {
  // Use a initializer function for state to ensure it starts with the most up-to-date DB state
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: Role.VIEWER
  });

  // Explicit sync on mount
  useEffect(() => {
    setUsers(db.getUsers());
  }, []);

  // Centralized refresh to ensure local state syncs with the DB instance
  const refreshList = useCallback(() => {
    const latest = db.getUsers();
    // Using spread to ensure a new array reference triggers React's diffing engine
    setUsers([...latest]);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict email check (case insensitive)
    const existing = db.getUserByEmail(newUser.email);
    if (existing) {
      showToast?.(`A team member with email ${newUser.email} is already registered.`, 'error');
      return;
    }

    try {
      db.createUser(newUser);
      // Immediately reflect changes in the UI
      refreshList();
      setIsAdding(false);
      // Reset invitation form
      setNewUser({ username: '', email: '', password: '', role: Role.VIEWER });
      showToast?.('Team invitation dispatched successfully', 'success');
    } catch (error: any) {
      console.error('Failed to create user:', error);
      showToast?.(error.message || 'An unexpected error occurred while creating the user.', 'error');
    }
  };

  const handleDelete = (userId: string, userName: string) => {
    // Critical safety check: Protected system account
    if (userId === 'u1') {
      showToast?.('Security Policy: The primary Super Admin account cannot be revoked.', 'error');
      return;
    }
    
    // Explicit confirmation for a critical action
    const confirmed = window.confirm(
      `CRITICAL ACTION: Are you sure you want to PERMANENTLY revoke all workspace access for "${userName}"?\n\nThis action is irreversible and the member will be logged out immediately.`
    );

    if (confirmed) {
      try {
        db.deleteUser(userId);
        // Refresh local state immediately after deletion
        refreshList();
        showToast?.('Member access revoked permanently', 'info');
      } catch (error) {
        console.error('Failed to delete user:', error);
        showToast?.('An error occurred during account revocation.', 'error');
      }
    }
  };

  const handleRoleChange = (id: string, role: Role) => {
    const target = db.getUsers().find(u => u.id === id);
    if (target) {
      try {
        const updated = { ...target, role };
        db.updateUser(updated);
        // Sync local UI
        refreshList();
        showToast?.(`Permissions updated to ${role} for ${target.username}`, 'success');
      } catch (error) {
        console.error('Failed to update role:', error);
        showToast?.('Failed to modify access tier.', 'error');
      }
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center space-x-6">
          <button 
            onClick={onBack} 
            className="p-4 hover:bg-black hover:text-white bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm transition-all"
            title="Return to Dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight uppercase">Team Roster</h1>
            <p className="text-slate-500 mt-2 font-medium">Manage collaborators and provision access tiers for the platform.</p>
          </div>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-amber-200 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            <span className="uppercase text-xs tracking-widest font-black">Invite Member</span>
          </button>
        )}
      </header>

      {isAdding && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-amber-200 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full -mr-16 -mt-16"></div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Invite Collaborator</h2>
              <p className="text-sm text-slate-500 font-medium">Specify details and access permissions for the new team member.</p>
            </div>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all shadow-sm">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
              <input 
                required
                placeholder="Name" 
                className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 outline-none focus:border-amber-400 font-bold text-slate-800 transition-all"
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <input 
                required
                type="email"
                placeholder="email@chaishorts.com" 
                className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 outline-none focus:border-amber-400 font-bold text-slate-800 transition-all"
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Temp Security Key</label>
              <input 
                required
                type="password"
                placeholder="••••••••" 
                className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 outline-none focus:border-amber-400 font-bold text-slate-800 transition-all"
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Access Tier</label>
              <div className="relative">
                <select 
                  className="w-full bg-slate-50 border-slate-200 border-2 rounded-2xl p-4 outline-none focus:border-amber-400 font-black text-slate-700 transition-all appearance-none cursor-pointer"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
                >
                  {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-black text-amber-400 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all transform active:scale-95">Invite Member</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-10 py-6">Identity</th>
                <th className="px-10 py-6">Email Address</th>
                <th className="px-10 py-6">Access Level</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black text-sm uppercase shadow-md group-hover:rotate-6 transition-transform">
                          {u.username ? u.username.charAt(0).toUpperCase() : '?'}
                       </div>
                       <div>
                          <span className="font-black text-slate-900 block leading-none">{u.username || 'Anonymous'}</span>
                          {u.id === 'u1' && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase mt-1 inline-block border border-amber-200/50">Primary Owner</span>}
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-slate-500 font-bold">{u.email}</td>
                  <td className="px-10 py-6">
                    <div className="relative inline-block">
                      <select 
                        value={u.role}
                        disabled={u.id === 'u1'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="bg-slate-100 font-black text-slate-800 text-[10px] uppercase tracking-widest focus:ring-2 focus:ring-amber-500 cursor-pointer border-none outline-none py-1.5 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-slate-200"
                      >
                        {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    {u.id !== 'u1' ? (
                      <button 
                        onClick={() => handleDelete(u.id, u.username)}
                        className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                        title="Permanently Revoke Access"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    ) : (
                      <div className="w-11 h-11 inline-flex items-center justify-center text-slate-200" title="Locked: Hard-coded Administrator Account">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-24 text-center">
                    <div className="inline-block p-6 bg-slate-50 rounded-full mb-4">
                      <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">The roster is currently empty.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
