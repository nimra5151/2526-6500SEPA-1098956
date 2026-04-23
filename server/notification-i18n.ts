/**
 * Server-side notification translation templates.
 * Each notification type has a title and message template per language.
 * Use {{variable}} for dynamic placeholders.
 */

type Lang = "en" | "es" | "de" | "ur";

interface NotifTemplate {
  title: string;
  message: string;
}

// Map full language names (stored in DB) to codes
const LANG_NAME_TO_CODE: Record<string, Lang> = {
  English: "en",
  Spanish: "es",
  German: "de",
  Urdu: "ur",
  en: "en",
  es: "es",
  de: "de",
  ur: "ur",
};

const templates: Record<string, Record<Lang, NotifTemplate>> = {
  new_login: {
    en: { title: "New Login Detected", message: "A login was detected from a new IP address ({{ip}}). If this wasn't you, change your password immediately." },
    es: { title: "Nuevo inicio de sesión detectado", message: "Se detectó un inicio de sesión desde una nueva dirección IP ({{ip}}). Si no fuiste tú, cambia tu contraseña de inmediato." },
    de: { title: "Neue Anmeldung erkannt", message: "Eine Anmeldung von einer neuen IP-Adresse ({{ip}}) wurde erkannt. Falls Sie das nicht waren, ändern Sie sofort Ihr Passwort." },
    ur: { title: "نئی لاگ ان کا پتہ چلا", message: "ایک نئے IP ایڈریس ({{ip}}) سے لاگ ان کا پتہ چلا ہے۔ اگر یہ آپ نہیں تھے تو فوری طور پر اپنا پاس ورڈ تبدیل کریں۔" },
  },
  new_booking: {
    en: { title: "New Booking", message: "A student has booked your class." },
    es: { title: "Nueva Reserva", message: "Un estudiante ha reservado tu clase." },
    de: { title: "Neue Buchung", message: "Ein Schüler hat Ihren Kurs gebucht." },
    ur: { title: "نئی بکنگ", message: "ایک طالب علم نے آپ کی کلاس بک کر لی ہے۔" },
  },
  booking_cancelled: {
    en: { title: "Booking Cancelled", message: 'A student cancelled their booking for "{{className}}"' },
    es: { title: "Reserva Cancelada", message: 'Un estudiante canceló su reserva para "{{className}}"' },
    de: { title: "Buchung storniert", message: 'Ein Schüler hat seine Buchung für "{{className}}" storniert' },
    ur: { title: "بکنگ منسوخ", message: '"{{className}}" کے لیے ایک طالب علم نے اپنی بکنگ منسوخ کر دی' },
  },
  session_completed: {
    en: { title: "Session Completed", message: 'Your session for "{{className}}" has been marked complete. A certificate has been issued!' },
    es: { title: "Sesión Completada", message: 'Tu sesión para "{{className}}" ha sido marcada como completada. ¡Se ha emitido un certificado!' },
    de: { title: "Sitzung abgeschlossen", message: 'Ihre Sitzung für "{{className}}" wurde als abgeschlossen markiert. Ein Zertifikat wurde ausgestellt!' },
    ur: { title: "سیشن مکمل", message: '"{{className}}" کا آپ کا سیشن مکمل ہو گیا ہے۔ ایک سرٹیفکیٹ جاری کر دیا گیا ہے!' },
  },
  new_message: {
    en: { title: "New Message", message: "You have a new message." },
    es: { title: "Nuevo Mensaje", message: "Tienes un nuevo mensaje." },
    de: { title: "Neue Nachricht", message: "Sie haben eine neue Nachricht." },
    ur: { title: "نیا پیغام", message: "آپ کو ایک نیا پیغام آیا ہے۔" },
  },
  new_review: {
    en: { title: "New Review", message: "You received a {{rating}}-star review." },
    es: { title: "Nueva Reseña", message: "Recibiste una reseña de {{rating}} estrellas." },
    de: { title: "Neue Bewertung", message: "Sie haben eine {{rating}}-Sterne-Bewertung erhalten." },
    ur: { title: "نیا جائزہ", message: "آپ کو {{rating}} ستاروں کا جائزہ ملا ہے۔" },
  },
  certificate_earned: {
    en: { title: "Certificate Earned! 🎓", message: 'Congratulations! You completed "{{className}}" and earned a certificate.' },
    es: { title: "¡Certificado Obtenido! 🎓", message: '¡Felicidades! Completaste "{{className}}" y obtuviste un certificado.' },
    de: { title: "Zertifikat erhalten! 🎓", message: 'Herzlichen Glückwunsch! Sie haben "{{className}}" abgeschlossen und ein Zertifikat erhalten.' },
    ur: { title: "سرٹیفکیٹ حاصل! 🎓", message: 'مبارک ہو! آپ نے "{{className}}" مکمل کر لیا اور سرٹیفکیٹ حاصل کر لیا۔' },
  },
  safeguarding_report: {
    en: { title: "New Safeguarding Report", message: "A new {{reportType}} report has been submitted." },
    es: { title: "Nuevo Informe de Protección", message: "Se ha enviado un nuevo informe de {{reportType}}." },
    de: { title: "Neuer Schutzbericht", message: "Ein neuer {{reportType}}-Bericht wurde eingereicht." },
    ur: { title: "نئی تحفظ رپورٹ", message: "ایک نئی {{reportType}} رپورٹ جمع کرائی گئی ہے۔" },
  },
  tutor_approved: {
    en: { title: "Tutor Application Approved", message: "Congratulations! Your tutor application has been approved. You can now create classes." },
    es: { title: "Solicitud de Tutor Aprobada", message: "¡Felicidades! Tu solicitud de tutor ha sido aprobada. Ahora puedes crear clases." },
    de: { title: "Tutor-Bewerbung genehmigt", message: "Herzlichen Glückwunsch! Ihre Tutor-Bewerbung wurde genehmigt. Sie können jetzt Kurse erstellen." },
    ur: { title: "ٹیوٹر درخواست منظور", message: "مبارک ہو! آپ کی ٹیوٹر درخواست منظور ہو گئی ہے۔ اب آپ کلاسز بنا سکتے ہیں۔" },
  },
  coordinator_approved: {
    en: { title: "Coordinator Account Approved", message: "Your coordinator account has been approved. You can now manage the platform." },
    es: { title: "Cuenta de Coordinador Aprobada", message: "Tu cuenta de coordinador ha sido aprobada. Ahora puedes gestionar la plataforma." },
    de: { title: "Koordinator-Konto genehmigt", message: "Ihr Koordinator-Konto wurde genehmigt. Sie können die Plattform jetzt verwalten." },
    ur: { title: "کوآرڈینیٹر اکاؤنٹ منظور", message: "آپ کا کوآرڈینیٹر اکاؤنٹ منظور ہو گیا ہے۔ اب آپ پلیٹ فارم کا انتظام کر سکتے ہیں۔" },
  },
  discussion_reply: {
    en: { title: "New reply on your discussion", message: '{{name}} replied to your discussion: "{{discussionTitle}}"' },
    es: { title: "Nueva respuesta en tu discusión", message: '{{name}} respondió a tu discusión: "{{discussionTitle}}"' },
    de: { title: "Neue Antwort auf Ihre Diskussion", message: '{{name}} hat auf Ihre Diskussion geantwortet: "{{discussionTitle}}"' },
    ur: { title: "آپ کی بحث پر نیا جواب", message: '{{name}} نے آپ کی بحث کا جواب دیا: "{{discussionTitle}}"' },
  },
  peer_help_matched: {
    en: { title: "Peer help request matched!", message: '{{name}} needs help with "{{topic}}" in {{className}}. Check your Peer Help tab.' },
    es: { title: "¡Solicitud de ayuda emparejada!", message: '{{name}} necesita ayuda con "{{topic}}" en {{className}}. Revisa tu pestaña de Ayuda.' },
    de: { title: "Hilfsanfrage zugeordnet!", message: '{{name}} braucht Hilfe bei "{{topic}}" in {{className}}. Überprüfen Sie Ihren Hilfe-Tab.' },
    ur: { title: "ہم عمر مدد کی درخواست ملی!", message: '{{name}} کو {{className}} میں "{{topic}}" میں مدد چاہیے۔ اپنا ہم عمر مدد ٹیب دیکھیں۔' },
  },
  peer_help_offered: {
    en: { title: "Someone offered to help you!", message: '{{name}} will help you with "{{topic}}" in {{className}}. Send them a message!' },
    es: { title: "¡Alguien se ofreció a ayudarte!", message: '{{name}} te ayudará con "{{topic}}" en {{className}}. ¡Envíale un mensaje!' },
    de: { title: "Jemand hat Hilfe angeboten!", message: '{{name}} wird Ihnen bei "{{topic}}" in {{className}} helfen. Senden Sie eine Nachricht!' },
    ur: { title: "کسی نے آپ کی مدد کی پیشکش کی!", message: '{{name}} آپ کی {{className}} میں "{{topic}}" میں مدد کریں گے۔ انہیں پیغام بھیجیں!' },
  },
  peer_session_approval_needed: {
    en: { title: "Peer Session Approval Needed", message: '{{requester}} wants a peer session with {{helper}} for "{{className}}". Approve in Admin → Peer Sessions.' },
    es: { title: "Aprobación de sesión necesaria", message: '{{requester}} quiere una sesión con {{helper}} para "{{className}}". Aprueba en Admin → Sesiones.' },
    de: { title: "Sitzungsgenehmigung erforderlich", message: '{{requester}} möchte eine Sitzung mit {{helper}} für "{{className}}". Genehmigen Sie unter Admin → Sitzungen.' },
    ur: { title: "ہم عمر سیشن کی منظوری درکار", message: '{{requester}} "{{className}}" کے لیے {{helper}} کے ساتھ سیشن چاہتے ہیں۔ ایڈمن → سیشنز میں منظوری دیں۔' },
  },
  peer_session_approved: {
    en: { title: "Peer Session Approved!", message: "Your peer study session{{dateTime}} has been approved by the coordinator.{{notes}}" },
    es: { title: "¡Sesión Aprobada!", message: "Tu sesión de estudio{{dateTime}} ha sido aprobada por el coordinador.{{notes}}" },
    de: { title: "Sitzung genehmigt!", message: "Ihre Lernsitzung{{dateTime}} wurde vom Koordinator genehmigt.{{notes}}" },
    ur: { title: "ہم عمر سیشن منظور!", message: "آپ کا مطالعاتی سیشن{{dateTime}} کوآرڈینیٹر نے منظور کر لیا ہے۔{{notes}}" },
  },
  peer_session_rejected: {
    en: { title: "Peer Session Not Approved", message: "Your peer session request was not approved.{{reason}}" },
    es: { title: "Sesión No Aprobada", message: "Tu solicitud de sesión no fue aprobada.{{reason}}" },
    de: { title: "Sitzung nicht genehmigt", message: "Ihre Sitzungsanfrage wurde nicht genehmigt.{{reason}}" },
    ur: { title: "ہم عمر سیشن منظور نہیں ہوا", message: "آپ کی سیشن کی درخواست منظور نہیں ہوئی۔{{reason}}" },
  },
};

