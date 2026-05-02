import { createClient } from '@supabase/supabase-js';


//ORIGINAL
/*
const supabaseUrl = 'https://drputfmtppwpvxnmjuiz.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycHV0Zm10cHB3cHZ4bm1qdWl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTE2ODEsImV4cCI6MjA2NjAyNzY4MX0.XbkAeC8WAXDzA2RBMQThqoW6lCB_ZpLl4_ZmkGI_eQg';
*/
//NUEVO
const supabaseUrl = 'https://pzgftkjxmevbfficnyur.supabase.co/'
const supabaseKey = 'sb_publishable_acxlBm3am0vDGj7AafHA-w_luENLXRi'
export const supabase = createClient(supabaseUrl, supabaseKey);
