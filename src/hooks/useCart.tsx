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
      const responseStock = await api.get("/stock");
      const stock = responseStock.data;
      let itemAmount = stock.filter((item: Product) => {
        if (item.id === productId) {
          return item.amount;
        }
      })[0];
      if (itemAmount) itemAmount = itemAmount.amount;
      console.log(itemAmount);
      if (itemAmount > 0) {
        const responseProducts = await api.get("/products");
        const products = responseProducts.data;
        var repeated = false;
        cart.map((product) => {
          product.id === productId && (repeated = true);
        });
        if (repeated) {
          const newCart: Product[] = cart.map((product) => {
            if (productId === product.id) {
              return {
                ...product,
                amount: product.amount + 1,
              };
            } else {
              return product;
            }
          });

          setCart(newCart);
        } else {
          const newProduct = products.filter(
            (product: Product) => product.id === productId
          )[0];
          newProduct.amount = 1;
          setCart([...cart, newProduct]);
        }
        const newStock = stock.map((item: Product) => {
          if (item.id === productId) {
            return {
              ...item,
              amount: item.amount - 1,
            };
          }
          return item;
        });
        itemAmount -= 1;
        const stockUpdated = await api.put(`/stock/${productId}`, {
          amount: itemAmount,
        });
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch (err) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      setCart(cart.filter((product) => product.id !== productId));
    } catch {
      toast.error(`Falha ao remover o produto no carrinho.`);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
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
