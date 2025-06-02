// 🚀 노피 더보기 페이지 스크립트 v4.0 - 토스 스타일 + 커스텀 필터
(function() {
    'use strict';
    
    // 🎯 전역 상태 관리
    let state = {
        config: null,
        products: [],
        filteredProducts: [],
        currentPage: 1,
        pageSize: 12,
        isLoading: false,
        filters: {
            carrier: '',
            brand: '',
            type: '',
            support: '',
            preset: '' // 메인에서 넘어온 프리셋 필터
        },
        brands: {},
        models: {}
    };

    // GitHub 저장소 설정
    const scriptUrl = new URL(document.currentScript.src);
    const basePath = scriptUrl.pathname.split('/').slice(0, -2).join('/');
    const GITHUB_BASE_URL = scriptUrl.origin + basePath;
    
    // 📂 데이터 URL 설정
    const DATA_URLS = {
        config: `${GITHUB_BASE_URL}/data/config.json`,
        products: `${GITHUB_BASE_URL}/data/products.json`,
        brands: `${GITHUB_BASE_URL}/data/brands.json`,
        models: `${GITHUB_BASE_URL}/data/models.json`
    };

    // 🔧 유틸리티 함수들
    const utils = {
        formatKRW: (value) => {
            const num = Math.abs(Number(value));
            if (num >= 10000) {
                return Math.floor(num / 10000) + '만원';
            }
            return num.toLocaleString("ko-KR") + "원";
        },

        formatCompactKRW: (value) => {
            const num = Math.abs(Number(value));
            if (num >= 100000000) {
                return (num / 100000000).toFixed(1) + '억원';
            }
            if (num >= 10000) {
                return Math.floor(num / 10000) + '만원';
            }
            return num.toLocaleString("ko-KR") + "원";
        },

        sanitizeHTML: (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        createElement: (tag, className, innerHTML) => {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (innerHTML) element.innerHTML = innerHTML;
            return element;
        },

        transformProduct: (item) => {
            const modelMap = {
                'S25-256': '갤럭시 S25 256GB',
                'S25플러스-256': '갤럭시 S25+ 256GB',
                'S25울트라-256': '갤럭시 S25 Ultra 256GB',
                'S24FE': '갤럭시 S24 FE',
                '플립6-256': '갤럭시 Z 플립6 256GB',
                '폴드6-256': '갤럭시 Z 폴드6 256GB',
                '아이폰16-128': '아이폰 16 128GB',
                '아이폰16프로-256': '아이폰 16 Pro 256GB',
                '아이폰16프로맥스-256': '아이폰 16 Pro Max 256GB'
            };
            
            const carrierMap = { SK: 'SKT', KT: 'KT', LG: 'LGU+' };
            const typeMap = { '이동': '번호이동', '기변': '기기변경' };
            const supportMap = { '공시': '공시지원', '선약': '선택약정' };

            // 원본 데이터 보존하면서 변환된 데이터 추가
            const transformed = { 
                ...item, // 원본 데이터 모두 보존
                // UI 표시용 변환된 데이터 추가
                displayCarrier: carrierMap[item.carrier] || item.carrier,
                displayType: typeMap[item.contract_type] || item.contract_type,
                displayModel: modelMap[item.model_name] || item.model_name,
                displaySupport: supportMap[item.subsidy_type] || item.subsidy_type,
                // 계산된 필드들
                principal: item.device_principal || 0,
                plan: item.plan_effective_monthly_payment || 0,
                installment: item.device_monthly_payment || 0,
                total: item.total_monthly_payment || 0,
                contract_period: item.contract_months || 24
            };

            return transformed;
        },

        transformProducts: (data) => {
            if (!Array.isArray(data)) return [];
            return data.map(utils.transformProduct);
        },

        showElement: (selector) => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'block';
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, 50);
            }
        },

        hideElement: (selector) => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
            }
        },

        getUrlParams: () => {
            const params = new URLSearchParams(window.location.search);
            return {
                filter: params.get('filter') || '', // hot, save, best, uniform
                carrier: params.get('carrier') || '',
                brand: params.get('brand') || '',
                type: params.get('type') || '',
                support: params.get('support') || ''
            };
        }
    };

    // 📥 데이터 로더
    const dataLoader = {
        async fetchData(url, name, isOptional = false) {
            try {
                console.log(`📥 Loading ${name} from ${url}`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`✅ ${name} loaded successfully`);
                return data;
            } catch (error) {
                if (isOptional) {
                    console.warn(`⚠️ Optional ${name} load failed:`, error.message);
                    return null;
                } else {
                    console.error(`❌ Failed to load ${name}:`, error.message);
                    throw error;
                }
            }
        },

        async loadAllData() {
            try {
                console.log('🚀 노피 더보기 데이터 로드 시작...');
                state.isLoading = true;

                // 병렬로 모든 데이터 로드
                const results = await Promise.allSettled([
                    this.fetchData(DATA_URLS.config, 'config', true).then(data => {
                        state.config = data || { urls: { ai: 'https://nofee.team/ai', products: 'https://nofee.team/more' } };
                    }),
                    this.fetchData(DATA_URLS.products, 'products').then(data => {
                        state.products = utils.transformProducts(data || []);
                    }),
                    this.fetchData(DATA_URLS.brands, 'brands', true).then(data => {
                        state.brands = data || {};
                    }),
                    this.fetchData(DATA_URLS.models, 'models', true).then(data => {
                        state.models = data || {};
                    })
                ]);
                
                const failedLoads = results.filter(result => result.status === 'rejected');
                if (failedLoads.length > 0) {
                    console.warn(`⚠️ ${failedLoads.length}개 데이터 로드 실패`);
                }
                
                state.isLoading = false;
                console.log('✅ 데이터 로드 완료');
                
                // URL 파라미터 적용
                this.applyUrlParams();
                
                // UI 초기화
                await this.initializeApp();
                
            } catch (error) {
                console.error('❌ Critical data loading failed:', error);
                this.showError('데이터를 불러오는데 실패했습니다');
            }
        },

        applyUrlParams() {
            const params = utils.getUrlParams();
            
            // URL에서 받은 필터 적용
            state.filters = {
                carrier: params.carrier,
                brand: params.brand,
                type: params.type,
                support: params.support,
                preset: params.filter
            };

            console.log('🔗 URL 파라미터 적용:', state.filters);
        },

        async initializeApp() {
            try {
                this.renderHeader();
                this.renderFilters();
                this.applyFilters();
                this.initializeInteractions();
                
                // 로딩 화면 숨기고 메인 화면 표시
                utils.hideElement('.loading-screen');
                utils.showElement('.more-content');
                
                console.log('🎉 더보기 페이지 초기화 완료');
                
            } catch (error) {
                console.error('❌ App initialization failed:', error);
            }
        },

        renderHeader() {
            const headerElement = document.querySelector('.page-header');
            if (!headerElement) return;

            const preset = state.filters.preset;
            let title = '전체 상품';
            let subtitle = '노피의 모든 상품을 확인해보세요';

            // 프리셋 필터에 따른 타이틀 변경
            switch (preset) {
                case 'hot':
                    title = '🔥 지금 가장 핫한 폰';
                    subtitle = '할인율 높은 순으로 정렬된 인기 상품';
                    break;
                case 'save':
                    title = '💰 월납 절약 상품';
                    subtitle = '가장 저렴한 월납부금 상품들';
                    break;
                case 'best':
                    title = '🎯 AI 추천 상품';
                    subtitle = '당신에게 딱 맞는 최저가 상품';
                    break;
                case 'uniform':
                    title = '🏆 균일가 보장 상품';
                    subtitle = '전국 어디서나 동일한 최저가';
                    break;
            }

            headerElement.innerHTML = `
                <div class="header-content">
                    <h1 class="page-title">${title}</h1>
                    <p class="page-subtitle">${subtitle}</p>
                    <div class="product-count-badge">
                        <span id="productCount">0</span>개 상품
                    </div>
                </div>
            `;
        },

        renderFilters() {
            const filtersElement = document.querySelector('.filters-section');
            if (!filtersElement) return;

            // 실제 데이터에서 옵션 추출
            const carriers = [...new Set(state.products.map(p => p.displayCarrier))].filter(Boolean).sort();
            const brands = [...new Set(state.products.map(p => p.brand))].filter(Boolean).sort();
            const types = [...new Set(state.products.map(p => p.displayType))].filter(Boolean).sort();
            const supports = [...new Set(state.products.map(p => p.displaySupport))].filter(Boolean).sort();

            filtersElement.innerHTML = `
                <div class="filters-grid">
                    <div class="filter-card">
                        <select class="filter-select" data-filter="carrier">
                            <option value="">통신사 전체</option>
                            ${carriers.map(carrier => 
                                `<option value="${carrier}" ${state.filters.carrier === carrier ? 'selected' : ''}>${carrier}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-card">
                        <select class="filter-select" data-filter="brand">
                            <option value="">브랜드 전체</option>
                            ${brands.map(brand => 
                                `<option value="${brand}" ${state.filters.brand === brand ? 'selected' : ''}>${brand}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-card">
                        <select class="filter-select" data-filter="type">
                            <option value="">가입유형 전체</option>
                            ${types.map(type => 
                                `<option value="${type}" ${state.filters.type === type ? 'selected' : ''}>${type}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-card">
                        <select class="filter-select" data-filter="support">
                            <option value="">지원금 전체</option>
                            ${supports.map(support => 
                                `<option value="${support}" ${state.filters.support === support ? 'selected' : ''}>${support}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="active-filters" id="activeFilters"></div>
            `;
        },

        applyFilters() {
            let filtered = [...state.products];

            // 필터 적용
            if (state.filters.carrier) {
                filtered = filtered.filter(p => p.displayCarrier === state.filters.carrier);
            }
            if (state.filters.brand) {
                filtered = filtered.filter(p => p.brand === state.filters.brand);
            }
            if (state.filters.type) {
                filtered = filtered.filter(p => p.displayType === state.filters.type);
            }
            if (state.filters.support) {
                filtered = filtered.filter(p => p.displaySupport === state.filters.support);
            }

            // 프리셋 필터에 따른 정렬
            switch (state.filters.preset) {
                case 'hot':
                    // 할인율 높은 순
                    filtered = filtered
                        .map(product => {
                            const discount = this.calculateDiscount(product.displayModel, product.principal);
                            return { ...product, discountRate: discount.rate };
                        })
                        .sort((a, b) => b.discountRate - a.discountRate);
                    break;
                case 'save':
                    // 월납부금 낮은 순
                    filtered.sort((a, b) => a.total - b.total);
                    break;
                case 'best':
                    // AI 추천 순 (할인율 + 가격 종합)
                    filtered = filtered
                        .map(product => {
                            const discount = this.calculateDiscount(product.displayModel, product.principal);
                            const score = discount.rate * 0.7 + (100000 - product.total) / 1000 * 0.3;
                            return { ...product, aiScore: score };
                        })
                        .sort((a, b) => b.aiScore - a.aiScore);
                    break;
                default:
                    // 기본 정렬 (할인율 순)
                    filtered = filtered
                        .map(product => {
                            const discount = this.calculateDiscount(product.displayModel, product.principal);
                            return { ...product, discountRate: discount.rate };
                        })
                        .sort((a, b) => b.discountRate - a.discountRate);
            }

            state.filteredProducts = filtered;
            state.currentPage = 1;

            this.renderProducts();
            this.updateActiveFilters();
            this.updateProductCount();

            console.log(`🔍 필터 적용 완료: ${filtered.length}개 상품`);
        },

        renderProducts() {
            const productsElement = document.querySelector('.products-grid');
            if (!productsElement) return;

            const productsToShow = state.filteredProducts.slice(0, state.currentPage * state.pageSize);

            if (state.filteredProducts.length === 0) {
                productsElement.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h3 class="empty-title">검색 결과가 없습니다</h3>
                        <p class="empty-message">다른 조건으로 검색해보세요</p>
                    </div>
                `;
                this.updateLoadMoreButton(false);
                return;
            }

            const productsHTML = productsToShow.map((product, index) => {
                const discount = this.calculateDiscount(product.displayModel, product.principal);
                
                return `
                    <div class="product-card" data-product='${JSON.stringify(product)}' 
                         style="animation-delay: ${(index % 12) * 0.05}s;">
                        <div class="product-header">
                            <div class="brand-badge">${product.displayCarrier}</div>
                            ${discount.rate > 0 ? `<div class="discount-badge">${discount.rate}% 할인</div>` : ''}
                        </div>
                        <h3 class="product-title">${utils.sanitizeHTML(product.displayModel)}</h3>
                        <div class="product-meta">
                            <span class="meta-item">${product.brand}</span>
                            <span class="meta-item">${product.displayType}</span>
                            <span class="meta-item">${product.displaySupport}</span>
                        </div>
                        <div class="price-section">
                            <div class="price-breakdown">
                                <div class="price-row">
                                    <span>통신료</span>
                                    <span>${utils.formatKRW(product.plan)}</span>
                                </div>
                                <div class="price-row">
                                    <span>할부금</span>
                                    <span>${utils.formatKRW(product.installment)}</span>
                                </div>
                                ${discount.amount > 0 ? `
                                <div class="price-row discount-row">
                                    <span>지원금</span>
                                    <span>-${utils.formatKRW(discount.amount)}</span>
                                </div>
                                ` : ''}
                            </div>
                            <div class="total-price">
                                <div class="price-label">월 납부금</div>
                                <div class="price-value">${utils.formatKRW(product.total)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            productsElement.innerHTML = productsHTML;

            // 더보기 버튼 업데이트
            const hasMore = productsToShow.length < state.filteredProducts.length;
            this.updateLoadMoreButton(hasMore);
        },

        calculateDiscount(model, principal) {
            const originPrice = this.getOriginPrice(model);
            if (principal >= 0) {
                return { amount: 0, rate: 0, originPrice };
            }
            
            const discountAmount = Math.abs(principal);
            const discountRate = Math.round((discountAmount / originPrice) * 100);
            return { amount: discountAmount, rate: discountRate, originPrice };
        },

        getOriginPrice(model) {
            if (state.models[model]) {
                return state.models[model].originPrice;
            }
            
            for (const [key, value] of Object.entries(state.models)) {
                if (model.includes(key) || key.includes(model)) {
                    return value.originPrice;
                }
            }
            
            return 1000000; // 기본값
        },

        updateActiveFilters() {
            const activeFiltersElement = document.getElementById('activeFilters');
            if (!activeFiltersElement) return;

            const activeTags = [];

            Object.entries(state.filters).forEach(([key, value]) => {
                if (value && key !== 'preset') {
                    let displayValue = value;
                    
                    // 프리셋 이름 변환
                    if (key === 'preset') {
                        const presetNames = {
                            'hot': '🔥 핫딜',
                            'save': '💰 절약',
                            'best': '🎯 AI추천',
                            'uniform': '🏆 균일가'
                        };
                        displayValue = presetNames[value] || value;
                    }

                    activeTags.push(`
                        <div class="filter-tag">
                            ${displayValue}
                            <span class="filter-remove" onclick="filterManager.removeFilter('${key}')">&times;</span>
                        </div>
                    `);
                }
            });

            activeFiltersElement.innerHTML = activeTags.join('');
        },

        updateProductCount() {
            const countElement = document.getElementById('productCount');
            if (countElement) {
                countElement.textContent = state.filteredProducts.length;
            }
        },

        updateLoadMoreButton(hasMore) {
            const loadMoreElement = document.querySelector('.load-more');
            if (!loadMoreElement) return;

            if (hasMore) {
                loadMoreElement.style.display = 'block';
            } else {
                loadMoreElement.style.display = 'none';
            }
        },

        initializeInteractions() {
            // 필터 select 이벤트
            document.querySelectorAll('.filter-select').forEach(select => {
                select.addEventListener('change', (e) => {
                    const filterType = e.target.dataset.filter;
                    const value = e.target.value;
                    this.setFilter(filterType, value);
                });
            });

            // 상품 클릭 이벤트
            document.addEventListener('click', (e) => {
                const productCard = e.target.closest('.product-card');
                if (productCard) {
                    this.handleProductClick(productCard);
                }
            });

            // 더보기 버튼
            const loadMoreBtn = document.querySelector('.load-more-btn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', () => {
                    state.currentPage++;
                    this.renderProducts();
                });
            }
        },

        setFilter(filterType, value) {
            state.filters[filterType] = value;
            this.applyFilters();
            console.log(`🔍 필터 설정: ${filterType} = ${value || '전체'}`);
        },

        removeFilter(filterType) {
            state.filters[filterType] = '';
            
            // 해당 select 초기화
            const select = document.querySelector(`[data-filter="${filterType}"]`);
            if (select) {
                select.value = '';
            }
            
            this.applyFilters();
            console.log(`🗑️ 필터 제거: ${filterType}`);
        },

        handleProductClick(productCard) {
            try {
                const product = JSON.parse(productCard.dataset.product);
                
                // AI 페이지로 이동 (모든 JSON 데이터 전달)
                const aiUrl = state.config?.urls?.ai || 'https://nofee.team/ai';
                const params = new URLSearchParams();
                
                // 원본 상품 데이터의 모든 필드를 전달
                Object.keys(product).forEach(key => {
                    if (product[key] !== null && product[key] !== undefined) {
                        params.append(key, product[key]);
                    }
                });
                
                window.open(`${aiUrl}?${params.toString()}`, '_blank');
                
            } catch (error) {
                console.error('상품 클릭 처리 오류:', error);
            }
        },

        showError(message) {
            const contentElement = document.querySelector('.more-content');
            if (contentElement) {
                contentElement.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h3 class="error-title">오류가 발생했습니다</h3>
                        <p class="error-message">${message}</p>
                        <button class="retry-button" onclick="location.reload()">새로고침</button>
                    </div>
                `;
            }
        }
    };

    // 🔍 필터 매니저 (전역 노출용)
    const filterManager = {
        setFilter: (filterType, value) => dataLoader.setFilter(filterType, value),
        removeFilter: (filterType) => dataLoader.removeFilter(filterType),
        loadMore: () => {
            state.currentPage++;
            dataLoader.renderProducts();
        }
    };

    // 🚀 메인 초기화 함수
    async function initMorePage() {
        try {
            console.log('🚀 노피 더보기 페이지 v4.0 초기화 시작');
            
            await dataLoader.loadAllData();
            
            // 전역 상태 노출
            window.moreState = state;
            window.filterManager = filterManager;
            
            console.log('✅ 노피 더보기 페이지 v4.0 초기화 완료');
            
        } catch (error) {
            console.error('❌ 초기화 실패:', error);
            dataLoader.showError('시스템 초기화에 실패했습니다');
        }
    }

    // 🎯 DOM 준비 확인 및 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMorePage);
    } else {
        setTimeout(initMorePage, 0);
    }

    // 전역 함수 노출
    window.initMorePage = initMorePage;

})();
