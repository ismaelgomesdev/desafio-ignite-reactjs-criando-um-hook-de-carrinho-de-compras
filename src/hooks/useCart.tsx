import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const repeated = cart.find((product) => product.id === productId);
      if (!repeated) {
        const { data: product } = await api.get<Product>(
          `products/${productId}`
        );

        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }]);
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([...cart, { ...product, amount: 1 }])
          );
          return;
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }

      if (repeated) {
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > repeated.amount) {
          const newCart = cart.map((cartItem) =>
            cartItem.id === productId
              ? {
                  ...cartItem,
                  amount: Number(cartItem.amount) + 1,
                }
              : cartItem
          );

          setCart(newCart);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
          return;
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch (err) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(
        (cartProduct) => cartProduct.id === productId
      );
      if (!productExists) {
        toast.error(`Produto não encontrado no carrinho.`);
        return;
      }
      const newCart = cart.filter((product) => product.id !== productId);
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error(`Falha ao remover o produto no carrinho.`);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount > 1) {
        toast.error("Erro ao alterar a quantidade do produto.");
        return;
      }
      const response = await api.get<Stock>(`stock/${productId}`);
      const productAmount = response.data.amount;
      const stockAvailable = amount > productAmount;
      if(!stockAvailable) {
        toast.error("Quantidade fora de estoque.");
        return
      }
      const newCart: Product[] = cart.map((product) => {
        if (productId === product.id) {
          return {
            ...product,
            amount: amount,
          };
        } else {
          return product;
        }
      });

      setCart(newCart);
    } catch {
      toast.error(`Falha ao atualizar quantidade.`);
    }
  };

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
