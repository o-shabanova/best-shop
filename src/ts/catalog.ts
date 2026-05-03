import { loadProductCardTemplate, renderProductCard } from './product-card.js';
import type { CatalogData, Product } from './types.js';

type Filters = {
  size: string;
  color: string;
  category: string;
  sales: boolean;
};

class CatalogManager {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  topBestSets: NonNullable<CatalogData['topBestSets']> = [];
  currentPage = 1;
  productsPerPage = 12;
  popup: HTMLElement | null = null;
  productCardTemplate: HTMLTemplateElement | null = null;

  async init() {
    try {
      await this.loadProducts();
      await this.loadProductCardTemplate();
      this.initPopup();
      await this.renderProducts();
      await this.renderTopBestSets();
      this.updateProductCount();
    } catch (error) {
      console.error('Error initializing catalog:', error);
      this.showPopup();
    }
  }

  private async loadProducts() {
    const response = await fetch('/assets/data.json');
    if (!response.ok) {
      throw new Error('Failed to fetch products data');
    }
    const data = (await response.json()) as CatalogData;
    this.products = Array.isArray(data.data) ? data.data : [];
    this.topBestSets = data.topBestSets ?? [];
    this.filteredProducts = [...this.products];

    if (this.products.length === 0) {
      throw new Error('No products available');
    }
  }

  private async loadProductCardTemplate() {
    this.productCardTemplate = await loadProductCardTemplate('/components/product-card.html');
  }

  async renderProducts() {
    const productGrid = document.getElementById('catalog-products');
    if (!productGrid) {
      console.error('Product grid container not found');
      return;
    }

    productGrid.innerHTML = '';

    if (this.filteredProducts.length === 0) {
      this.showPopup();
      this.updatePagination(0);
      return;
    }

    const totalPages = Math.ceil(this.filteredProducts.length / this.productsPerPage);
    const startIndex = (this.currentPage - 1) * this.productsPerPage;
    const endIndex = startIndex + this.productsPerPage;
    const productsToShow = this.filteredProducts.slice(startIndex, endIndex);

    if (!this.productCardTemplate) return;
    const fragment = document.createDocumentFragment();
    for (const product of productsToShow) {
      const cardNode = renderProductCard(this.productCardTemplate, product);
      fragment.appendChild(cardNode);
    }

    productGrid.appendChild(fragment);
    this.updatePagination(totalPages);
  }

  updateProductCount() {
    const productCountElement = document.getElementById('productCount');
    if (!productCountElement) return;

    const totalProducts = this.filteredProducts.length;
    const startIndex = (this.currentPage - 1) * this.productsPerPage + 1;
    const endIndex = Math.min(this.currentPage * this.productsPerPage, totalProducts);

    productCountElement.innerHTML = `
                Showing <span>${totalProducts === 0 ? 0 : startIndex}</span>-<span>${totalProducts === 0 ? 0 : endIndex}</span> of <span>${totalProducts}</span> Results
            `;
  }

  updatePagination(totalPages: number) {
    const paginationNumbers = document.getElementById('pagination-numbers');
    const prevButton = document.querySelector<HTMLButtonElement>('.catalog-pagination__button--prev');
    const nextButton = document.querySelector<HTMLButtonElement>('.catalog-pagination__button--next');

    if (!paginationNumbers || !prevButton || !nextButton) {
      return;
    }

    paginationNumbers.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement('button');
      pageButton.className = 'catalog-pagination__number';
      pageButton.textContent = String(i);
      pageButton.dataset.page = String(i);

      if (i === this.currentPage) {
        pageButton.classList.add('active');
      }

      pageButton.addEventListener('click', () => void this.goToPage(i));
      paginationNumbers.appendChild(pageButton);
    }

    prevButton.style.display = this.currentPage > 1 ? 'block' : 'none';
    nextButton.style.display = this.currentPage < totalPages ? 'block' : 'none';

