// ============================================================
// NOVANEST CONFIG
// ------------------------------------------------------------
// Public configuration values used across the website.
// These are SAFE to publish. Do NOT put passwords or secret
// keys here. The Supabase "anon" key is safe; the
// "service_role" key is NOT safe and must never appear here.
//
// Replace every "YOUR_..." value before launching.
// ============================================================

export const NOVANEST_CONFIG = {
  companyName: "Novanest Digital Solutions",
  tagline: "Build. Learn. Innovate. Grow.",

  // Support / M-Pesa (MANUAL ONLY — no STK Push, no API)
  mpesaNumber: "0723510672",       
  mpesaName: "Mikowen khaseke",
  supportMinimum: 10,

  // Contact
  email: "mickowenk@gmail.com",    
  whatsapp: "+254723510672",   

  // Social
  github: "https://github.com/mellamo-owen",          
  linkedin: "https://www.linkedin.com/in/mickowen-khaseke-7130ab394?utm_source=share_via&utm_content=profile&utm_medium=member_android",      

  // Supabase
  supabaseUrl: "https://namwgcigxxnmtbgzmzcv.supabase.co",    //
  supabaseAnonKey: "sb_publishable_XU72J7faw7o80KTzTRWwDA_vZWmo36b"
};
