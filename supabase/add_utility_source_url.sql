alter table utility_posts
  add column if not exists source_url text;

-- If older rows store only a URL in body, move it to source_url.
update utility_posts
set source_url = body
where source_url is null
  and body ~* '^https?://';
