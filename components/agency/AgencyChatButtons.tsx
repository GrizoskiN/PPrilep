import { MessageCircle, Phone } from "lucide-react";
import { AGENCY_CONTACT, type AgencyId } from "../../lib/agencies";

/**
 * Viber + WhatsApp click-to-chat buttons for an agency. Renders nothing if the
 * agency has no numbers configured; renders a button per available channel.
 * Numbers live in lib/agencies.ts (AGENCY_CONTACT).
 */
export default function AgencyChatButtons({ agencyId }: { agencyId: AgencyId }) {
  const contact = AGENCY_CONTACT[agencyId];
  if (!contact || (!contact.viber && !contact.whatsapp)) return null;

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
      {contact.viber && (
        <a
          href={`viber://chat?number=%2B${contact.viber}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7360f2] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
          <Phone size={16} /> Viber
        </a>
      )}
      {contact.whatsapp && (
        <a
          href={`https://wa.me/${contact.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
          <MessageCircle size={16} /> WhatsApp
        </a>
      )}
    </div>
  );
}
