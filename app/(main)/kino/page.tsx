import type { Metadata } from "next";

import MoviePoll from "../../../components/kino/MoviePoll";
import { loadPoll } from "../../../lib/sanity/moviePoll";

/**
 * The live poll's own question and banner become the page title and the share
 * image — a link to this page should show what people are voting on, not a
 * generic label.
 */
export async function generateMetadata(): Promise<Metadata> {
  const poll = await loadPoll(null);
  const title = poll ? `${poll.title} | Мој Прилеп` : "Кино анкета | Мој Прилеп";
  const description =
    poll?.description ??
    "Предложи и гласај за филмот што сакаш да го гледаш во Прилеп.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: poll?.poster_url ? [poll.poster_url] : undefined,
    },
  };
}

export default function KinoPage() {
  return <MoviePoll />;
}
