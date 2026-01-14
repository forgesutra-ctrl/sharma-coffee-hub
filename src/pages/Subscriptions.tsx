import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Package, Truck, Tag, CreditCard, Edit, Gift, Clock } from 'lucide-react';

export default function Subscriptions() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            Subscribe & Save
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Never Run Out of Great Coffee
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Subscribe to your favorite coffee and get it delivered monthly with exclusive discounts
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/shop">Browse Coffee</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/account/subscriptions">Manage Subscriptions</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Tag className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>10% Off Every Order</CardTitle>
              <CardDescription>
                Save money on every delivery with our subscription discount
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Free Shipping Always</CardTitle>
              <CardDescription>
                Enjoy free delivery on all subscription orders
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Edit className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Full Flexibility</CardTitle>
              <CardDescription>
                Pause, skip, or cancel anytime. No long-term commitment
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Choose Your Coffee</h3>
                <p className="text-muted-foreground">
                  Browse our selection of premium coffee powders and select your favorite blend,
                  roast level, and weight.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Subscribe & Save</h3>
                <p className="text-muted-foreground">
                  Set your delivery frequency, quantity, and shipping address. Get instant 10%
                  discount on every order.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Enjoy Fresh Coffee</h3>
                <p className="text-muted-foreground">
                  Receive your coffee at your doorstep every month. Freshly roasted and packed with
                  love.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Tag className="h-5 w-5 text-primary mt-0.5" />
                  <span>Save 10% on every delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  <Truck className="h-5 w-5 text-primary mt-0.5" />
                  <span>Free shipping on all orders</span>
                </li>
                <li className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <span>Automatic monthly deliveries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Package className="h-5 w-5 text-primary mt-0.5" />
                  <span>Freshly roasted coffee every time</span>
                </li>
                <li className="flex items-start gap-2">
                  <Gift className="h-5 w-5 text-primary mt-0.5" />
                  <span>Exclusive subscriber-only offers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                  <span>Secure payment processing</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage Your Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Edit className="h-5 w-5 text-primary mt-0.5" />
                  <span>Change delivery address anytime</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <span>Pause subscription when needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <span>Skip next delivery if needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <Package className="h-5 w-5 text-primary mt-0.5" />
                  <span>Update quantity or variant</span>
                </li>
                <li className="flex items-start gap-2">
                  <Tag className="h-5 w-5 text-primary mt-0.5" />
                  <span>Cancel anytime with no fees</span>
                </li>
                <li className="flex items-start gap-2">
                  <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                  <span>Update payment information</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Subscribe?</h2>
            <p className="mb-6 opacity-90">
              Start your coffee subscription today and never run out of your favorite brew
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/shop">Browse Coffee Selection</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="max-w-2xl mx-auto space-y-4 text-left">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Can I cancel my subscription anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes! You can cancel your subscription at any time from your account dashboard with
                  no cancellation fees.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  What if I want to skip a delivery?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You can pause your subscription or skip individual deliveries from your account
                  settings.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Can I change my coffee selection?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Currently, each subscription is for a specific product. You can cancel and create
                  a new subscription for a different coffee.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
