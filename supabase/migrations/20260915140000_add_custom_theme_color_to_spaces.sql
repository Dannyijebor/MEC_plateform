alter table public.spaces
add column if not exists custom_theme_color text;

notify pgrst, 'reload schema';
