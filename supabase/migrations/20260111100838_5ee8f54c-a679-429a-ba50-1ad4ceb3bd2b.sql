-- Create table for chat feedback
CREATE TABLE public.chat_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_content TEXT NOT NULL,
  response_content TEXT NOT NULL,
  is_positive BOOLEAN NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID,
  page_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (customers don't need to be logged in)
CREATE POLICY "Anyone can submit chat feedback" 
ON public.chat_feedback 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view feedback for analysis
CREATE POLICY "Admins can view chat feedback" 
ON public.chat_feedback 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete feedback
CREATE POLICY "Admins can delete chat feedback" 
ON public.chat_feedback 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for analytics queries
CREATE INDEX idx_chat_feedback_created_at ON public.chat_feedback(created_at DESC);
CREATE INDEX idx_chat_feedback_is_positive ON public.chat_feedback(is_positive);