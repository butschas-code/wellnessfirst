-- One private reflection per member per catalog article (journal semantics; supports edit in place).
ALTER TABLE public.article_reflections
  ADD CONSTRAINT article_reflections_user_article UNIQUE (user_id, article_id);
