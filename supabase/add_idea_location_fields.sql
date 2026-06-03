alter table ideas
  add column if not exists street_name text,
  add column if not exists district text check (district in ('Center','Varoš','Trizla','Točila','Rid','Tipski','Boncejca','KorzoMaalo')),
  add column if not exists lat double precision,
  add column if not exists lng double precision;
