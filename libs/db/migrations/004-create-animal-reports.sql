CREATE TABLE animal_reports (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_type text NOT NULL CHECK (report_type IN ('lost', 'found', 'sighted')),
  species text NOT NULL CHECK (species IN ('dog', 'cat', 'bird')),
  description text NOT NULL,
  traits text[] NOT NULL CHECK (cardinality(traits) > 0),
  location text NOT NULL,
  event_at timestamptz NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  contact_name text,
  contact_email text,
  contact_phone text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX animal_reports_public_listing ON animal_reports (created_at DESC);
