-- When every ticket in an order is cancelled (by the holder, an admin or an
-- event cancellation), the order is cancelled too. Add-on stock and promo
-- code uses only count paid / pending orders, so they become available again.
--
-- Partly cancelled orders keep their add-ons: those belong to the order, not
-- to one seat. Once a payment provider is live, refunds will move orders to
-- 'refunded' instead; for now no money was taken.

create or replace function public.cancel_order_when_tickets_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.order_id is not null
     and new.status = 'cancelled'
     and old.status is distinct from 'cancelled'
     and not exists (
       select 1 from public.tickets t
       where t.order_id = new.order_id and t.status in ('active', 'used')
     ) then
    update public.orders
    set status = 'cancelled'
    where id = new.order_id and status in ('paid', 'pending_payment');
  end if;
  return null;
end;
$$;

revoke execute on function public.cancel_order_when_tickets_cancelled() from public, anon, authenticated;

drop trigger if exists tickets_cancel_order on public.tickets;
create trigger tickets_cancel_order
  after update of status on public.tickets
  for each row execute procedure public.cancel_order_when_tickets_cancelled();
