import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import PINModal from './PINModal';
import { ensurePublicUserExists } from '../utils/ensureUser';

export default function PrivateRoute() {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [checkingPIN, setCheckingPIN] = useState(true);
  const [needsPIN, setNeedsPIN] = useState(false);
  const [isSetPINOpen, setIsSetPINOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const authenticated = !!data.session?.user;
      setIsAuthed(authenticated);
      
      if (authenticated && data.session) {
        // Check if user is admin first
        const adminCheck = await fetch('/api/admin/me', {
          headers: {
            'Authorization': `Bearer ${data.session.access_token}`,
          },
        });

        const isAdmin = adminCheck.ok;

        // Only ensure user profile exists if NOT an admin
        if (!isAdmin) {
        await ensurePublicUserExists();
        
          // Check if PIN is set (only for non-admins)
        try {
          const response = await fetch('/api/auth/pin/status', {
            headers: {
              'Authorization': `Bearer ${data.session.access_token}`,
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            setNeedsPIN(!result.hasPin);
            if (!result.hasPin) {
              setIsSetPINOpen(true);
            }
          }
        } catch (err) {
          console.error('Error checking PIN status:', err);
          }
        }
      }
      
      setCheckingPIN(false);
      setLoading(false);
    };
    init();
    
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setIsAuthed(!!session?.user);
      if (session?.user) {
        // Check if user is admin first
        const adminCheck = await fetch('/api/admin/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        const isAdmin = adminCheck.ok;

        // Only ensure user profile exists if NOT an admin
        if (!isAdmin) {
        await ensurePublicUserExists();
        
        try {
          const response = await fetch('/api/auth/pin/status', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            setNeedsPIN(!result.hasPin);
            setIsSetPINOpen(!result.hasPin);
          }
        } catch (err) {
          console.error('Error checking PIN status:', err);
          }
        }
      }
    });
    
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSetPIN = async (pin: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/auth/pin/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set PIN');
      }

      setNeedsPIN(false);
      setIsSetPINOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to set PIN');
      throw err;
    }
  };

  if (loading || checkingPIN) {
    return (
      <div className="center"><div className="spinner" aria-label="loading" /></div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Outlet />
      {needsPIN && (
        <PINModal
          open={isSetPINOpen}
          title="Set Your Transaction PIN"
          hint="Create a 4-digit PIN for transaction security. You'll need this for all buy/sell operations. You can also set it later from your Profile page."
          mode="set"
          onClose={() => {
            // Allow closing, but will show again on next page load if not set
            setIsSetPINOpen(false);
          }}
          onConfirm={handleSetPIN}
        />
      )}
    </>
  );
}
