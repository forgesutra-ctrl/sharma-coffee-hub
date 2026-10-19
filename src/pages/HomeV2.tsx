import { useState } from 'react';
import { ArrowDown, ArrowUpRight, Coffee, Leaf, PackageCheck, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnnouncementStrip } from '@/components/home-v2/AnnouncementStrip';
import { CinematicVideo } from '@/components/home-v2/CinematicVideo';
import { FilmDialog, type Film } from '@/components/home-v2/FilmDialog';
import { SiteNav } from '@/components/home-v2/SiteNav';
import { brewing, brewingPoster, estate, estatePoster, family, familyPoster } from '@/lib/site-media';
import '@/components/home-v2/home-v2.css';

// Temporary route for the redesigned homepage, ported from the reference
// (coorg-s-golden-roast, src/routes/index.tsx). Phase 3b-1: hero and promise strip.
// Sections 2-6 and the footer follow; the route replaces "/" once signed off.

const films: [Film, Film, Film] = [
  { title: 'Where it all begins', subtitle: 'A cinematic impression of the coffee country of Coorg.', media: estate, poster: estatePoster.url, duration: '0:08' },
  { title: 'The art of slowing down', subtitle: 'A closer look at the everyday ritual of brewing.', media: brewing, poster: brewingPoster.url, duration: '0:10' },
  { title: 'A legacy, living on', subtitle: 'Our father-and-son portrait, gently brought to life.', media: family, poster: familyPoster.url, duration: '0:06' },
];

export default function HomeV2() {
  const [activeFilm, setActiveFilm] = useState<Film | null>(null);
  const [heroFilm, setHeroFilm] = useState(0);
  // The film dialog portals into this element so the scoped .home-v2 styles reach it.
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const hero = films[heroFilm] ?? films[0];

  return (
    <>
      <AnnouncementStrip />
      <main id="home" className="home-v2" ref={setRoot}>
        <a href="#coffees" className="skip-link">Skip to our coffees</a>

        <section className="hero">
          {/* Remounted by key so the new film's <source> list is picked up. */}
          <CinematicVideo key={hero.media.url} media={hero.media} poster={hero.poster} label={hero.title} className="hero-media" controls />
          <div className="hero-shade" />
          <SiteNav variant="overlay" />

          <div className="hero-content">
            <p className="eyebrow"><span className="tiny-line" /> ROOTED IN COORG. ROASTED WITH SOUL.</p>
            <h1>Sharma<br />Coffee Works<span className="title-dot">.</span></h1>
            <p className="hero-tagline">Good coffee takes time.<br />We’ve been giving it ours since 1987.</p>
            <Button asChild variant="hero"><a href="#coffees">Find your morning <ArrowUpRight /></a></Button>
          </div>

          <div className="hero-film-link">
            <Button variant="film" className="large-play" aria-label={`Watch ${hero.title}`} onClick={() => setActiveFilm(hero)}>
              <Play fill="currentColor" />
            </Button>
            <div>
              <span className="eyebrow">A LITTLE CLOSER TO COORG</span>
              <p>{hero.title}</p>
            </div>
          </div>

          <div className="hero-bottom">
            <a href="#intro" className="scroll-link"><ArrowDown size={15} /> SCROLL TO DISCOVER</a>
            <div className="hero-scenes" aria-label="Choose background film">
              {films.slice(0, 2).map((film, i) => (
                <Button
                  key={film.title}
                  variant="text"
                  className={`scene-choice ${heroFilm === i ? 'is-active' : ''}`}
                  onClick={() => setHeroFilm(i)}
                  aria-pressed={heroFilm === i}
                >
                  <span>0{i + 1}</span>{i === 0 ? 'THE ORIGIN' : 'THE RITUAL'}
                </Button>
              ))}
            </div>
            <span className="hero-coordinate">12.4244° N &nbsp; 75.7382° E</span>
          </div>
        </section>

        <div className="promise-strip">
          <span><Leaf /> COORG-GROWN GOODNESS</span><i>✦</i>
          <span><Coffee /> SLOW-ROASTED, NEVER RUSHED</span><i>✦</i>
          <span><PackageCheck /> CARE IN EVERY DELIVERY</span><i>✦</i>
          <span>FAMILY-CRAFTED SINCE 1987</span>
        </div>

        <FilmDialog film={activeFilm} onClose={() => setActiveFilm(null)} container={root} />
      </main>
    </>
  );
}
