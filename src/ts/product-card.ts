import type { Product } from './types.js';

export async function loadProductCardTemplate(
  url = '/components/product-card.html',
): Promise<HTMLTemplateElement> {
  const res = await fetch(url);
  const html = await res.text();

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const template = doc.querySelector('template');
  if (!template) throw new Error('product-card.html must contain a <template> root');

  return template;
}

export function renderProductCard(
  templateEl: HTMLTemplateElement,
  product: Product,
): DocumentFragment {
  const node = templateEl.content.cloneNode(true) as DocumentFragment;

  const article = node.querySelector<HTMLElement>('.product-card');

  const applyIf = (selector: string, fn: (el: Element) => void) => {
    if (!article) return;
    const el = article.querySelector(selector);
    if (el) fn(el);
  };

  if (article) {
    article.dataset.id = product.id;
  }

  applyIf('.product-card__image', (el) => {
    if (!(el instanceof HTMLImageElement)) return;
    el.src = product.imageUrl;
    el.alt = product.name;
  });

  applyIf('.product-card__badge', (el) => {
    if (!(el instanceof HTMLElement)) return;
    el.textContent = product.salesStatus ? 'SALE' : '';
    el.style.display = product.salesStatus ? '' : 'none';
  });

  applyIf('.product-card__name', (el) => {
    el.textContent = product.name;
  });

  applyIf('.product-card__price', (el) => {
    el.textContent = `$${product.price}`;
  });

  applyIf('[data-add-to-cart]', (el) => {
    if (!(el instanceof HTMLElement)) return;
    el.dataset.productId = product.id;
    el.dataset.quantity = '1';
  });

  return node;
}

