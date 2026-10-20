import { useMemo, type ComponentProps } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Coffee, FileText, HelpCircle, Home, Layers, Mail, MessageCircle, Phone, ShoppingBag, Store, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { useProducts, getUniqueProducts } from '@/hooks/useProducts';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

// Commerce pieces shared by both site headers: the old Navigation (inner pages) and
// SiteNav (homepage). Moved out of Navigation.tsx unchanged; each header passes its
// own classes so the markup it renders is the same as before the move.

export const PHONE_TEL = 'tel:+918762988145';
export const WHATSAPP_URL = 'https://wa.me/918762988145';

const searchPages = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Shop', href: '/shop', icon: Store },
  { name: 'Blog', href: '/blogs', icon: BookOpen },
  { name: 'Our Story', href: '/about', icon: Coffee },
  { name: 'Brewing Guide', href: '/brewing-guide', icon: FileText },
  { name: 'Processing', href: '/processing', icon: Coffee },
  { name: 'Contact', href: '/contact', icon: Mail },
  { name: 'FAQ', href: '/faq', icon: HelpCircle },
];

/** Search dialog — type what you need, go to product or section. */
export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { data: productsData } = useProducts();
  const products = useMemo(() => (productsData ? getUniqueProducts(productsData) : []), [productsData]);

  const handleSearchSelect = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type what you're looking for — product, category, or page"
        className="placeholder:text-muted-foreground"
      />
      <CommandList>
        <CommandEmpty>
          <span className="text-muted-foreground">No matches. Try a product name, category (e.g. coffee, tea), or page name.</span>
        </CommandEmpty>
        <CommandGroup heading="Products">
          {products.map((product) => (
            <CommandItem
              key={product.productId}
              value={`${product.name} ${product.category ?? ''}`}
              onSelect={() => handleSearchSelect(`/product/${product.slug}`)}
            >
              <Store className="mr-2 h-4 w-4 shrink-0" />
              <span>{product.name}</span>
              {product.category && (
                <span className="ml-2 text-xs text-muted-foreground truncate">{product.category}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        {categories && categories.length > 0 && (
          <CommandGroup heading="Categories">
            {categories.map((cat) => (
              <CommandItem
                key={cat.id}
                value={cat.name}
                onSelect={() => handleSearchSelect(`/shop/${cat.slug}`)}
              >
                <Layers className="mr-2 h-4 w-4 shrink-0" />
                {cat.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Pages">
          {searchPages.map((page) => (
            <CommandItem
              key={page.href}
              value={page.name}
              onSelect={() => handleSearchSelect(page.href)}
            >
              <page.icon className="mr-2 h-4 w-4 shrink-0" />
              {page.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

type LinkProps = Omit<ComponentProps<typeof Link>, 'to' | 'children'>;

/** Header cart icon with the live item-count badge. */
export function CartIconLink({ badgeClassName, iconClassName = 'w-5 h-5', ...props }: LinkProps & { badgeClassName: string; iconClassName?: string }) {
  const { getCartCount } = useCart();
  const cartCount = getCartCount();
  return (
    <Link to="/cart" aria-label={cartCount > 0 ? `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : 'Cart'} {...props}>
      <ShoppingBag className={iconClassName} />
      {cartCount > 0 && <span className={badgeClassName}>{cartCount}</span>}
    </Link>
  );
}

/** Menu row for the cart: icon, label and count. */
export function CartMenuLink({ countClassName, ...props }: LinkProps & { countClassName: string }) {
  const { getCartCount } = useCart();
  const cartCount = getCartCount();
  return (
    <Link to="/cart" {...props}>
      <ShoppingBag className="w-5 h-5" />
      Shopping Bag
      {cartCount > 0 && <span className={countClassName}>{cartCount}</span>}
    </Link>
  );
}

/** Header account icon: /account when signed in, /auth when signed out. */
export function AccountIconLink({ iconClassName = 'w-5 h-5', ...props }: LinkProps & { iconClassName?: string }) {
  const { user } = useAuth();
  return (
    <Link to={user ? '/account' : '/auth'} aria-label={user ? 'My account' : 'Sign in'} {...props}>
      <User className={iconClassName} />
    </Link>
  );
}

/** Menu row for the account: "My Account" or "Sign In". */
export function AccountMenuLink(props: LinkProps) {
  const { user } = useAuth();
  return (
    <Link to={user ? '/account' : '/auth'} {...props}>
      <User className="w-5 h-5" />
      {user ? 'My Account' : 'Sign In'}
    </Link>
  );
}

/** Desktop phone link with the number shown. */
export function PhoneLink({ iconClassName = 'w-4 h-4', labelClassName, ...props }: ComponentProps<'a'> & { iconClassName?: string; labelClassName?: string }) {
  return (
    <a href={PHONE_TEL} {...props}>
      <Phone className={iconClassName} />
      <span className={labelClassName}>8762 988 145</span>
    </a>
  );
}

/** Desktop WhatsApp icon link. */
export function WhatsAppLink({ iconClassName = 'w-5 h-5 text-green-700', ...props }: ComponentProps<'a'> & { iconClassName?: string }) {
  return (
    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp" {...props}>
      <MessageCircle className={iconClassName} />
    </a>
  );
}
