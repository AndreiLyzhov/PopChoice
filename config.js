import OpenAI from 'openai';
import { createClient } from "@supabase/supabase-js";

/** OpenAI config */
// if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key is missing or invalid.");
export const openai = new OpenAI({
  apiKey: "OpenAI_API_KEY",
  dangerouslyAllowBrowser: true
});

/** Supabase config */
const privateKey = "SUPABASE_PRIVATE_KEY"
if (!privateKey) throw new Error(`Expected env var SUPABASE_API_KEY`);
const url = "https://widegmaevygsmytsotgd.supabase.co"
// if (!url) throw new Error(`Expected env var SUPABASE_URL`);
export const supabase = createClient(url, privateKey);