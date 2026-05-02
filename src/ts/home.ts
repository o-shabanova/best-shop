import { initializeCatalog } from './catalog.js';
import { CartManager } from './cart.js';
import { ContactFormValidator } from './contact.js';
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
