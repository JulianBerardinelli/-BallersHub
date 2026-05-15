-- Fix search_path for functions that use unaccent
-- Since unaccent was moved to the extensions schema, these functions need 'extensions' in their search path
ALTER FUNCTION public.country_guess_code(text) SET search_path = public, extensions;
ALTER FUNCTION public.country_guess_codes(text[]) SET search_path = public, extensions;
ALTER FUNCTION public.slugify(text) SET search_path = public, extensions;