/**
 * Interpolate {{placeholder}} variables in a template string.
 */
function interpolate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}

/**
 * Get translated notification title and message.
 * @param key - notification template key (e.g. "new_booking")
 * @param langRaw - user's language from DB (e.g. "English", "ur", "Urdu")
 * @param vars - dynamic variables to interpolate into the template
 * @returns { title, message } in the user's language (falls back to English)
 */
export function getNotifText(
  key: string,
  langRaw: string,
  vars: Record<string, string | number> = {},
): { title: string; message: string } {
  const code = LANG_NAME_TO_CODE[langRaw] || "en";
  const tpl = templates[key];
  if (!tpl) {
    // Unknown key — return vars as-is if provided, else empty
    return { title: vars.title?.toString() || key, message: vars.message?.toString() || "" };
  }
  const langTpl = tpl[code] || tpl.en;
  return {
    title: interpolate(langTpl.title, vars),
    message: interpolate(langTpl.message, vars),
  };
}

/**
 * Convenience: get a user's language code from their settings.
 * Returns "en" if no settings found.
 */
export async function getUserLang(
  storage: { getUserSettings(userId: number): Promise<{ language?: string | null } | undefined> },
  userId: number,
): Promise<string> {
  try {
    const settings = await storage.getUserSettings(userId);
    return settings?.language || "en";
  } catch {
    return "en";
  }
}
