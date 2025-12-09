import { Router, Request, Response } from 'express';
import { User } from '@supabase/supabase-js';
import { supabase, supabaseAdmin, createUserClient } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import { logAdminLogin, logAdminAction } from '../middleware/adminAuth';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const router = Router();

// Sign up a new user
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Try signup - disable email confirmation to avoid trigger issues
    // Note: This requires email confirmations to be disabled in Supabase dashboard
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
        // Don't set emailRedirectTo to avoid potential trigger issues
      },
    });

    if (error) {
      console.error('Signup auth error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // If it's a database error, provide more helpful message
      if (error.message.includes('Database error') || error.code === 'unexpected_failure') {
        return res.status(500).json({ 
          error: 'Database error during signup. This is likely caused by a database trigger that runs when creating a new user. Please check your Supabase dashboard for triggers on the auth.users table, or contact support.',
          code: error.code,
          details: error.message,
          suggestion: 'Check your Supabase dashboard → Database → Functions/Triggers for any triggers on auth.users table that might be failing.'
        });
      }
      return res.status(400).json({ error: error.message });
    }
    
    if (data.user) {
      // Use admin client to bypass RLS for user profile and wallet creation
      const client = supabaseAdmin || supabase;
      
      // Wait a bit to allow any database trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // First, check if user profile exists (trigger should have created it)
      let userProfile = null;
      const { data: existingUserById } = await client
        .from('users')
        .select('user_id, id, email')
        .or(`id.eq.${data.user.id},user_id.eq.${data.user.id},email.eq.${email}`)
        .maybeSingle();
      
      userProfile = existingUserById;

      // If user profile doesn't exist, create it manually (fallback if trigger didn't run)
      if (!userProfile) {
        console.log('User profile not found - creating manually as fallback');
        console.log('Auth user id:', data.user.id);
        console.log('Auth user email:', data.user.email);
        
        // user_id is UUID type, so we can store the auth UUID directly
        // Use admin client to bypass RLS - CRITICAL for inserting users
        if (!supabaseAdmin) {
          console.error('WARNING: SUPABASE_SERVICE_ROLE_KEY not set! User profile creation will likely fail due to RLS.');
        }
        const adminClient = supabaseAdmin || client;
      
        // Get name from user_metadata (set during signUp) or from request body
        const userName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || name || '';
        
        console.log('Attempting to insert user profile with:', {
          user_id: data.user.id,
          email: data.user.email || email,
          name: userName || '(empty - user can set later)'
        });
        
        // Insert user profile using the format you specified
        // Include password_hash as it's required by the schema
        const { error: insertError } = await adminClient.from("users").insert({
          user_id: data.user.id,
          name: userName, // Use name from signup form (stored in user_metadata)
          email: data.user.email || email,
          password_hash: 'managed-by-supabase-auth' // Placeholder since Supabase Auth handles passwords
        });
        
        if (insertError) {
          console.error('Failed to insert user profile:', insertError);
          console.error('Error details:', JSON.stringify(insertError, null, 2));
        } else {
          console.log('User profile insert completed successfully');
          
          // Wait a moment for the insert to complete
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Fetch the created user to verify and use for wallet creation
          const { data: createdUser, error: fetchError } = await adminClient
            .from('users')
            .select('user_id, id, email')
            .eq('user_id', data.user.id)
            .maybeSingle();
          
          if (fetchError) {
            console.error('Failed to fetch created user profile:', fetchError);
          } else if (createdUser) {
            userProfile = createdUser;
            console.log('Successfully created and verified user profile with UUID user_id:', createdUser.user_id);
          } else {
            console.warn('User profile creation completed but could not fetch it');
          }
        }
      }

      // Now create wallet if user profile exists
      if (userProfile) {
        const userIdForWallet = (userProfile as any).user_id || (userProfile as any).id || data.user.id;
        
        // Use UPSERT to ensure only one wallet per user
        // This will insert if it doesn't exist, or return existing wallet if it does
        const { data: walletData, error: walletError } = await client
          .from('wallets')
          .upsert({ 
            user_id: userIdForWallet,
            balance: 0,
            currency: 'INR',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
          .select('wallet_id, balance, currency, user_id')
          .maybeSingle();

        if (walletError) {
          console.error('Error creating wallet:', walletError);
          // Don't fail signup if wallet creation fails - can be created later
        } else {
          console.log('Successfully created wallet for user');
        }
      } else {
        console.warn('Could not create user profile - wallet will be created later');
      }
    }

    res.status(201).json({ 
      user: data.user,
      session: data.session,
      message: 'User created successfully. Please check your email to verify your account.' 
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// Sign in a user
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    res.json({ 
      user: data.user, 
      session: data.session 
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login endpoint that checks admin status and routes accordingly
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Accept either Supabase token in Authorization header or email/password in body
    let token: string | undefined;
    let user: User | null = null;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      // Token-based login
      token = req.headers.authorization.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      user = authUser;
    } else {
      // Email/password login (for backward compatibility)
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required, or provide Authorization token' });
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Check if this email belongs to an admin before logging
        if (supabaseAdmin) {
          const { data: adminCheck } = await supabaseAdmin
            .from('admins')
            .select('admin_id, email')
            .eq('email', email)
            .maybeSingle();
          
          if (adminCheck) {
            // This is an admin login attempt that failed
            await logAdminLogin(null, email, 'login_failed', req.ip, req.get('user-agent'));
            
            // Also log to audit log
            await logAdminAction(
              adminCheck.admin_id,
              email,
              'admin_login_failed',
              { 
                reason: error.message,
                loginMethod: 'password',
              },
              req.ip,
              req.get('user-agent')
            );
          } else {
            // Regular user login failure, just log to admin_log
            await logAdminLogin(null, email, 'login_failed', req.ip, req.get('user-agent'));
          }
        }
        return res.status(401).json({ error: error.message });
      }
      user = data.user;
      token = data.session?.access_token;
    }

    if (!user || !token) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Check if user is an admin
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('admin_id, email, name, role, is_active')
      .or(`email.eq.${user.email},supabase_user_id.eq.${user.id}`)
      .eq('is_active', true)
      .maybeSingle();

    // Log admin login attempt
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    if (admin && !adminError) {
      // User is an admin
      await logAdminLogin(admin.admin_id, admin.email, 'login_success', ipAddress, userAgent);
      
      // Also log to audit log
      await logAdminAction(
        admin.admin_id,
        admin.email,
        'admin_login',
        { 
          loginMethod: req.headers.authorization?.startsWith('Bearer ') ? 'token' : 'password',
          userAgent: userAgent,
        },
        ipAddress,
        userAgent
      );
      
      return res.json({
        isAdmin: true,
        role: admin.role,
        admin: {
          admin_id: admin.admin_id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
        user: {
          id: user.id,
          email: user.email,
        },
        token,
      });
    } else {
      // User is not an admin
      return res.json({
        isAdmin: false,
        user: {
          id: user.id,
          email: user.email,
        },
        token,
      });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user profile - try by email first, then by user_id
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', req.user.email)
      .maybeSingle();

    if (error) throw error;
    res.json({ user: { ...req.user, ...profile } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Sign out
router.post('/signout', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ message: 'Successfully signed out' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Check if user has PIN set
router.get('/pin/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    const client = supabaseAdmin || (token ? createUserClient(token) : supabase);

    const { data: user, error } = await client
      .from('users')
      .select('pin')
      .eq('email', req.user.email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const hasPin = user?.pin !== null && user?.pin !== undefined;
    res.json({ hasPin, pinSet: hasPin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Set PIN (for first-time setup)
router.post('/pin/set', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { pin } = req.body;
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    const client = supabaseAdmin || (token ? createUserClient(token) : supabase);

    const { error } = await client
      .from('users')
      .update({ pin: parseInt(pin, 10) })
      .eq('email', req.user.email);

    if (error) throw error;

    res.json({ message: 'PIN set successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify PIN
router.post('/pin/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { pin } = req.body;
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    const client = supabaseAdmin || (token ? createUserClient(token) : supabase);

    const { data: user, error } = await client
      .from('users')
      .select('pin')
      .eq('email', req.user.email)
      .maybeSingle();

    if (error) throw error;

    if (!user || user.pin === null || user.pin === undefined) {
      return res.status(404).json({ error: 'PIN not set. Please set your PIN first.' });
    }

    if (user.pin !== parseInt(pin, 10)) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    res.json({ message: 'PIN verified successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Change PIN (requires password and partial phone verification)
router.post('/pin/change', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { password, partialPhone, newPin } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (!partialPhone || partialPhone.length < 4) {
      return res.status(400).json({ error: 'Please provide last 4 digits of phone number' });
    }
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ error: 'New PIN must be exactly 4 digits' });
    }

    // Verify password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email!,
      password: password,
    });

    if (signInError) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Verify partial phone number
    const token = req.headers.authorization?.split(' ')[1];
    const client = supabaseAdmin || (token ? createUserClient(token) : supabase);

    const { data: user, error: userError } = await client
      .from('users')
      .select('phone')
      .eq('email', req.user.email)
      .maybeSingle();

    if (userError) throw userError;

    if (!user || !user.phone) {
      return res.status(404).json({ error: 'Phone number not found in profile' });
    }

    const phoneLast4 = user.phone.slice(-4);
    if (phoneLast4 !== partialPhone) {
      return res.status(401).json({ error: 'Phone number verification failed' });
    }

    // Update PIN
    const { error: updateError } = await client
      .from('users')
      .update({ pin: parseInt(newPin, 10) })
      .eq('email', req.user.email);

    if (updateError) throw updateError;

    res.json({ message: 'PIN changed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;