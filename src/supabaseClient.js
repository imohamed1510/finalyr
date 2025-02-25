import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ouhmeezffbzzeurpyidi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aG1lZXpmZmJ6emV1cnB5aWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxMzcxMjYsImV4cCI6MjA1NDcxMzEyNn0.fnBBH7V6AOvU4Ptwi1l3sqq42VeNt16nEWYH-DZ3V74";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
