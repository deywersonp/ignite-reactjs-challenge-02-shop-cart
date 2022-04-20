import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CART_STORAGED = '@RocketShoes:cart';

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(CART_STORAGED)

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  console.log('products', products);
  console.log('cart', cart);

  const addProduct = async (productId: number) => {
    try {
      const product = products.find(product => product.id === productId);
      if (!product) {
        toast.error('Erro na adição do produto');
        return;
      };

      const response = await api.get<Stock>(`/stock/${productId}`);
      if (response.data.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      };

      const productOnCart = cart.find(product => product.id === productId);
      if (!productOnCart) {
        const newCart = [...cart, {
          ...product,
          amount: 1,
        }];
        setCart(newCart);
        localStorage.setItem(CART_STORAGED, JSON.stringify(newCart));
        return;
      };

      if (productOnCart.amount + 1 > response.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      };

      const newCart = cart.map(product => {
        if (product.id === productId) {
          const productUpdated = {
            ...product,
            amount: product.amount + 1,
          }
          return productUpdated;
        } else {
          return product;
        }
      });

      setCart(newCart);
      localStorage.setItem(CART_STORAGED, JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = products.find(product => product.id === productId);
      if (!product) {
        toast.error('Erro na remoção do produto');
        return;
      };

      const newCart = [...cart].filter(product => product.id !== productId);
      setCart(newCart);
      localStorage.setItem(CART_STORAGED, JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const response = await api.get<Product>(`/stock/${productId}`);
      if (!response.data) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      };

      if (response.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      };

      if (amount < 1) {
        return
      }

      const newCart = [...cart].map(product => {
        if (product.id === productId) {
          const updatedProduct = {
            ...product,
            amount,
          }
          return updatedProduct;
        } else {
          return product;
        }
      });

      setCart(newCart);
      localStorage.setItem(CART_STORAGED, JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  useEffect(() => {
    const getProductsInformation = async () => {
      try {
        const { data: productsResult } = await api.get('/products');

        setProducts(productsResult);
      } catch (error) {
        toast.error('Não foi possível carregar a lista de produtos!')
      }
    };

    getProductsInformation();
  }, []);

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
