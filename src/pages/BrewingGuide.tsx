import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Droplets, Flame, Coffee } from 'lucide-react';

const brewingMethods = [
  {
    id: 'south-indian-filter',
    name: 'South Indian Filter',
    description: 'The traditional way to brew authentic filter coffee',
    time: '10-15 mins',
    ratio: '3 tbsp per 150ml',
    temp: '90-95°C',
    steps: [
      'Add 3 tablespoons of filter coffee powder to the upper chamber of your filter.',
      'Press the powder gently with the pressing disc.',
      'Pour 150ml of hot water (just off the boil) slowly over the coffee.',
      'Cover and let it drip for 10-15 minutes.',
      'Mix the decoction with hot milk and sugar to taste.',
      'Pour between two tumblers to create the signature froth.',
    ],
    tips: [
      'Use freshly roasted filter grind coffee for best results.',
      'The water should be hot but not boiling.',
      'The longer the drip, the stronger the decoction.',
    ],
  },
  {
    id: 'french-press',
    name: 'French Press',
    description: 'Full-bodied coffee with rich flavors',
    time: '4 mins',
    ratio: '1:15 coffee to water',
    temp: '93-96°C',
    steps: [
      'Preheat your French press with hot water, then discard.',
      'Add coarsely ground coffee (about 30g for 450ml water).',
      'Pour hot water in a circular motion to saturate all grounds.',
      'Stir gently and place the lid with plunger up.',
      'Steep for 4 minutes.',
      'Press the plunger down slowly and serve immediately.',
    ],
    tips: [
      'Use a coarse grind to prevent over-extraction.',
      'Don\'t let it sit after pressing - transfer to a carafe.',
      'Clean the filter thoroughly after each use.',
    ],
  },
  {
    id: 'pour-over',
    name: 'Pour Over',
    description: 'Clean, bright cup highlighting subtle flavors',
    time: '3-4 mins',
    ratio: '1:16 coffee to water',
    temp: '92-96°C',
    steps: [
      'Place filter in dripper and rinse with hot water.',
      'Add medium-fine ground coffee (about 20g).',
      'Start timer and pour 40ml water to bloom - wait 30 seconds.',
      'Pour remaining water in slow, circular motions.',
      'Maintain water level, pouring in stages over 3 minutes.',
      'Remove dripper when dripping stops and enjoy.',
    ],
    tips: [
      'Keep a steady, gentle pour.',
      'Avoid pouring directly on the filter.',
      'A gooseneck kettle gives better control.',
    ],
  },
  {
    id: 'moka-pot',
    name: 'Moka Pot',
    description: 'Strong, espresso-like coffee on the stovetop',
    time: '5-7 mins',
    ratio: 'Fill the basket',
    temp: 'Medium heat',
    steps: [
      'Fill bottom chamber with hot water up to the safety valve.',
      'Insert the funnel basket and fill with medium-fine ground coffee.',
      'Level the grounds without pressing.',
      'Screw on the top chamber tightly.',
      'Place on medium heat with lid open.',
      'Remove from heat when coffee starts to gurgle.',
    ],
    tips: [
      'Use hot water to start - prevents bitter, overcooked taste.',
      'Don\'t tamp the coffee grounds.',
      'Remove from heat before it\'s fully done.',
    ],
  },
  {
    id: 'cold-brew',
    name: 'Cold Brew',
    description: 'Smooth, low-acid coffee steeped overnight',
    time: '12-24 hours',
    ratio: '1:8 coffee to water',
    temp: 'Cold/Room temp',
    steps: [
      'Coarsely grind 100g of coffee.',
      'Combine with 800ml cold filtered water in a jar.',
      'Stir to ensure all grounds are wet.',
      'Cover and refrigerate for 12-24 hours.',
      'Strain through a fine mesh sieve and coffee filter.',
      'Dilute concentrate with water or milk to taste.',
    ],
    tips: [
      'Longer steep = stronger concentrate.',
      'Store concentrate in fridge for up to 2 weeks.',
      'Great for iced coffee and coffee cocktails.',
    ],
  },
];

export default function BrewingGuide() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
              Brewing Guide
            </h1>
            <p className="text-lg text-muted-foreground">
              Master the art of coffee brewing with our detailed guides. 
              From traditional South Indian filter to modern pour-over techniques.
            </p>
          </div>
        </div>
      </section>

      {/* Brewing Methods */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="south-indian-filter" className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent mb-8 justify-center">
              {brewingMethods.map((method) => (
                <TabsTrigger
                  key={method.id}
                  value={method.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-full border"
                >
                  {method.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {brewingMethods.map((method) => (
              <TabsContent key={method.id} value={method.id}>
                <Card className="border-none shadow-lg">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="font-display text-2xl md:text-3xl">
                      {method.name}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {method.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Quick Info */}
                    <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-semibold text-sm">{method.time}</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Coffee className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Ratio</p>
                        <p className="font-semibold text-sm">{method.ratio}</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Flame className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Temp</p>
                        <p className="font-semibold text-sm">{method.temp}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                      {/* Steps */}
                      <div>
                        <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                          <Droplets className="w-5 h-5 text-primary" />
                          Steps
                        </h3>
                        <ol className="space-y-3">
                          {method.steps.map((step, index) => (
                            <li key={index} className="flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                                {index + 1}
                              </span>
                              <span className="text-muted-foreground text-sm pt-0.5">
                                {step}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Tips */}
                      <div>
                        <h3 className="font-display text-xl font-semibold mb-4">
                          Pro Tips
                        </h3>
                        <ul className="space-y-3">
                          {method.tips.map((tip, index) => (
                            <li key={index} className="flex gap-3 items-start">
                              <span className="text-primary">✓</span>
                              <span className="text-muted-foreground text-sm">
                                {tip}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* General Tips */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">
            General Coffee Tips
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'Fresh is Best', desc: 'Use coffee within 2-4 weeks of roasting for optimal flavor.' },
              { title: 'Grind Fresh', desc: 'Grind your beans just before brewing to preserve aromatics.' },
              { title: 'Water Matters', desc: 'Use filtered water - it makes up 98% of your cup.' },
              { title: 'Store Properly', desc: 'Keep coffee in an airtight container away from light and heat.' },
            ].map((tip) => (
              <div key={tip.title} className="p-4 bg-background rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">{tip.title}</h3>
                <p className="text-sm text-muted-foreground">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
