import { FormValidator } from './form-validator.js';
import type { CatalogData, Product } from './types.js';

export class ProductDetailsManager {
  async init() {
    const productId = this.getProductIdFromUrl();
    if (!productId) {
      console.error('Product id is missing in URL');
      return;
    }

    this.bindProductTabs();

    await this.loadAndRenderProduct(productId);

    (globalThis as unknown as { reviewFormValidator?: ReviewFormValidator }).reviewFormValidator = new ReviewFormValidator();
  }

  private getProductIdFromUrl() {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get('id');
  }

  private async loadAndRenderProduct(productId: string) {
    try {
      const response = await fetch('/assets/data.json');
      if (!response.ok) {
        throw new Error('Failed to load product data');
      }
      const data = (await response.json()) as CatalogData;
      const products = Array.isArray(data?.data) ? data.data : [];
      const product = products.find((p) => p.id === productId);

      if (!product) {
        console.error('Product not found for id:', productId);
        return;
      }

      this.renderProduct(product, products);
    } catch {
      console.error('Error loading product');
    }
  }

  private renderProduct(product: Product, allProducts: Product[]) {
    const titleEl = document.querySelector<HTMLElement>('.product-details__title');
    const priceEl = document.querySelector<HTMLElement>('.product-details__price');
    const imageEl = document.getElementById('product-details__photo') as HTMLImageElement | null;
    const addToCartBtn = document.querySelector<HTMLElement>('.product-details__add-to-cart');
    const sizeSelect = document.getElementById('size') as HTMLSelectElement | null;
    const colorSelect = document.getElementById('color') as HTMLSelectElement | null;
    const categorySelect = document.getElementById('category') as HTMLSelectElement | null;
    const qtyInput = document.getElementById('product-details__quantity') as HTMLInputElement | null;

    if (titleEl) titleEl.textContent = product.name;
    if (priceEl) priceEl.textContent = `$${product.price}`;
    if (imageEl) {
      imageEl.src = product.imageUrl;
      imageEl.alt = product.name;
    }
    if (addToCartBtn) {
      addToCartBtn.dataset.productId = product.id;
      if (qtyInput) {
        const initialQty = Math.max(1, Number.parseInt(qtyInput.value, 10) || 1);
        addToCartBtn.dataset.quantity = String(initialQty);
      }
    }

    if (sizeSelect && product.size && this.optionExists(sizeSelect, product.size)) {
      sizeSelect.value = product.size;
    }
    if (colorSelect && product.color && this.optionExists(colorSelect, product.color)) {
      colorSelect.value = product.color;
    }
    if (categorySelect && product.category && this.optionExists(categorySelect, product.category)) {
      categorySelect.value = product.category;
    }

    this.renderRating(product.rating);
    this.renderRelatedProducts(product, allProducts);
    this.bindQuantityControls();
  }

  private optionExists(select: HTMLSelectElement, value: string) {
    return Array.from(select.options).some((opt) => opt.value === value);
  }

