import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Coffee, Leaf, PackageCheck, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnnouncementStrip } from '@/components/home-v2/AnnouncementStrip';
import { CinematicVideo } from '@/components/home-v2/CinematicVideo';
import { FilmDialog, type Film } from '@/components/home-v2/FilmDialog';
import { Brand, SiteNav } from '@/components/home-v2/SiteNav';
import { CoffeeSection } from '@/components/home-v2/CoffeeSection';
import Footer from '@/components/coffee/Footer';
import { brewing, brewingPoster, estate, estatePoster, family, familyPoster, roasting } from '@/lib/site-media';
import '@/components/home-v2/home-v2.css';

// Temporary route for the redesigned homepage, ported from the reference
// (coorg-s-golden-roast, src/routes/index.tsx): hero, promise strip, intro, coffees,
// story, films and roast, followed by our existing Footer (not the reference's).
// The route replaces "/" once signed off.

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

        <section id="intro" className="intro-section section-inner">
          <p className="eyebrow">A SMALL TOWN. A DEEP LOVE FOR COFFEE.</p>
          <h2>From our hills.<br />To your <em>everyday.</em></h2>
          <div className="intro-bottom">
            <Brand editorial />
            <p>Some things shouldn’t be hurried. The ripening of a coffee cherry. The warmth of a slow roast. The first sip of your morning. In Madikeri, we’ve built our lives around getting these little things right.</p>
            <Link to="/about" className="arrow-link">Meet the family <ArrowUpRight /></Link>
          </div>
        </section>

        <CoffeeSection />

        <section id="story" className="story-section">
          <div className="story-portrait">
            <CinematicVideo media={family} poster={familyPoster.url} label="Father and son, the family behind Sharma Coffee Works" controls />
            <div className="portrait-caption"><span>ONE FAMILY. TWO GENERATIONS.</span><span>EST. 1987</span></div>
          </div>
          <div className="story-copy">
            <p className="eyebrow">THE PEOPLE BEHIND YOUR CUP</p>
            <h2>Not just a business.<br /><em>A bond.</em></h2>
            <p>Before it was your morning coffee, it was our family’s calling. A father’s dedication. A son’s belief. And a shared promise to never lose the care that started it all.</p>
            <p>Since 1987, Sharma Coffee Works has brought the taste of Coorg to coffee lovers. Hand-selected beans, slow roasts, and a little piece of home in every cup.</p>
            <Button variant="text" className="story-watch" onClick={() => setActiveFilm(films[2])}>
              <span className="small-play"><Play size={12} fill="currentColor" /></span> A legacy, living on <ArrowUpRight />
            </Button>
            <div className="story-signature">The Sharma family<span>MADIKERI, KARNATAKA</span></div>
          </div>
        </section>

        <section id="films" className="films-section">
          <div className="section-heading section-inner">
            <div>
              <p className="eyebrow">THE SHARMA JOURNAL · IN MOTION</p>
              <h2>Take a moment.<br /><em>Stay a little longer.</em></h2>
            </div>
            <p className="section-note">The hills. The hands. The everyday rituals.<br />A few stories best told slowly.</p>
          </div>
          <div className="film-grid section-inner">
            {films.map((film, i) => (
              <Button key={film.title} variant="text" className={`film-tile film-tile-${i}`} onClick={() => setActiveFilm(film)} aria-label={`Watch ${film.title}`}>
                <div className="film-tile-image">
                  {/* Decorative: the button's aria-label already says "Watch {title}". */}
                  <img src={film.poster} alt="" loading="lazy" />
                  <span className="film-play"><Play fill="currentColor" /></span>
                  <span className="film-duration">{film.duration}</span>
                </div>
                <div className="film-tile-caption">
                  <span>0{i + 1} / {i === 0 ? 'THE ORIGIN' : i === 1 ? 'THE RITUAL' : 'THE FAMILY'}</span>
                  <h3>{film.title}<ArrowUpRight /></h3>
                </div>
              </Button>
            ))}
          </div>
        </section>

        <section className="roast-section">
          {/* The file is named coffee_roasting.jpg but shows ripening cherries on the plant;
              the reference's "Coffee beans being roasted" alt text was wrong. */}
          <img src={roasting.url} alt="A coffee plant's branches heavy with red, orange and yellow cherries ripening in the sun" loading="lazy" />
          <div className="roast-shade" />
          <div className="roast-copy">
            <p className="eyebrow">TIME IS OUR SECRET INGREDIENT</p>
            <h2>Slow is not a method.<br />It’s a <em>way of life.</em></h2>
            <p>Patiently roasted. Thoughtfully packed.<br />From our hands to your home, nothing is rushed.</p>
            <Button asChild variant="hero"><Link to="/shop">Bring Coorg home <ArrowUpRight /></Link></Button>
          </div>
        </section>

        <FilmDialog film={activeFilm} onClose={() => setActiveFilm(null)} container={root} />
      </main>
      {/* Our existing footer, kept outside .home-v2 so the scoped reference base rules
          (weight-400 headings, a{color:inherit}) cannot restyle it. */}
      <Footer />
    </>
  );
}
