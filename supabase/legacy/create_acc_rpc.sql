CREATE OR REPLACE FUNCTION public.decrement_accessory_stock(acc_id UUID, qty INT)
RETURNS void AS $$
BEGIN
  UPDATE public.accessories
  SET stock = stock - qty
  WHERE id = acc_id AND stock >= qty;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