    this.updateProductCount();
  }

  async goToPage(page: number) {
    const totalPages = Math.ceil(this.filteredProducts.length / this.productsPerPage);

    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      await this.renderProducts();
    }
  }

  async goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.renderProducts();
    }
  }

  async goToNextPage() {
    const totalPages = Math.ceil(this.filteredProducts.length / this.productsPerPage);

    if (this.currentPage < totalPages) {
      this.currentPage++;
      await this.renderProducts();
    }
  }

  async filterProducts(filters: Filters) {
    this.filteredProducts = this.products.filter((product) => {
      return (
        (!filters.size || this.matchesSize(filters.size, product.size ?? '')) &&
        (!filters.color || product.color === filters.color) &&
        (!filters.category || product.category === filters.category) &&
        (!filters.sales || Boolean(product.salesStatus))
      );
    });

    this.currentPage = 1;
    await this.renderProducts();
  }

  private matchesSize(selectedSize: string, productSize: string) {
    const normalize = (str: string) => str.split(',').map((s) => s.trim());

    const RANGE_S_TO_L = ['S', 'M', 'L'];
    const selectedIsRange = selectedSize === 'S-L';
    const selectedIsSet = selectedSize === 'S, M, XL';
    const productIsRange = productSize === 'S-L';
    const productIsSet = productSize === 'S, M, XL';

    if (!selectedIsRange && !selectedIsSet) {
      if (productIsRange) {
        return RANGE_S_TO_L.includes(selectedSize);
      }
      if (productIsSet) {
        return normalize('S, M, XL').includes(selectedSize);
      }
      return productSize === selectedSize;
    }

    if (selectedIsRange) {
      return productIsRange || productSize === 'S-L';
    }

    if (selectedIsSet) {
      return productIsSet || productSize === 'S, M, XL';
    }

    return false;
  }

  async sortProducts(sortType: string) {
    const sortMethods: Record<string, (a: Product, b: Product) => number> = {
      'price-asc': (a, b) => (a.price ?? 0) - (b.price ?? 0),
      'price-desc': (a, b) => (b.price ?? 0) - (a.price ?? 0),
      popularity: (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    };

    if (sortMethods[sortType]) {
      this.filteredProducts.sort(sortMethods[sortType]);
    }

    this.currentPage = 1;
    await this.renderProducts();
  }

  async searchProducts(searchTerm: string) {
    this.filteredProducts = searchTerm.trim()
      ? this.products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : [...this.products];

    this.currentPage = 1;
    await this.renderProducts();
  }

  private initPopup() {
    this.popup = document.getElementById('product-not-found-popup');
    if (!this.popup) return;

    const closeBtn = this.popup.querySelector<HTMLElement>('.catalog-popup__button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hidePopup());
    }

    this.popup.addEventListener('click', (e) => {
      if (e.target === this.popup) {
        this.hidePopup();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup?.classList.contains('show')) {
        this.hidePopup();
      }
    });
  }

  private showPopup() {
    if (!this.popup) return;
    this.popup.style.display = 'flex';
    requestAnimationFrame(() => {
      this.popup?.classList.add('show');
    });
  }

  private hidePopup() {
    if (!this.popup) return;
    this.popup.classList.remove('show');
    setTimeout(() => {
      if (this.popup) {
        this.popup.style.display = 'none';
      }
    }, 300);
  }

  private async renderTopBestSets() {
    if (!this.topBestSets || this.topBestSets.length === 0) {
      console.warn('No top best sets data available');
      return;
    }

    const topSetsContainer = document.querySelector('.catalog-top-sets');
    if (!topSetsContainer) {
      console.warn('Top sets container not found');
      return;
    }

    const randomSets = this.getRandomItems(this.topBestSets, 3);

    for (const set of randomSets) {
      const card = this.createTopSetCard(set);
      topSetsContainer.appendChild(card);
    }
  }

  private getRandomItems<T>(array: T[], count: number) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private createTopSetCard(set: NonNullable<CatalogData['topBestSets']>[number]) {
    const card = document.createElement('article');
    card.className = 'catalog-top-sets__card';

    const stars = this.generateStars(set.rating);
    const formattedPrice = `$${set.price}`;

    card.innerHTML = `
            <div class="catalog-top-sets__image">
                <img src="${set.imageUrl}" alt="${set.name}" width="87" height="87" class="catalog-top-sets__photo">
            </div>
            <div class="catalog-top-sets__info">
                <p class="catalog-top-sets__desc">${set.name}</p>
                <div class="catalog-top-sets__rating">
                    ${stars}
                </div>
                <p class="catalog-top-sets__price">${formattedPrice}</p>
            </div>
        `;

    return card;
  }

  private generateStars(rating: number) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let starsHTML = '';

    for (let i = 0; i < fullStars; i++) {
      starsHTML += this.createStarSVG('#F5B423');
    }

    if (hasHalfStar) {
      starsHTML += this.createStarSVG('#F5B423', true);
    }

    for (let i = 0; i < emptyStars; i++) {
      starsHTML += this.createStarSVG('#E9E9ED');
    }

    return starsHTML;
  }

  private createStarSVG(fillColor: string, isHalf = false) {
    const opacity = isHalf ? '0.5' : '1';
    return `
            <svg class="star-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.09993 0.873192C5.18181 0.704121 5.30966 0.561534 5.46884 0.461766C5.62801 0.361997 5.81207 0.309082 5.99993 0.309082C6.18778 0.309082 6.37184 0.361997 6.53101 0.461766C6.69019 0.561534 6.81804 0.704121 6.89993 0.873192L7.86193 2.87319C7.93455 3.02416 8.04395 3.15447 8.18006 3.25214C8.31617 3.34982 8.47465 3.41173 8.64093 3.43219L10.8409 3.70219C11.0307 3.72541 11.2098 3.80252 11.357 3.92438C11.5043 4.04625 11.6135 4.20777 11.6718 4.38981C11.7301 4.57186 11.735 4.76679 11.686 4.95153C11.6369 5.13627 11.5359 5.30308 11.3949 5.43219L9.81193 6.88519C9.68547 7.00097 9.59092 7.14732 9.53733 7.31018C9.48374 7.47304 9.47293 7.64695 9.50593 7.81519L9.91993 9.92619C9.95658 10.1121 9.93964 10.3047 9.87108 10.4814C9.80252 10.658 9.68517 10.8116 9.53269 10.9242C9.38021 11.0367 9.19888 11.1036 9.00984 11.1171C8.82079 11.1305 8.63182 11.09 8.46493 11.0002L6.47393 9.93019C6.32837 9.85194 6.16568 9.81099 6.00043 9.81099C5.83517 9.81099 5.67248 9.85194 5.52693 9.93019L3.53493 11.0002C3.36803 11.09 3.17906 11.1305 2.99002 11.1171C2.80097 11.1036 2.61965 11.0367 2.46717 10.9242C2.31468 10.8116 2.19733 10.658 2.12877 10.4814C2.06021 10.3047 2.04327 10.1121 2.07993 9.92619L2.49393 7.81519C2.52692 7.64695 2.51611 7.47304 2.46252 7.31018C2.40894 7.14732 2.31438 7.00097 2.18793 6.88519L0.599926 5.43119C0.45866 5.30213 0.357387 5.13526 0.308124 4.95036C0.258862 4.76547 0.263679 4.57033 0.322003 4.38809C0.380327 4.20585 0.48971 4.04418 0.63717 3.92224C0.78463 3.80031 0.963977 3.72325 1.15393 3.70019L3.35393 3.43019C3.5202 3.40973 3.67868 3.34782 3.81479 3.25014C3.9509 3.15247 4.0603 3.02216 4.13293 2.87119L5.09993 0.873192Z" fill="${fillColor}" opacity="${opacity}"/>
            </svg>
        `;
  }
}

