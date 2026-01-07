import OpenAI from 'openai';
import { createClient } from "@supabase/supabase-js";

/** OpenAI config */
const openaiApiKey = (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined) || import.meta.env?.VITE_OPENAI_API_KEY;
export const openai = new OpenAI({
  // apiKey: process.env.OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY,
  apiKey: openaiApiKey,
  dangerouslyAllowBrowser: true
});

/** Supabase config */
// const privateKey = process.env.SUPABASE_API_KEY
const privateKey = (typeof process !== 'undefined' ? process.env.SUPABASE_API_KEY : undefined) || import.meta.env?.VITE_SUPABASE_API_KEY;
if (!privateKey) throw new Error(`Expected env var SUPABASE_API_KEY`);
const url = "https://widegmaevygsmytsotgd.supabase.co"
// if (!url) throw new Error(`Expected env var SUPABASE_URL`);
export const supabase = createClient(url, privateKey);



