import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken } from './auth';

// Extend Express Request type for admin
declare global {
  namespace Express {
    interface Request {
      admin?: {
        admin_id: string;
        email: string;
        name: string;
        role: 'superadmin' | 'employee';
        is_active: boolean;
      };
    }
  }
}

// Middleware to check if user is an admin
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First verify the token
    await new Promise<void>((resolve, reject) => {
      authenticateToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user is an admin
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('admin_id, email, name, role, is_active')
      .or(`email.eq.${req.user.email},supabase_user_id.eq.${req.user.id}`)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error checking admin status:', error);
      return res.status(500).json({ error: 'Error checking admin status' });
    }

    if (!admin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Add admin info to request
    req.admin = admin;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user is superadmin
export const isSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First check if user is admin
    await new Promise<void>((resolve, reject) => {
      isAdmin(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.admin || req.admin.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin privileges required.' });
    }

    next();
  } catch (error: any) {
    return res.status(403).json({ error: 'Access denied. Superadmin privileges required.' });
  }
};

// Helper function to log admin action
export const logAdminAction = async (
  adminId: string | null,
  email: string,
  action: string,
  details: any,
  ipAddress?: string,
  userAgent?: string
) => {
  if (!supabaseAdmin) return;

  try {
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
    const { error: insertError } = await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: adminId,
      action,
      details: detailsStr,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    });
    if (insertError) {
      console.error('Failed to log admin action:', insertError);
    }
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

// Helper function to log admin login event
export const logAdminLogin = async (
  adminId: string | null,
  email: string,
  event: 'login_success' | 'login_failed',
  ipAddress?: string,
  userAgent?: string,
  metadata?: any
) => {
  if (!supabaseAdmin) {
    console.error('[LOGIN LOG] ERROR: Admin client not configured');
    return;
  }

  try {
    console.log(`[LOGIN LOG] Attempting to log ${event} for admin: ${email} (${adminId || 'no admin_id'})`);
    const { data, error } = await supabaseAdmin.from('admin_log').insert({
      admin_id: adminId,
      email,
      event,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: metadata || {},
    }).select();
    
    if (error) {
      console.error('[LOGIN LOG] Failed to log admin login:', error);
      console.error('[LOGIN LOG] Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log(`[LOGIN LOG] Successfully logged ${event} for ${email}`);
    }
  } catch (error) {
    console.error('[LOGIN LOG] Exception logging admin login:', error);
  }
};