export { CatalogManager };

export async function initializeCatalog() {
  const catalogManager = new CatalogManager();
  await catalogManager.init();
  setupEventListeners(catalogManager);
  return catalogManager;
}

function setupEventListeners(catalog: CatalogManager) {
  const filterForm = document.querySelector<HTMLFormElement>('#catalog-filters-form');
  if (filterForm) {
    const closeAll = () => {
      for (const el of filterForm.querySelectorAll<HTMLElement>('.catalog-filters__select.open')) {
        el.classList.remove('open');
      }
    };

    const bindCustomSelect = (custom: HTMLElement) => {
      const display = custom.querySelector<HTMLElement>('.catalog-filters__select-display');
      const optionsList = custom.querySelector<HTMLElement>('.catalog-filters__select-options');
      const targetName = custom.dataset.target;
      const hiddenSelect = targetName ? filterForm.querySelector<HTMLSelectElement>(`select[name="${targetName}"]`) : null;

      display?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = custom.classList.contains('open');
        closeAll();
        if (!isOpen) custom.classList.add('open');
      });

      for (const li of optionsList?.querySelectorAll<HTMLLIElement>('li') ?? []) {
        li.addEventListener('click', () => {
          const value = li.dataset.value ?? '';
          const label = li.textContent ?? 'Choose option';
          if (hiddenSelect && display) {
            hiddenSelect.value = value;
            display.textContent = label;
            custom.classList.remove('open');
            applyFiltersFromForm(filterForm, catalog);
          }
        });
      }
    };

    for (const custom of filterForm.querySelectorAll<HTMLElement>('.catalog-filters__select')) {
      bindCustomSelect(custom);
    }

    document.addEventListener('click', closeAll);

    const bindChange = (el: HTMLSelectElement | null) =>
      el?.addEventListener('change', () => applyFiltersFromForm(filterForm, catalog));
    bindChange(filterForm.querySelector('select[name="size"]'));
    bindChange(filterForm.querySelector('select[name="color"]'));
    bindChange(filterForm.querySelector('select[name="category"]'));

    const salesCheckbox = filterForm.querySelector<HTMLInputElement>('input[name="sales"]');
    if (salesCheckbox) salesCheckbox.addEventListener('change', () => applyFiltersFromForm(filterForm, catalog));

    const clearButton = filterForm.querySelector<HTMLButtonElement>('.catalog-filters__button--clear');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        filterForm.reset();
        for (const d of filterForm.querySelectorAll<HTMLElement>('.catalog-filters__select .catalog-filters__select-display')) {
          d.textContent = 'Choose option';
        }
        catalog.filteredProducts = [...catalog.products];
        catalog.currentPage = 1;
        void catalog.renderProducts();
        catalog.updateProductCount();
      });
    }
    const hideButton = filterForm.querySelector<HTMLButtonElement>('.catalog-filters__button--hide');
    if (hideButton) {
      hideButton.addEventListener('click', () => {
        const filtersSection = document.querySelector<HTMLElement>('.catalog-filters__row');
        const isHidden = filtersSection?.style.display === 'none';
        if (filtersSection) filtersSection.style.display = isHidden ? 'grid' : 'none';
        hideButton.textContent = isHidden ? 'HIDE FILTERS' : 'OPEN FILTERS';
      });
    }
  }

  const sortSelect = document.querySelector<HTMLSelectElement>('#sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      void catalog.sortProducts(sortSelect.value);
    });
  }

  const searchForm = document.querySelector<HTMLFormElement>('.catalog-controls__search');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const searchInput = searchForm.querySelector<HTMLInputElement>('input[type="search"]');
      if (searchInput) {
        void catalog.searchProducts(searchInput.value);
      }
    });
  }

  const prevButton = document.querySelector<HTMLButtonElement>('.catalog-pagination__button--prev');
  const nextButton = document.querySelector<HTMLButtonElement>('.catalog-pagination__button--next');

  prevButton?.addEventListener('click', () => void catalog.goToPreviousPage());
  nextButton?.addEventListener('click', () => void catalog.goToNextPage());
}

function formFieldString(entry: FormDataEntryValue | null): string {
  if (entry == null) {
    return '';
  }
  return typeof entry === 'string' ? entry : '';
}

function applyFiltersFromForm(filterForm: HTMLFormElement, catalog: CatalogManager) {
  const formData = new FormData(filterForm);
  const filters: Filters = {
    size: formFieldString(formData.get('size')),
    color: formFieldString(formData.get('color')),
    category: formFieldString(formData.get('category')),
    sales: formData.has('sales'),
  };
  void catalog.filterProducts(filters);
}

