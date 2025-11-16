import { createSlice } from "@reduxjs/toolkit";

const loadFromStorage = () => {
  try {
    const cart = localStorage.getItem("cart");
    return cart ? JSON.parse(cart) : [];
  } catch (error) {
    console.error("Error loading cart from storage:", error);
    return [];
  }
};

const saveCartToStorage = (cart) => {
  try {
    localStorage.setItem("cart", JSON.stringify(cart));
  } catch (error) {
    console.error("Error saving cart to storage:", error);
  }
};

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: loadFromStorage(),
  },
  reducers: {
    addToCart: (state, action) => {
      const course = action.payload;
      // Check if course already exists in cart
      const existingItem = state.items.find((item) => item._id === course._id);

      if (!existingItem) {
        state.items.push(course);
        saveCartToStorage(state.items);
      }
    },
    removeFromCart: (state, action) => {
      // Filter out the item with matching _id
      state.items = state.items.filter((item) => item._id !== action.payload);
      saveCartToStorage(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      localStorage.removeItem("cart");
    },
  },
});

export const { addToCart, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
