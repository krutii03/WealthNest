-- Test data for admin_audit_log table
-- Replace the admin_id with an actual admin_id from your admins table

-- First, get an admin_id to use (run this to see available admins):
-- SELECT admin_id, email, name FROM public.admins LIMIT 1;

-- Sample INSERT queries for testing audit logs
-- Replace 'YOUR_ADMIN_ID_HERE' with an actual UUID from the admins table

-- Example 1: Create asset action
INSERT INTO public.admin_audit_log (admin_id, action, details, timestamp)
VALUES (
  (SELECT admin_id FROM public.admins LIMIT 1), -- Use first admin
  'create_asset',
  '{"assetId": "test-asset-123", "symbol": "TEST", "name": "Test Asset", "price": 100.50}',
  NOW()
);

-- Example 2: Update asset price action
INSERT INTO public.admin_audit_log (admin_id, action, details, timestamp)
VALUES (
  (SELECT admin_id FROM public.admins LIMIT 1),
  'update_asset_price',
  '{"assetId": "test-asset-123", "symbol": "TEST", "oldPrice": 100.50, "newPrice": 105.75, "priceDiff": 5.25}',
  NOW() - INTERVAL '1 hour'
);

-- Example 3: Ban user action
INSERT INTO public.admin_audit_log (admin_id, action, details, timestamp)
VALUES (
  (SELECT admin_id FROM public.admins LIMIT 1),
  'ban_user',
  '{"userId": "user-123", "userEmail": "test@example.com", "previousStatus": "active", "newStatus": "banned"}',
  NOW() - INTERVAL '2 hours'
);

-- Example 4: Unban user action
INSERT INTO public.admin_audit_log (admin_id, action, details, timestamp)
VALUES (
  (SELECT admin_id FROM public.admins LIMIT 1),
  'unban_user',
  '{"userId": "user-123", "userEmail": "test@example.com", "previousStatus": "banned", "newStatus": "active"}',
  NOW() - INTERVAL '3 hours'
);

-- Example 5: Delete asset action
INSERT INTO public.admin_audit_log (admin_id, action, details, timestamp)
VALUES (
  (SELECT admin_id FROM public.admins LIMIT 1),
  'delete_asset',
  '{"assetId": "test-asset-456"}',
  NOW() - INTERVAL '4 hours'
);

-- Example 6: Create admin action (superadmin only)
INSERT INTO public.admin_audit_log (admin_id, action, details, timestamp)
VALUES (
  (SELECT admin_id FROM public.admins WHERE role = 'superadmin' LIMIT 1),
  'create_admin',
  '{"newAdminId": "new-admin-789", "email": "newadmin@example.com", "name": "New Admin", "role": "employee"}',
  NOW() - INTERVAL '5 hours'
);

-- Example 7: Admin login action
INSERT INTO public.admin_audit_log (admin_id, action, details, timestamp)
VALUES (
  (SELECT admin_id FROM public.admins LIMIT 1),
  'admin_login',
  '{"loginMethod": "password", "userAgent": "Mozilla/5.0"}',
  NOW() - INTERVAL '6 hours'
);

-- Example 8: Resolve transaction action
INSERT INTO public.admin_audit_log (admin_id, action, details, timestamp)
VALUES (
  (SELECT admin_id FROM public.admins LIMIT 1),
  'resolve_transaction',
  '{"transactionId": "tx-12345"}',
  NOW() - INTERVAL '1 day'
);

-- To insert multiple test records at once, you can use:
INSERT INTO public.admin_audit_log (admin_id, action, details, timestamp)
SELECT 
  admin_id,
  action,
  details,
  timestamp
FROM (
  VALUES
    ((SELECT admin_id FROM public.admins LIMIT 1), 'create_asset', '{"test": "data1"}'::text, NOW()),
    ((SELECT admin_id FROM public.admins LIMIT 1), 'update_asset_price', '{"test": "data2"}'::text, NOW() - INTERVAL '1 hour'),
    ((SELECT admin_id FROM public.admins LIMIT 1), 'ban_user', '{"test": "data3"}'::text, NOW() - INTERVAL '2 hours'),
    ((SELECT admin_id FROM public.admins LIMIT 1), 'delete_asset', '{"test": "data4"}'::text, NOW() - INTERVAL '3 hours')
) AS t(admin_id, action, details, timestamp);

-- To verify the inserts worked:
-- SELECT * FROM public.admin_audit_log ORDER BY timestamp DESC LIMIT 10;