  private renderRating(rating?: number) {
    const ratingContainer = document.querySelector<HTMLElement>('.product-details__rating');
    if (!ratingContainer || typeof rating !== 'number') return;

    const full = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;
    const empty = 5 - full - (hasHalf ? 1 : 0);

    const starSvg = (fill: string) => `
<svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.60486 0.790725C7.6879 0.624581 7.81557 0.484847 7.97356 0.387185C8.13155 0.289523 8.31362 0.237793 8.49936 0.237793C8.6851 0.237793 8.86717 0.289523 9.02516 0.387185C9.18315 0.484847 9.31082 0.624581 9.39386 0.790725L11.1079 4.22372C11.182 4.372 11.2918 4.49954 11.4274 4.59484C11.563 4.69015 11.7202 4.75025 11.8849 4.76972L15.7769 5.22972C15.9686 5.25242 16.1497 5.33013 16.2982 5.45348C16.4468 5.57684 16.5564 5.74055 16.6139 5.92486C16.6715 6.10918 16.6744 6.3062 16.6224 6.49214C16.5704 6.67809 16.4657 6.845 16.3209 6.97272L13.5429 9.42373C13.4112 9.54003 13.3124 9.68898 13.2566 9.85558C13.2008 10.0222 13.1898 10.2005 13.2249 10.3727L13.9529 13.9497C13.9904 14.1346 13.9749 14.3264 13.9081 14.5028C13.8413 14.6793 13.726 14.8333 13.5754 14.9469C13.4248 15.0606 13.2451 15.1294 13.0571 15.1453C12.8691 15.1612 12.6804 15.1235 12.5129 15.0367L8.95986 13.1997C8.81771 13.1261 8.65996 13.0876 8.49986 13.0876C8.33977 13.0876 8.18201 13.1261 8.03986 13.1997L4.48486 15.0377C4.31733 15.1245 4.12866 15.1622 3.94065 15.1463C3.75264 15.1304 3.57295 15.0616 3.42236 14.948C3.27177 14.8343 3.15641 14.6803 3.08961 14.5038C3.02281 14.3274 3.0073 14.1356 3.04486 13.9507L3.77286 10.3737C3.8079 10.2015 3.79696 10.0232 3.74113 9.85658C3.6853 9.68998 3.58657 9.54103 3.45486 9.42473L0.676861 6.97372C0.532065 6.846 0.427341 6.67909 0.375336 6.49314C0.32333 6.3072 0.326267 6.11018 0.383792 5.92586C0.441316 5.74155 0.550969 5.57784 0.699507 5.45448C0.848046 5.33113 1.02912 5.25342 1.22086 5.23072L5.11286 4.77072C5.27748 4.75125 5.43468 4.69115 5.57031 4.59584C5.70594 4.50054 5.81575 4.373 5.88986 4.22472L7.60486 0.790725Z" fill="${fill}"/>
</svg>`;

    const container = document.createElement('div');
    for (let i = 0; i < full; i++) container.insertAdjacentHTML('beforeend', starSvg('#F5B423'));
    if (hasHalf) container.insertAdjacentHTML('beforeend', starSvg('#F5B423'));
    for (let i = 0; i < empty; i++) container.insertAdjacentHTML('beforeend', starSvg('#E9E9ED'));

    const reviewCount = ratingContainer.querySelector('.product-details__review-count');
    ratingContainer.innerHTML = '';
    ratingContainer.appendChild(container);
    if (reviewCount) ratingContainer.appendChild(reviewCount);
  }

