-- Migration: Auto-sync unit status based on lease status
-- When a lease becomes 'active', mark the unit as 'occupied'
-- When a lease is terminated/expired/etc., mark the unit as 'vacant' (if no other active lease)

-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION sync_unit_status_from_lease()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Check if there's any active lease for this unit
  SELECT COUNT(*) INTO active_count
  FROM public.leases
  WHERE unit_id = COALESCE(NEW.unit_id, OLD.unit_id)
    AND status = 'active';

  IF active_count > 0 THEN
    UPDATE public.units
    SET status = 'occupied', updated_at = now()
    WHERE id = COALESCE(NEW.unit_id, OLD.unit_id)
      AND status != 'maintenance'; -- don't override maintenance status
  ELSE
    UPDATE public.units
    SET status = 'vacant', updated_at = now()
    WHERE id = COALESCE(NEW.unit_id, OLD.unit_id)
      AND status = 'occupied'; -- only revert if currently occupied
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_sync_unit_status ON public.leases;

-- Step 3: Create trigger on leases table
CREATE TRIGGER trg_sync_unit_status
AFTER INSERT OR UPDATE OF status ON public.leases
FOR EACH ROW
EXECUTE FUNCTION sync_unit_status_from_lease();

-- Step 4: Backfill existing data — mark units as occupied where active leases exist
UPDATE public.units u
SET status = 'occupied', updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.leases l
  WHERE l.unit_id = u.id AND l.status = 'active'
)
AND u.status != 'maintenance';

-- Step 5: Mark units as vacant where no active lease exists and currently marked occupied
UPDATE public.units u
SET status = 'vacant', updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.leases l
  WHERE l.unit_id = u.id AND l.status = 'active'
)
AND u.status = 'occupied';
