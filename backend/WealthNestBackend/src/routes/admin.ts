import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { isAdmin, isSuperAdmin, logAdminAction } from '../middleware/adminAuth';
import axios from 'axios';

const router = Router();

// Get admin info
router.get('/me', isAdmin, async (req: Request, res: Response) => {
  try {
    res.json({ admin: req.admin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
router.get('/dashboard', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    // Get total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get banned users
    const { count: bannedUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'banned');

    // Get pending transactions
    const { count: pendingTransactions } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get system funds (sum of all wallet balances)
    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('balance');

    const systemFunds = wallets?.reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0) || 0;

    res.json({
      totalUsers: totalUsers || 0,
      bannedUsers: bannedUsers || 0,
      pendingTransactions: pendingTransactions || 0,
      systemFunds,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get users with pagination, search, and filters
router.get('/users', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      users: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Ban/unban user
router.post('/users/:id/ban', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin || !req.admin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const userId = req.params.id;
    const { ban } = req.body; // true to ban, false to unban

    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('user_id, email, status')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newStatus = ban ? 'banned' : 'active';
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ status: newStatus })
      .or(`user_id.eq.${userId},id.eq.${userId}`);

    if (updateError) throw updateError;

    // Log admin action
    await logAdminAction(
      req.admin.admin_id,
      req.admin.email,
      ban ? 'ban_user' : 'unban_user',
      { userId, userEmail: user.email, previousStatus: user.status, newStatus },
      req.ip,
      req.get('user-agent')
    );

    res.json({ message: `User ${ban ? 'banned' : 'unbanned'} successfully` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get transactions with filters
router.get('/transactions', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const from = req.query.from as string;
    const to = req.query.to as string;
    const flagged = req.query.flagged === 'true';


    // First get transactions
    let query = supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (search && search.length >= 8) {
      // Filter transactions by user_id containing search string (partial UUID match)
      query = query.ilike('user_id', `%${search}%`);
    }

    if (from) {
      query = query.gte('created_at', from);
    }

    if (to) {
      query = query.lte('created_at', to);
    }

    const { data: transactions, error, count } = await query;

    if (error) throw error;

    res.json({
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark transaction as resolved
router.post('/transactions/:id/resolve', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin || !req.admin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const transactionId = req.params.id;

    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'completed' })
      .eq('transaction_id', transactionId);

    if (updateError) throw updateError;

    // Log admin action
    await logAdminAction(
      req.admin.admin_id,
      req.admin.email,
      'resolve_transaction',
      { transactionId },
      req.ip,
      req.get('user-agent')
    );

    res.json({ message: 'Transaction marked as resolved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get assets
router.get('/assets', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;

    const { data, error, count } = await supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    res.json({
      assets: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create asset
router.post('/assets', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin || !req.admin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const { asset_type, symbol, name, current_price } = req.body;

    if (!asset_type || !symbol || !name || current_price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabaseAdmin
      .from('assets')
      .insert({
        asset_type,
        symbol,
        name,
        current_price,
      })
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await logAdminAction(
      req.admin.admin_id,
      req.admin.email,
      'create_asset',
      { assetId: data.asset_id, symbol, name, price: current_price },
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json({ asset: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update asset (especially price)
router.put('/assets/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin || !req.admin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const assetId = req.params.id;
    const { current_price, ...otherFields } = req.body;

    // Get old price for audit
    const { data: oldAsset } = await supabaseAdmin
      .from('assets')
      .select('current_price, symbol, name')
      .eq('asset_id', assetId)
      .single();

    if (!oldAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const updateData: any = { ...otherFields };
    if (current_price !== undefined) {
      updateData.current_price = current_price;
    }

    const { data, error } = await supabaseAdmin
      .from('assets')
      .update(updateData)
      .eq('asset_id', assetId)
      .select()
      .single();

    if (error) throw error;

    // Log price change to audit
    if (current_price !== undefined && oldAsset.current_price !== current_price) {
      await logAdminAction(
        req.admin.admin_id,
        req.admin.email,
        'update_asset_price',
        {
          assetId,
          symbol: oldAsset.symbol,
          oldPrice: oldAsset.current_price,
          newPrice: current_price,
          priceDiff: current_price - oldAsset.current_price,
        },
        req.ip,
        req.get('user-agent')
      );

    }

    res.json({ asset: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete asset
router.delete('/assets/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin || !req.admin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const assetId = req.params.id;

    const { error } = await supabaseAdmin
      .from('assets')
      .delete()
      .eq('asset_id', assetId);

    if (error) throw error;

    // Log admin action
    await logAdminAction(
      req.admin.admin_id,
      req.admin.email,
      'delete_asset',
      { assetId },
      req.ip,
      req.get('user-agent')
    );

    res.json({ message: 'Asset deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs (only from admin_audit_log table)
router.get('/audit-logs', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const action = req.query.action as string;
    const adminId = req.query.admin_id as string;

    // Fetch audit logs with pagination
    let auditQuery = supabaseAdmin
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (action) {
      auditQuery = auditQuery.eq('action', action);
    }

    if (adminId) {
      auditQuery = auditQuery.eq('admin_id', adminId);
    }

    const { data: auditLogs, error: auditError, count } = await auditQuery;

    if (auditError) {
      console.error('Error fetching audit logs:', auditError);
      throw auditError;
    }

    // Format audit logs
    const formattedLogs = (auditLogs || []).map((log: any) => ({
      id: log.log_id,
      type: 'audit',
      timestamp: log.timestamp,
      admin_id: log.admin_id,
      action: log.action,
      details: log.details,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
    }));

    res.json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get admin login logs
router.get('/login-logs', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const { data, error, count } = await supabaseAdmin
      .from('admin_log')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    res.json({
      logs: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all admins (superadmin only)
router.get('/admins', isSuperAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('admin_id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ admins: data || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create admin (superadmin only)
router.post('/create-admin', isSuperAdmin, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin || !req.admin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const { email, name, role, password } = req.body;

    if (!email || !name || !role || !password) {
      return res.status(400).json({ error: 'Email, name, role, and password are required' });
    }

    if (!['superadmin', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Create Supabase auth user first
    let supabaseUserId: string | null = null;
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name,
          role: 'admin',
        },
      });

      if (authError) {
        // If user already exists in auth, try to get the existing user
        if (authError.message.includes('already registered')) {
          const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
          const user = existingUser?.users.find(u => u.email === email);
          if (user) {
            supabaseUserId = user.id;
          } else {
            return res.status(409).json({ error: 'User with this email already exists in auth' });
          }
        } else {
          throw authError;
        }
      } else if (authData?.user) {
        supabaseUserId = authData.user.id;
      }
    } catch (authErr: any) {
      console.error('Error creating Supabase auth user:', authErr);
      return res.status(500).json({ error: `Failed to create auth user: ${authErr.message}` });
    }

    // Create admin record
    const { data, error } = await supabaseAdmin
      .from('admins')
      .insert({
        email,
        name,
        role,
        supabase_user_id: supabaseUserId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Admin with this email already exists' });
      }
      throw error;
    }

    // Log admin action
    await logAdminAction(
      req.admin.admin_id,
      req.admin.email,
      'create_admin',
      { newAdminId: data.admin_id, email, name, role },
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json({ admin: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run reconciliation (proxies to .NET module)
router.post('/reconcile', isAdmin, async (req: Request, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(500).json({ error: 'Admin not authenticated' });
    }

    const dotnetUrl = process.env.DOTNET_ADMIN_URL || 'http://localhost:5001';
    const { from, to } = req.body;

    // Log that reconciliation is being triggered
    await logAdminAction(
      req.admin.admin_id,
      req.admin.email,
      'trigger_reconciliation',
      { from, to },
      req.ip,
      req.get('user-agent')
    );

    // Proxy to .NET reconciliation service
    // .NET expects capitalized property names: From, To
    const response = await axios.post(`${dotnetUrl}/api/admin/reconcile`, {
      From: from,
      To: to,
    }, {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Log reconciliation completion
    await logAdminAction(
      req.admin.admin_id,
      req.admin.email,
      'reconciliation_completed',
      { 
        success: true,
        discrepancies: response.data.discrepancies?.length || 0,
      },
      req.ip,
      req.get('user-agent')
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Reconciliation error:', error);
    
    // Log reconciliation failure
    if (req.admin) {
      await logAdminAction(
        req.admin.admin_id,
        req.admin.email,
        'reconciliation_failed',
        { error: error.message },
        req.ip,
        req.get('user-agent')
      );
    }

    if (error.response) {
      // .NET service returned an error
      const errorMessage = error.response.data?.message || error.response.data?.error || 'Reconciliation failed';
      console.error('Reconciliation service error:', error.response.status, errorMessage);
      res.status(error.response.status).json({ 
        error: errorMessage,
        details: error.response.data 
      });
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      res.status(503).json({ 
        error: 'Reconciliation service unavailable. Please ensure .NET service is running on port 5001.',
        code: error.code 
      });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(504).json({ 
        error: 'Reconciliation service timeout. The operation took too long.',
        code: error.code 
      });
    } else {
      console.error('Unexpected reconciliation error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to reach reconciliation service',
        code: error.code 
      });
    }
  }
});

// Generate reports (placeholder - can be extended)
router.get('/reports', isAdmin, async (req: Request, res: Response) => {
  try {
    const reportType = req.query.type as string;
    const format = req.query.format as string || 'json';

    // For now, return JSON. Can be extended to CSV/PDF
    if (format === 'json') {
      // Get dashboard stats as report
      const { count: totalUsers } = await supabaseAdmin
        ?.from('users')
        .select('*', { count: 'exact', head: true }) || { count: 0 };

      res.json({ reportType, data: { totalUsers: totalUsers || 0 } });
    } else {
      res.status(400).json({ error: 'Unsupported report format' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

