CREATE TABLE greeting_templates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  template text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO greeting_templates (name, template)
VALUES ('default', 'Hello, {name}!');
