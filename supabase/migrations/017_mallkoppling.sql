-- Vilken träningsplansmall en tränings plan kommer från. Planen är en kopia;
-- kopplingen används för att visa kopplade träningar och uppdatera dem när mallen ändras.
alter table public.trainings
  add column if not exists plan_template_id integer references public.plan_templates(id) on delete set null;
create index if not exists trainings_plan_template_id_idx on public.trainings (plan_template_id);
