import { initializeCatalog } from './catalog.js';
import { CartManager } from './cart.js';
import { ContactFormValidator } from './contact.js';
import { LoginFormValidator } from './form-validator.js';
import { ProductDetailsManager } from './product.js';
import { loadProductCardTemplate, renderProductCard } from './product-card.js';
import type { CatalogData, Product } from './types.js';

async function loadJSON(url: string): Promise<CatalogData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return (await res.json()) as CatalogData;
}

async function renderProductsByBlock(gridId: string, blockName: string) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const data = await loadJSON('/assets/data.json');
  const products: Product[] = (data.data || []).filter(
    (p) => Array.isArray(p.blocks) && p.blocks.indexOf(blockName) !== -1,
  );

  const tpl = await loadProductCardTemplate('/components/product-card.html');

  const frag = document.createDocumentFragment();
  for (const p of products) {
    frag.appendChild(renderProductCard(tpl, p));
  }
  grid.innerHTML = '';
  grid.appendChild(frag);
}

async function renderSelectedProductsIndex() {
  return renderProductsByBlock('selected-products-grid', 'Selected Products');
}

async function renderNewProductsArrivalIndex() {
  return renderProductsByBlock('new-products-arrival-grid', 'New Products Arrival');
}

const LOGIN_MODAL_INNER_HTML = `
    <div class="login-modal__backdrop" data-login-modal-close></div>
    <div class="login-modal__panel">
        <button type="button" class="login-modal__close" data-login-modal-close aria-label="Close log in">&times;</button>
        <h2 id="login-modal-title" class="login-modal__title">Log In</h2>
        <form id="login-form" class="account-form" novalidate>
            <div class="account-form__field">
                <label for="login-email" class="account-form__label">Email <span class="account-form__label-required">*</span></label>
                <input type="email" id="login-email" name="email" class="account-form__input" placeholder="your@email.com" autocomplete="email" />
                <span class="account-form__error account-form__error--email" aria-live="polite"></span>
            </div>
            <div class="account-form__field">
                <label for="login-password" class="account-form__label">Password <span class="account-form__label-required">*</span></label>
                <div class="account-form__password-row">
                    <input type="password" id="login-password" name="password" class="account-form__input" placeholder="Enter password" autocomplete="current-password" />
                    <button type="button" class="account-form__toggle-password" aria-label="Show password" aria-pressed="false">
                        <svg class="account-form__eye account-form__eye--open" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M12 5C7 5 2.73 8.11 1 12.5 2.73 16.89 7 20 12 20s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12.5a5 5 0 110-10 5 5 0 010 10z" fill="currentColor"/>
                            <circle cx="12" cy="12.5" r="3" fill="currentColor"/>
                        </svg>
                        <svg class="account-form__eye account-form__eye--closed" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" hidden aria-hidden="true">
                            <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.34-2.44 3.32l1.42 1.42c1.39-1.29 2.49-2.87 3.2-4.74C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.47 2.47L4 3.93 2.93 5l2.01 2.01C3.52 8.4 2.04 10.23 1 12.5 2.73 16.89 7 20 12 20c1.52 0 2.98-.29 4.32-.82l3.02 3.02 1.06-1.06L10.53 8.47zM12 9.1l4.4 4.4c-.02.03-.04.06-.06.09a5 5 0 01-6.68-6.68c.03-.02.06-.04.09-.06zm-1.97-.1L7.11 5.18C8.26 4.82 9.61 4.63 11 4.63c2.5 0 4.82.74 6.77 2.01L16.4 8.01A10.044 10.044 0 0012 7.1c-.66 0-1.31.07-1.97.2z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                <span class="account-form__error account-form__error--password" aria-live="polite"></span>
            </div>
            <button type="submit" class="account-form__submit">LOG IN</button>
        </form>
    </div>
`;

function mountLoginModal(): HTMLElement {
  const modal = document.createElement('div');
  modal.id = 'login-modal';
  modal.className = 'login-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'login-modal-title');
  modal.innerHTML = LOGIN_MODAL_INNER_HTML.trim();
  document.body.appendChild(modal);
  return modal;
}

function setupAccountLoginModal() {
  const opener = document.querySelector<HTMLButtonElement>('#login-modal-opener');
  if (!opener) return;

  const loginState = { validator: null as LoginFormValidator | null };

  const closeModal = () => {
    const modal = document.getElementById('login-modal');
    if (!modal) return;
    modal.hidden = true;
    opener.setAttribute('aria-expanded', 'false');
    loginState.validator?.clearModalForm();
  };

  const ensureLoginModalMounted = (): HTMLElement => {
    const existing = document.getElementById('login-modal');
    if (existing) return existing;
    const modal = mountLoginModal();
    modal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('[data-login-modal-close]')) {
        closeModal();
      }
    });
    loginState.validator = new LoginFormValidator(closeModal);
    return modal;
  };

  opener.addEventListener('click', (e) => {
    e.preventDefault();
    const modal = ensureLoginModalMounted();
    modal.hidden = false;
    opener.setAttribute('aria-expanded', 'true');
    modal.querySelector<HTMLInputElement>('#login-email')?.focus();
  });

  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('login-modal');
    if (e.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
    }
  });
}

