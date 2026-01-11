
import React, { useState, useCallback, useEffect } from 'react';
import { db } from '../store';
import { User, Role } from '../types';

interface UserManagementProps {
  currentUser: User;
  onLogout: () => void;
  onBack: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onLogout, onBack, showToast }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: Role.VIEWER
  });

  const refreshList = useCallback(async () => {
    // Force a minor sync with the server if possible, or just get from local store
    // Since store.ts updates this.users internally on successful API calls, db.getUsers() should be fresh
    const latest = db.getUsers();
    setUsers([...latest]);
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newUser.email.trim().toLowerCase();
    
    if (db.getUserByEmail(cleanEmail)) {
      showToast?.(`Conflict: An account for "${cleanEmail}" is already registered.`, 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // CRITICAL: Must await the creation to ensure internal store is updated before refresh
      await db.createUser({ ...newUser, email: cleanEmail });
      await refreshList();
      setIsAdding(false);
      setNewUser({ username: '', email: '', password: '', role: Role.VIEWER });
      showToast?.('Team member added successfully', 'success');
    } catch (error: any) {
      showToast?.(error.message || 'Failed to add user.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === 'u1') {
      showToast?.('Protection Error: The primary admin account cannot be removed.', 'error');
      return;
    }
    
    const isSelf = userId === currentUser.id;
    const confirmMessage = isSelf 
      ? `CRITICAL WARNING: You are deleting YOUR OWN account ("${userName}").\n\nYou will be logged out immediately and lose all platform access. Continue?`
      : `Are you sure you want to permanently revoke all access for "${userName}"?\n\nThis action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      setIsProcessing(true);
      try {
        // CRITICAL: Must await the deletion to ensure internal store is updated before refresh
        await db.deleteUser(userId);
        
        if (isSelf) {
          onLogout();
        } else {
          await refreshList();
          showToast?.(`Access revoked for ${userName}`, 'info');
        }
      } catch (error: any) {
        showToast?.(error.message || 'Deletion failed.', 'error');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleRoleChange = async (id: string, role: Role) => {
    setIsProcessing(true);
    try {
      const target = db.getUsers().find(u => u.id === id);
      if (target) {
        await db.updateUser({ ...target, role });
        await refreshList();
        showToast?.(`Permissions updated for ${target.username}`, 'success');
      }
    } catch (error) {
      showToast?.('Failed to update role.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-8 pb-12 animate-fade-in ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}>
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center space-x-6">
          <button 
            onClick={onBack} 
            className="p-4 hover:bg-black hover:text-white bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight uppercase">Team Roster</h1>
            <p className="text-slate-500 mt-2 font-medium">Manage collaborators and provision access tiers.</p>
          </div>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-black py-3.5 px-8 rounded-2xl shadow-lg transition-all transform active:scale-95 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            <span className="uppercase text-xs tracking-widest">Invite Member</span>
          </button>
        )}
      </header>

      {isAdding && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-amber-200 animate-fade-in relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">New Invitation</h2>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-slate-50 rounded-xl transition-all">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Name</label>
              <input 
                required
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 outline-none focus:border-amber-400 font-bold"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</label>
              <input 
                required
                type="email"
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 outline-none focus:border-amber-400 font-bold"
                placeholder="email@company.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input 
                required
                type="password"
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 outline-none focus:border-amber-400 font-bold"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Role</label>
              <select 
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 outline-none focus:border-amber-400 font-black cursor-pointer"
              >
                {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-black text-amber-400 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">Invite</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-10 py-6">Member</th>
                <th className="px-10 py-6">Email Address</th>
                <th className="px-10 py-6">Access Role</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black text-sm border-2 border-white shadow-sm">
                          {u.username.charAt(0).toUpperCase()}
                       </div>
                       <div>
                          <span className="font-black text-slate-900 block leading-none">{u.username}</span>
                          {u.id === 'u1' && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase mt-1 inline-block border border-amber-100">Owner</span>}
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-slate-500 font-bold">{u.email}</td>
                  <td className="px-10 py-6">
                    <select 
                      value={u.role}
                      disabled={u.id === 'u1'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      className={`bg-slate-100 font-black text-slate-800 text-[10px] uppercase tracking-widest py-1.5 px-4 rounded-xl border-none outline-none cursor-pointer transition-all ${u.id === 'u1' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200'}`}
                    >
                      {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-10 py-6 text-right">
                    {u.id !== 'u1' ? (
                      <button 
                        onClick={() => handleDelete(u.id, u.username)}
                        className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                        title="Delete User"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    ) : (
                      <div className="p-3 text-slate-200 cursor-not-allowed" title="Protected account">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                   <td colSpan={4} className="px-10 py-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs">
                      No team members found
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
