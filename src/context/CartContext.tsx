import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem } from '../types';
import { getShippingCharge, getShippingRegion, getShippingRegionLabel, COD_ADVANCE_AMOUNT, COD_HANDLING_FEE } from '@/lib/shipping';

interface ShippingInfo {
  pincode: string;
  region: string;
  charge: number;
  weightInGrams: number;
  multiplier: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, weight: number) => void;
  updateQuantity: (productId: string, weight: number, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  // Shipping
  shippingInfo: ShippingInfo | null;
  setShippingPincode: (pincode: string) => boolean;
  getShippingCharge: () => number;
  getCartWeight: () => number;
  // COD
  isCodAvailable: () => boolean;
  getCodAdvance: () => number;
  getCodHandlingFee: () => number;
  getCodBalance: (paymentType: 'prepaid' | 'cod') => number;
  getGrandTotal: (paymentType: 'prepaid' | 'cod') => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('sharma-coffee-cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(() => {
    const saved = localStorage.getItem('sharma-coffee-shipping');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('sharma-coffee-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (shippingInfo) {
      localStorage.setItem('sharma-coffee-shipping', JSON.stringify(shippingInfo));
    } else {
      localStorage.removeItem('sharma-coffee-shipping');
    }
  }, [shippingInfo]);

  const getCartWeight = useCallback(() => {
    return cartItems.reduce((totalWeight, item) => {
      return totalWeight + (item.weight * item.quantity);
    }, 0);
  }, [cartItems]);

  const setShippingPincode = useCallback((pincode: string): boolean => {
    const region = getShippingRegion(pincode);
    if (!region) return false;

    const weightInGrams = getCartWeight();
    const charge = getShippingCharge(pincode, weightInGrams);
    const weightInKg = weightInGrams / 1000;
    const multiplier = Math.ceil(weightInKg);

    setShippingInfo({
      pincode,
      region: getShippingRegionLabel(region),
      charge,
      weightInGrams,
      multiplier,
    });
    return true;
  }, [getCartWeight]);

  const addToCart = (newItem: CartItem) => {
    setCartItems((prev) => {
      const existingItemIndex = prev.findIndex(
        (item) =>
          item.product.id === newItem.product.id &&
          item.weight === newItem.weight
      );

      if (existingItemIndex > -1) {
        const updated = [...prev];
        updated[existingItemIndex].quantity += newItem.quantity;
        return updated;
      }

      return [...prev, newItem];
    });
  };

  const removeFromCart = (productId: string, weight: number) => {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !(item.product.id === productId && item.weight === weight)
      )
    );
  };

  const updateQuantity = (productId: string, weight: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, weight);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.weight === weight
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setShippingInfo(null);
    localStorage.removeItem('sharma-coffee-shipping');
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  // Pure getter - just returns the current shipping charge without side effects
  const getShippingChargeValue = useCallback(() => {
    if (!shippingInfo) return 0;

    const currentWeight = getCartWeight();
    const updatedCharge = getShippingCharge(shippingInfo.pincode, currentWeight);
    return updatedCharge;
  }, [shippingInfo, getCartWeight]);

  // Auto-update shipping info when cart weight changes
  useEffect(() => {
    if (!shippingInfo) return;

    const currentWeight = getCartWeight();
    const weightInKg = currentWeight / 1000;
    const multiplier = Math.ceil(weightInKg);

    // Only update if weight actually changed
    if (multiplier !== shippingInfo.multiplier || currentWeight !== shippingInfo.weightInGrams) {
      const updatedCharge = getShippingCharge(shippingInfo.pincode, currentWeight);
      setShippingInfo({
        ...shippingInfo,
        charge: updatedCharge,
        weightInGrams: currentWeight,
        multiplier,
      });
    }
  }, [cartItems, shippingInfo?.pincode, getCartWeight]);

  // Check if all items in cart support COD
  const isCodAvailable = useCallback(() => {
    // For now, assume all items support COD unless variant specifies otherwise
    // This can be enhanced when variant cod_enabled field is populated
    return cartItems.length > 0;
  }, [cartItems]);

  const getCodAdvance = () => COD_ADVANCE_AMOUNT;
  const getCodHandlingFee = () => COD_HANDLING_FEE;

  const getCodBalance = (paymentType: 'prepaid' | 'cod') => {
    if (paymentType !== 'cod') return 0;
    const subtotal = getCartTotal();
    const shipping = getShippingChargeValue();
    const total = subtotal + shipping + COD_HANDLING_FEE;
    return total - COD_ADVANCE_AMOUNT;
  };

  const getGrandTotal = (paymentType: 'prepaid' | 'cod') => {
    const subtotal = getCartTotal();
    const shipping = getShippingChargeValue();
    
    if (paymentType === 'cod') {
      return subtotal + shipping + COD_HANDLING_FEE;
    }
    return subtotal + shipping;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        shippingInfo,
        setShippingPincode,
        getShippingCharge: getShippingChargeValue,
        getCartWeight,
        isCodAvailable,
        getCodAdvance,
        getCodHandlingFee,
        getCodBalance,
        getGrandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
