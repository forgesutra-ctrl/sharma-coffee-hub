-- Cleanup existing subscriptions before fresh start
-- Backup existing data first, then delete

-- Create backup table
CREATE TABLE IF NOT EXISTS user_subscriptions_backup AS 
SELECT * FROM user_subscriptions;

-- Delete all existing subscriptions (fresh start)
DELETE FROM user_subscriptions;

-- Log the cleanup
DO $$
DECLARE
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM user_subscriptions_backup;
  RAISE NOTICE 'Backed up % subscriptions to user_subscriptions_backup', backup_count;
  RAISE NOTICE 'Deleted all subscriptions from user_subscriptions (fresh start)';
END $$;
