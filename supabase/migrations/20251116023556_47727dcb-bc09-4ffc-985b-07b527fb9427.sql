-- Create profiles table for user data with roles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for role management
CREATE TYPE public.app_role AS ENUM ('admin', 'couple', 'planner');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create wedding_details table
CREATE TABLE public.wedding_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bride_name TEXT NOT NULL,
  groom_name TEXT NOT NULL,
  wedding_date DATE NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  story TEXT,
  theme_color TEXT DEFAULT 'elegant',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.wedding_details ENABLE ROW LEVEL SECURITY;

-- Create events table (ceremony, reception, etc.)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.wedding_details(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create photos table
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.wedding_details(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Create rsvps table
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.wedding_details(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  attending BOOLEAN NOT NULL,
  plus_one BOOLEAN DEFAULT FALSE,
  dietary_restrictions TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-photos', 'wedding-photos', true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for wedding_details
CREATE POLICY "Anyone can view wedding details"
  ON public.wedding_details FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins and couples can manage wedding details"
  ON public.wedding_details FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'couple') OR
    public.has_role(auth.uid(), 'planner')
  );

-- RLS Policies for events
CREATE POLICY "Anyone can view events"
  ON public.events FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authorized users can manage events"
  ON public.events FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'couple') OR
    public.has_role(auth.uid(), 'planner')
  );

-- RLS Policies for photos
CREATE POLICY "Anyone can view photos"
  ON public.photos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authorized users can manage photos"
  ON public.photos FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'couple') OR
    public.has_role(auth.uid(), 'planner')
  );

-- RLS Policies for rsvps
CREATE POLICY "Authorized users can view RSVPs"
  ON public.rsvps FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'couple') OR
    public.has_role(auth.uid(), 'planner')
  );

CREATE POLICY "Anyone can create RSVPs"
  ON public.rsvps FOR INSERT
  TO public
  WITH CHECK (true);

-- Storage policies for wedding photos
CREATE POLICY "Anyone can view wedding photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wedding-photos');

CREATE POLICY "Authorized users can upload wedding photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wedding-photos' AND
    (public.has_role(auth.uid(), 'admin') OR 
     public.has_role(auth.uid(), 'couple') OR
     public.has_role(auth.uid(), 'planner'))
  );

CREATE POLICY "Authorized users can delete wedding photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wedding-photos' AND
    (public.has_role(auth.uid(), 'admin') OR 
     public.has_role(auth.uid(), 'couple') OR
     public.has_role(auth.uid(), 'planner'))
  );

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wedding_details_updated_at
  BEFORE UPDATE ON public.wedding_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();