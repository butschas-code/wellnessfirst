-- Members may revise a consultation note only while it is still unread/unprocessed.
DROP POLICY IF EXISTS consultation_requests_update_own ON public.consultation_requests;

CREATE POLICY consultation_requests_update_own
  ON public.consultation_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'new')
  WITH CHECK (user_id = auth.uid() AND status = 'new');