function setupGlobalCardNavigation() {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('[data-add-to-cart]')) {
      return;
    }

    const card = target.closest<HTMLElement>('.product-card');
    if (!card) return;

    const id = card.dataset.id;
    if (!id) return;

    globalThis.location.href = `/html/product-details-template?id=${id}`;
  });
}

declare global {
  interface Window {
    contactFormValidator?: ContactFormValidator;
    reviewFormValidator?: unknown;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setupAccountLoginModal();

  let catalogManager: Awaited<ReturnType<typeof initializeCatalog>> | null = null;

  if (document.querySelector('#catalog-products')) {
    catalogManager = await initializeCatalog();
  }

  const cartManager = new CartManager();

  if (catalogManager) {
    cartManager.setCatalogManager(catalogManager);
  }

  if (document.querySelector('.cart-items')) {
    cartManager.renderCart();
  }

  if (document.querySelector('.contact-form__form')) {
    window.contactFormValidator = new ContactFormValidator();
  }

  if (document.querySelector('.product-details')) {
    const pdm = new ProductDetailsManager();
    await pdm.init();
  }

  void renderSelectedProductsIndex().catch(console.error);
  void renderNewProductsArrivalIndex().catch(console.error);

  setupGlobalCardNavigation();

  (function setupTravelCarousel() {
    const travelCards = document.querySelector<HTMLElement>('.travel__grid');
    if (!travelCards) return;
    const travelCardsEl = travelCards;

    const cards = travelCardsEl.querySelectorAll<HTMLElement>('.travel__card');
    const prevBtn = document.querySelector<HTMLButtonElement>('.carousel-prev');
    const nextBtn = document.querySelector<HTMLButtonElement>('.carousel-next');
    if (!prevBtn || !nextBtn || cards.length === 0) return;
    const prevBtnEl = prevBtn;
    const nextBtnEl = nextBtn;

    const desktopTargetVisible = 4;
    let currentIndex = 0;
    let autoSlide: ReturnType<typeof setInterval> | null = null;

    travelCardsEl.style.transition = 'transform 0.5s cubic-bezier(.4,0,.2,1)';

    function getCardWidthWithGap() {
      const firstCard = cards[0];
      const computed = getComputedStyle(travelCardsEl);
      const gap = Number.parseFloat(computed.gap) || 0;
      return firstCard.offsetWidth + gap;
    }

    function getVisibleCount() {
      const cardWidthWithGap = getCardWidthWithGap();
      const container = travelCardsEl.parentElement;
      const containerWidth = container ? container.clientWidth : globalThis.innerWidth;
      const approx = Math.max(
        1,
        Math.floor(
          (containerWidth + (Number.parseFloat(getComputedStyle(travelCardsEl).gap) || 0)) /
            cardWidthWithGap,
        ),
      );

      return Math.min(Math.max(1, Math.min(desktopTargetVisible, approx)), cards.length);
    }

    function updateButtons() {
      const visible = getVisibleCount();
      const maxIndex = Math.max(0, cards.length - visible);
      const nothingToScroll = maxIndex === 0;

      prevBtnEl.style.display = '';
      nextBtnEl.style.display = '';
      prevBtnEl.disabled = nothingToScroll || currentIndex === 0;
      nextBtnEl.disabled = nothingToScroll || currentIndex >= maxIndex;
      prevBtnEl.setAttribute('aria-disabled', String(prevBtnEl.disabled));
      nextBtnEl.setAttribute('aria-disabled', String(nextBtnEl.disabled));
    }

    function updateCarousel() {
      const cardWidth = getCardWidthWithGap();
      travelCardsEl.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
      updateButtons();
    }

    function goNext() {
      const visible = getVisibleCount();
      const maxIndex = Math.max(0, cards.length - visible);
      if (currentIndex < maxIndex) {
        currentIndex += 1;
      } else {
        currentIndex = 0;
      }
      updateCarousel();
    }

    function goPrev() {
      const visible = getVisibleCount();
      const maxIndex = Math.max(0, cards.length - visible);
      if (currentIndex > 0) {
        currentIndex -= 1;
      } else {
        currentIndex = maxIndex;
      }
      updateCarousel();
    }

    function resetAutoSlide() {
      if (autoSlide) clearInterval(autoSlide);
      const visible = getVisibleCount();
      const maxIndex = Math.max(0, cards.length - visible);
      if (maxIndex === 0) return;
      autoSlide = setInterval(goNext, 4000);
    }

    prevBtnEl.addEventListener('click', () => {
      goPrev();
      resetAutoSlide();
    });

    nextBtnEl.addEventListener('click', () => {
      goNext();
      resetAutoSlide();
    });

    globalThis.addEventListener('resize', () => {
      const visible = getVisibleCount();
      const maxIndex = Math.max(0, cards.length - visible);
      if (currentIndex > maxIndex) currentIndex = maxIndex;
      updateCarousel();
      resetAutoSlide();
    });

    updateCarousel();
    resetAutoSlide();
  })();

  console.log('Application initialized with modules');
});
