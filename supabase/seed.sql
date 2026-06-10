-- Catalog seed data. Idempotent-ish: run on a fresh DB after migrations.
-- Slots are generated from a shared time grid per gym.

insert into public.gyms (id,name,area,city,lat,lng,rating,reviews,price_from,crowd,crowd_updated_at,amenities,image_url,images,about,timings) values
('g1','IronCore Fitness','Indiranagar','Bengaluru',12.9719,77.6412,4.6,318,119,'Low',now()-interval '3 min',
 array['Cardio','Weights','Shower','AC','Locker'],
 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80',
 array['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?auto=format&fit=crop&w=900&q=80'],
 'Fully-equipped strength & conditioning gym with free weights, machines, and a dedicated functional zone.','5:00 AM – 11:00 PM'),
('g2','PulseFit Studio','Koramangala','Bengaluru',12.9352,77.6245,4.4,204,99,'Moderate',now()-interval '8 min',
 array['Cardio','AC','Shower','Parking'],
 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
 array['https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80'],
 'Boutique cardio + HIIT studio. Great for quick 30-minute sessions.','6:00 AM – 10:00 PM'),
('g3','Titan Strength Lab','HSR Layout','Bengaluru',12.9116,77.6473,4.8,512,149,'High',now()-interval '2 min',
 array['Weights','CrossFit','Shower','Parking','Locker'],
 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=900&q=80',
 array['https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?auto=format&fit=crop&w=900&q=80'],
 'Powerlifting & CrossFit focused box. Calibrated plates, platforms, and rigs.','5:30 AM – 11:00 PM'),
('g4','FlexZone Community Gym','Whitefield','Bengaluru',12.9698,77.7500,4.1,96,79,'Unknown',now()-interval '75 min',
 array['Cardio','Weights','Parking'],
 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=900&q=80',
 array['https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=900&q=80'],
 'Friendly neighbourhood community gym with budget-friendly slots.','6:00 AM – 10:00 PM'),
('g5','Apex Wellness Club','JP Nagar','Bengaluru',12.9077,77.5851,4.5,271,129,'Low',now()-interval '12 min',
 array['Cardio','Weights','Shower','AC','Parking','Locker'],
 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',
 array['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80','https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80'],
 'Premium wellness club with a spacious floor, sauna, and group class studio.','5:00 AM – 11:30 PM')
on conflict (id) do nothing;

do $$
declare
  g record; base int; t text; i int;
  times text[] := array['06:00','07:00','08:00','11:00','13:00','17:00','18:30','19:30','20:30'];
  dur int; price int; is_peak boolean;
begin
  for g in select id from public.gyms loop
    base := case g.id when 'g1' then 199 when 'g2' then 149 when 'g3' then 179 when 'g4' then 99 else 169 end;
    i := 0;
    foreach t in array times loop
      is_peak := (t >= '17:00' or t <= '08:00');
      dur := case when i % 3 = 0 then 30 else 60 end;
      price := case when is_peak then base + 50 else base end;
      if dur = 30 then price := round(price * 0.7); end if;
      insert into public.slots (id, gym_id, time, duration, price, capacity, peak, sort_order)
      values (g.id || '-' || t || '-' || dur, g.id, t, dur, price, 12, is_peak, i)
      on conflict (id) do nothing;
      i := i + 1;
    end loop;
  end loop;
end $$;

insert into public.trainers (id,name,specializations,experience_years,rating,fee_30,fee_60,languages,avatar_url,bio) values
('t1','Rohan Mehta',array['Strength','Fat loss'],6,4.7,199,349,array['English','Hindi'],
 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=400&q=80','NASM-certified strength coach focused on sustainable fat loss and progressive overload.'),
('t2','Aisha Khan',array['HIIT','Mobility','Rehab'],4,4.8,179,329,array['English','Kannada'],
 'https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=400&q=80','Movement and mobility specialist. Great for return-to-training and injury-aware programming.'),
('t3','Vikram Rao',array['Powerlifting','CrossFit'],9,4.9,249,449,array['English','Telugu','Hindi'],
 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=400&q=80','National-level powerlifter. Technical coaching for squat, bench, deadlift and competition prep.')
on conflict (id) do nothing;

insert into public.events (id,gym_id,gym_name,title,category,description,event_date,event_time,duration_mins,capacity,reserved_seed,price,image_url,what_to_bring) values
('e1','g1','IronCore Fitness','Saturday Cardio Bootcamp','Bootcamp','High-energy 45-minute outdoor-style bootcamp. All levels welcome.','Sat, 14 Jun','07:00 AM',45,30,18,0,
 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80','Water bottle, towel, training shoes'),
('e2','g5','Apex Wellness Club','Sunrise Yoga & Breathwork','Yoga','Start your day grounded. A calming flow followed by guided breathwork.','Sun, 15 Jun','06:30 AM',60,20,11,149,
 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80','Yoga mat (or rent ₹20 on site)'),
('e3','g3','Titan Strength Lab','Deadlift Technique Workshop','Workshop','Dial in your deadlift with a national-level coach. Video form review included.','Sat, 14 Jun','05:00 PM',90,12,9,299,
 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=900&q=80','Lifting shoes, chalk optional'),
('e4','g2','PulseFit Studio','Free Open House & Tour','Open House','Drop in for a free guided tour, a sample HIIT class, and a smoothie on us.','Fri, 13 Jun','06:00 PM',60,40,22,0,
 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80','Just yourself!')
on conflict (id) do nothing;
