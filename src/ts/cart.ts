import type { CartItem, Product } from './types.js';

type CatalogLike = {
  products?: Product[];
};

class CartManager {
  private cart: CartItem[];
  private catalogManager: CatalogLike | null;
  private eventListenersAdded = false;

  constructor() {
    this.cart = this.loadCart();
    this.catalogManager = null;
    console.log('CartManager initialized with cart:', this.cart);
    this.updateCartCounter();
    this.bindEvents();
  }

  setCatalogManager(catalogManager: CatalogLike) {
    this.catalogManager = catalogManager;
  }

  private loadCart(): CartItem[] {
    const savedCart = localStorage.getItem('cart');
    const parsed: unknown = savedCart ? JSON.parse(savedCart) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  }

  private saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.cart));
  }

  addItem(productId: string, quantity = 1) {
    console.log('Adding item to cart:', productId, quantity);

    let productData: (Product & Partial<Pick<CartItem, 'color' | 'size'>>) | null = null;

    const fromCatalog = this.catalogManager?.products?.find((p) => p.id === productId);
    if (fromCatalog) {
      productData = fromCatalog;
      console.log('Found product in catalog:', productData);
    }

    if (!productData) {
      const productElement = document
        .querySelector(`[data-product-id="${productId}"]`)
        ?.closest<HTMLElement>('.product-card, .product-details');
      if (productElement) {
        const nameElement = productElement.querySelector<HTMLElement>('.product-card__name, .product-details__name, h1, h2, h3');
        const priceElement = productElement.querySelector<HTMLElement>('.product-card__price, .product-details__price');
        const imageElement = productElement.querySelector<HTMLImageElement>('.product-card__image, .product-details__image, img');

        productData = {
          id: productId,
          name: nameElement?.textContent?.trim() || 'Product',
          price: this.extractPrice(priceElement?.textContent || '0'),
          imageUrl: imageElement?.src || '/assets/product1.png',
        };
        console.log('Extracted product data from DOM:', productData);
      }
    }

    productData ??= {
      id: productId,
      name: 'Product',
      price: 0,
      imageUrl: '/assets/product1.png',
      color: 'unknown',
      size: 'unknown',
    };

    const color = productData.color || 'unknown';
    const size = productData.size || 'unknown';

    const existingItem = this.cart.find((item) => item.name === productData.name && item.size === size && item.color === color);

    if (existingItem) {
      existingItem.quantity += quantity;
      console.log('Merged with existing item:', existingItem);
    } else {
      this.cart.push({
        id: productData.id,
        name: productData.name,
        price: productData.price,
        imageUrl: productData.imageUrl,
        color,
        size,
        quantity,
      });
      console.log('Added new item to cart:', productData);
    }

    this.saveCart();
    this.updateCartCounter();
    this.dispatchCartUpdate();
  }

  removeItem(productId: string) {
    console.log('Removing item with ID:', productId);
    console.log('Cart before removal:', this.cart);
    this.cart = this.cart.filter((item) => item.id !== productId);
    console.log('Cart after removal:', this.cart);
    this.saveCart();
    this.updateCartCounter();
    this.dispatchCartUpdate();
  }

  private updateItemQuantity(productId: string, quantity: number) {
    const item = this.cart.find((i) => i.id === productId);
    if (item) {
      if (quantity <= 0) {
        this.removeItem(productId);
      } else {
        item.quantity = quantity;
        this.saveCart();
        this.updateCartCounter();
        this.dispatchCartUpdate();
      }
    }
  }

  private clearCart() {
    this.cart = [];
    this.saveCart();
    this.updateCartCounter();
    this.dispatchCartUpdate();
  }

  private getTotalItems() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  private getSubtotal() {
    const subtotal = this.cart.reduce((total, item) => {
      console.log('Calculating subtotal for item:', item, 'price:', item.price, 'quantity:', item.quantity);
      return total + item.price * item.quantity;
    }, 0);
    console.log('Total subtotal:', subtotal);
    return subtotal;
  }

  private getDiscount() {
    const subtotal = this.getSubtotal();
    return subtotal > 3000 ? Math.round(subtotal * 0.1) : 0;
  }

  private getShipping() {
    if (this.cart.length === 0) {
      return 0;
    }
    return 30;
  }

  private getTotal() {
    return this.getSubtotal() - this.getDiscount() + this.getShipping();
  }

  private extractPrice(priceText: string) {
    if (!priceText) return 0;
    const cleanPrice = priceText.replace(/[^0-9.]/g, '');
    const price = Number.parseFloat(cleanPrice);
    return Number.isNaN(price) ? 0 : price;
  }

  private updateCartCounter() {
    const counter = document.querySelector<HTMLElement>('.counter-text');
    const totalItems = this.getTotalItems();

    if (counter) {
      counter.textContent = String(totalItems);

      const counterCircle = document.querySelector<HTMLElement>('.header__icon__cart__counter');
      if (counterCircle) {
        counterCircle.style.display = totalItems > 0 ? 'block' : 'none';
      }
    }
  }

  private dispatchCartUpdate() {
    const event = new CustomEvent('cartUpdated', {
      detail: { cart: this.cart, totalItems: this.getTotalItems() },
    });
    document.dispatchEvent(event);
  }

  private renderCartItems() {
    const cartItemsContainer = document.querySelector<HTMLElement>('.cart-items');
    if (!cartItemsContainer) return;

    console.log('Rendering cart items:', this.cart);

    if (this.cart.length === 0) {
      cartItemsContainer.innerHTML = `
                <div class="cart-empty">
                    <h3>Your cart is empty.</h3>
                    <p>Use the catalog to add new items.</p>
                </div>
            `;
      return;
    }

    cartItemsContainer.innerHTML = this.cart
      .map(
        (item) => `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="cart-item__image">
                    <img src="${item.imageUrl}" alt="${item.name}">
                </div>
                <div class="cart-item__name">${item.name}</div>
                <div class="cart-item__price">$${item.price}</div>
                <div class="cart-item__quantity">
                    <button class="cart-item__qty-btn cart-item__qty-btn--minus" data-product-id="${item.id}">-</button>
                    <span class="cart-item__qty-value">${item.quantity}</span>
                    <button class="cart-item__qty-btn cart-item__qty-btn--plus" data-product-id="${item.id}">+</button>
                </div>
                <div class="cart-item__total">$${item.price * item.quantity}</div>
                <div class="cart-item__delete">
                    <button class="cart-item__delete-btn" data-remove-from-cart data-product-id="${item.id}">
                        <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5H19" stroke="#B92770" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            <path d="M17 5V19C17 19.5304 16.7893 20.0391 16.4142 20.4142C16.0391 20.7893 15.5304 21 15 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5M6 5V3C6 2.46957 6.21071 1.96086 6.58579 1.58579C6.96086 1.21071 7.46957 1 8 1H12C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V5" stroke="#B92770" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            <path d="M8 10V16" stroke="#B92770" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            <path d="M12 10V16" stroke="#B92770" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `,
      )
      .join('');
  }

  private renderCartSummary() {
    const subtotalElement = document.getElementById('cart-subtotal');
    const discountElement = document.getElementById('cart-discount');
    const shippingElement = document.getElementById('cart-shipping');
    const totalElement = document.getElementById('cart-total');

    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    const shipping = this.getShipping();
    const total = this.getTotal();

    if (subtotalElement) subtotalElement.textContent = `$${subtotal}`;
    if (discountElement) discountElement.textContent = `$${discount}`;
    if (shippingElement) shippingElement.textContent = `$${shipping}`;
    if (totalElement) totalElement.textContent = `$${total}`;
  }

  renderCart() {
    const cartTableHeader = document.querySelector<HTMLElement>('.cart-table__header');
    if (cartTableHeader) {
      cartTableHeader.style.display = this.cart.length === 0 ? 'none' : 'grid';
    }

    const cartCheckout = document.querySelector<HTMLElement>('.cart-checkout');
    if (cartCheckout) {
      cartCheckout.style.display = this.cart.length === 0 ? 'none' : 'block';
    }

    this.renderCartItems();
    this.renderCartSummary();
  }

  private bindEvents() {
    if (this.eventListenersAdded) return;
    this.eventListenersAdded = true;

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      const addBtn = target?.closest<HTMLElement>('[data-add-to-cart]');
      if (!addBtn) return;
      e.preventDefault();
      const productId = addBtn.dataset.productId;
      const quantity = Number.parseInt(addBtn.dataset.quantity || '1', 10) || 1;

      if (productId) {
        this.addItem(productId, quantity);
        this.showAddToCartFeedback(addBtn);
      } else {
        console.warn('No product ID found for add to cart button');
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      const deleteBtn = target?.closest<HTMLElement>('[data-remove-from-cart]');
      if (!deleteBtn) return;
      e.preventDefault();
      const productId = deleteBtn.dataset.productId;
      console.log('Delete button clicked for product:', productId);
      if (productId) this.removeItem(productId);
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches('.cart-item__qty-btn--plus')) {
        e.preventDefault();
        const productId = (target as HTMLElement).dataset.productId;
        const item = this.cart.find((i) => i.id === productId);
        if (item && productId) {
          this.updateItemQuantity(productId, item.quantity + 1);
        }
      }

      if (target?.matches('.cart-item__qty-btn--minus')) {
        e.preventDefault();
        const productId = (target as HTMLElement).dataset.productId;
        const item = this.cart.find((i) => i.id === productId);
        if (item && productId) {
          this.updateItemQuantity(productId, item.quantity - 1);
        }
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches('.cart-actions__btn:last-child')) {
        e.preventDefault();
        if (confirm('Are you sure you want to clear your cart?')) {
          this.clearCart();
        }
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches('.cart-actions__btn:first-child')) {
        e.preventDefault();
        globalThis.location.href = '/html/catalog.html';
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches('.cart-checkout__btn')) {
        e.preventDefault();
        if (this.cart.length === 0) {
          alert('Your cart is empty!');
          return;
        }
        this.processCheckout();
      }
    });

    document.addEventListener('cartUpdated', () => {
      if (document.querySelector('.cart-items')) {
        this.renderCart();
      }
    });
  }

  private processCheckout() {
    this.clearCart();
    this.showThankYouMessage();
  }

  private showThankYouMessage() {
    const overlay = document.createElement('div');
    overlay.className = 'checkout-overlay';
    overlay.innerHTML = `
            <div class="checkout-message">
                <h2>Thank you for your purchase!</h2>
                <p>Your order has been processed successfully.</p>
                <button class="checkout-message__btn" onclick="this.closest('.checkout-overlay').remove()">
                    Continue Shopping
                </button>
            </div>
        `;

    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

    const messageBox = overlay.querySelector<HTMLElement>('.checkout-message');
    if (messageBox) {
      messageBox.style.cssText = `
            background: white;
            padding: 3rem;
            text-align: center;
            max-width: 30rem;
            box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.3);
        `;
    }

    const button = overlay.querySelector<HTMLButtonElement>('.checkout-message__btn');
    if (button) {
      button.style.cssText = `
            background-color: #B92770;
            color: white;
            border: none;
            padding: 1rem 2rem;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 1.5rem;
            transition: background-color 0.3s ease;
        `;

      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#9a1f5a';
      });

      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#B92770';
      });
    }

    document.body.appendChild(overlay);

    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 5000);
  }

  private showAddToCartFeedback(button: HTMLElement) {
    const originalText = button.textContent || '';
    button.textContent = 'Added!';
    (button as HTMLElement).style.backgroundColor = '#28a745';

    setTimeout(() => {
      button.textContent = originalText;
      (button as HTMLElement).style.backgroundColor = '';
    }, 1500);
  }
}

export { CartManager };