  private renderRelatedProducts(currentProduct: Product, allProducts: Product[]) {
    const grid = document.querySelector<HTMLElement>('.related-products__grid');
    if (!grid) return;

    grid.innerHTML = '';
    const pool = allProducts.filter((p) => p.id !== currentProduct.id);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const related = shuffled.slice(0, 4);

    for (const p of related) {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.dataset.id = p.id;
      card.innerHTML = `
<div class="product-card__image-wrapper">
    <img class="product-card__image" alt="${p.name}" height="200" src="${p.imageUrl}">
</div>
<div class="product-card__info">
    <p class="product-card__name">${p.name}</p>
    <p class="product-card__price">$${p.price}</p>
    <button class="main-button product-card__button" data-add-to-cart data-product-id="${p.id}" data-quantity="1">Add To Cart</button>
</div>`;

      card.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.matches('[data-add-to-cart]')) return;
        globalThis.location.href = `/pages/product-details-template?id=${p.id}`;
      });

      grid.appendChild(card);
    }
  }

  private bindQuantityControls() {
    const container = document.querySelector<HTMLElement>('.product-details__quantity-controls');
    const qtyInput = document.getElementById('product-details__quantity') as HTMLInputElement | null;
    const addToCartBtn = document.querySelector<HTMLElement>('.product-details__add-to-cart');
    if (!container || !qtyInput) return;

    const sanitize = (val: string) => {
      const n = Number.parseInt(val, 10);
      return Number.isNaN(n) || n < 1 ? 1 : n;
    };

    const sync = () => {
      const qty = sanitize(qtyInput.value);
      qtyInput.value = String(qty);
      if (addToCartBtn) addToCartBtn.dataset.quantity = String(qty);
    };

    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest<HTMLElement>('.product-details__qty-btn');
      if (!btn) return;
      e.preventDefault();

      const label = (btn.textContent || '').trim();
      const isMinus = label === '-' || label === '−';
      const isPlus = label === '+';

      let current = sanitize(qtyInput.value);
      if (isMinus) current = Math.max(1, current - 1);
      if (isPlus) current = current + 1;
      qtyInput.value = String(current);
      sync();
    });

    qtyInput.addEventListener('input', sync);
    qtyInput.addEventListener('change', sync);
    sync();
  }

  private bindProductTabs() {
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('.product-tabs__tab'));
    const panels = Array.from(document.querySelectorAll<HTMLElement>('.product-tabs__panel'));
    if (tabs.length === 0 || panels.length === 0) return;

    const activate = (index: number) => {
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        if (i === index) {
          tab.classList.add('product-tabs__tab--active');
          tab.setAttribute('aria-selected', 'true');
          tab.setAttribute('tabindex', '0');
        } else {
          tab.classList.remove('product-tabs__tab--active');
          tab.setAttribute('aria-selected', 'false');
          tab.setAttribute('tabindex', '-1');
        }
      }

      for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        if (i === index) {
          panel.classList.add('product-tabs__panel--active');
          panel.removeAttribute('hidden');
          panel.setAttribute('aria-hidden', 'false');
        } else {
          panel.classList.remove('product-tabs__panel--active');
          panel.setAttribute('hidden', '');
          panel.setAttribute('aria-hidden', 'true');
        }
      }
    };

    for (let index = 0; index < tabs.length; index++) {
      const tab = tabs[index];
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        activate(index);
      });
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(index);
        }
      });
    }
  }
}

class ReviewFormValidator extends FormValidator {
  constructor() {
    const form = document.getElementById('review-form') as HTMLFormElement | null;
    const config = {
      form,
      submitButton: (form ? form.querySelector('.review-form__submit') : null) as HTMLButtonElement | null,
      fields: {
        name: document.getElementById('review-form__name') as HTMLInputElement | null,
        email: document.getElementById('review-form__email') as HTMLInputElement | null,
        review: document.getElementById('review-form__text') as HTMLTextAreaElement | null,
      },
      formClassPrefix: 'review-form',
    };

    super(config);
  }

  protected async handleSubmit(event: Event) {
    event.preventDefault();
    if (!this.validateAllFields()) {
      this.showSubmissionMessage('Please fix the errors above before submitting.', 'error');
      return;
    }

    this.setSubmitButtonState(true);

    try {
      const payload = this.getFormData();
      await this.submitForm(payload);
      this.showSubmissionMessage('Thank you! Your review has been submitted successfully.', 'success');
      this.resetForm();
    } catch {
      this.showSubmissionMessage('Sorry, there was an error submitting your review. Please try again.', 'error');
    } finally {
      this.setSubmitButtonState(false);
    }
  }

  protected async submitForm(_formData?: unknown): Promise<unknown> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 800);
    });
  }

  protected setSubmitButtonState(isLoading: boolean) {
    if (!this.submitButton) return;
    if (isLoading) {
      this.submitButton.disabled = true;
      this.submitButton.textContent = 'SUBMITTING...';
      this.submitButton.classList.add('review-form__submit--loading');
    } else {
      this.submitButton.disabled = false;
      this.submitButton.textContent = 'SUBMIT';
      this.submitButton.classList.remove('review-form__submit--loading');
    }
  }
}

