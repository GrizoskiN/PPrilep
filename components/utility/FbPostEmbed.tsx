"use client";

interface Props {
  url: string;
  pubDate?: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("mk-MK", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function FbPostEmbed({ url, pubDate }: Props) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
      <iframe
        src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500&lazy=true`}
        className="w-full"
        style={{ height: 380, border: "none", overflow: "hidden" }}
        scrolling="no"
        frameBorder="0"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      />
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-100">
        {pubDate && (
          <span className="text-[11px] text-zinc-400">{formatDate(pubDate)}</span>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[11px] font-medium text-blue-500 hover:underline">
          Прочитај на Facebook →
        </a>
      </div>
    </div>
  );
}
