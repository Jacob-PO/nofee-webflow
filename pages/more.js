// 🚀 노피 더보기 페이지 스크립트 v4.0 - 토스 스타일
(function() {
    'use strict';
    
    // 🎯 전역 상태 관리
    let state = {
        config: null,
        products: [],
        filteredProducts: [],
        brands: {},
        models: {},
        currentPage: 1,
        pageSize: 12,
        isDataLoaded: false,
        loadingErrors: [],
        activeFilter: 'all', // 'hot', 'save', 'guarantee', 'all'
        activeSortBy: 'discount' // 'discount', 'asc', 'desc'
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

        sanitizeHTML: (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
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

            // 원본 데이터 보존하면서 변환된 데이터 추가
            const transformed = { 
                ...item, // 원본 데이터 모두 보존
                // UI 표시용 변환된 데이터 추가
                displayCarrier: carrierMap[item.carrier] || item.carrier,
                displayType: typeMap[item.contract_type] || item.contract_type,
                displayModel: modelMap[item.model_name] || item.model_name,
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

        getUrlParams: () => {
            const params = new URLSearchParams(window.location.search);
            return {
                filter: params.get('filter') || 'all',
                sort: params.get('sort') || 'discount'
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
                    state.loadingErrors.push({ name, error: error.message });
                    throw error;
                }
            }
        },

        async loadAllData() {
            try {
                console.log('🚀 노피 더보기 데이터 로드 시작...');
                
                // 설정 데이터 로드
                state.config = await this.fetchData(DATA_URLS.config, 'config', true) || this.getDefaultConfig();
                
                // 병렬로 모든 데이터 로드
                const results = await Promise.allSettled([
                    this.fetchData(DATA_URLS.products, 'products', true).then(data => {
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
                    console.warn(`⚠️ ${failedLoads.length}개 데이터 로드 실패, 기본값으로 진행`);
                }
                
                state.isDataLoaded = true;
                console.log('✅ 데이터 로드 완료');
                
                // URL 파라미터 확인
                const urlParams = utils.getUrlParams();
                state.activeFilter = urlParams.filter;
                state.activeSortBy = urlParams.sort;
                
                console.log(`🔍 URL 파라미터 - Filter: ${state.activeFilter}, Sort: ${state.activeSortBy}`);
                
                // 로딩 화면 숨기고 메인 화면 표시
                this.hideLoading();
                await this.initializeApp();
                
            } catch (error) {
                console.error('❌ Critical data loading failed:', error);
                this.showError('데이터를 불러오는데 실패했습니다');
            }
        },

        getDefaultConfig() {
            return {
                site: {
                    name: "노피",
                    title: "노피 - 휴대폰 최저가"
                },
                urls: {
                    ai: "https://nofee.team/ai",
                    products: "https://nofee.team/more"
                }
            };
        },

        async initializeApp() {
            try {
                this.renderHeader();
                this.renderFilterTabs();
                this.applyCustomFilter();
                this.renderProducts();
                this.initializeInteractions();
                
                console.log('🎉 더보기 페이지 초기화 완료');
                
            } catch (error) {
                console.error('❌ App initialization failed:', error);
            }
        },

        renderHeader() {
            const headerElement = document.querySelector('.more-header');
            if (!headerElement) return;

            const filterTitles = {
                'hot': '🔥 지금 가장 핫한 폰',
                'save': '💰 월납부금 절약 상품',
                'guarantee': '🎯 전국 성지가격 보장',
                'all': '📱 전체 상품'
            };

            const filterSubtitles = {
                'hot': '할인율 높은 순으로 정렬된 인기 상품',
                'save': '월납부금이 저렴한 순으로 정렬',
                'guarantee': '어디서나 동일한 최저가로 구매 가능',
                'all': '모든 휴대폰 상품을 한눈에'
            };

            headerElement.innerHTML = `
                <div class="header-content">
                    <h1 class="page-title">${filterTitles[state.activeFilter]}</h1>
                    <p class="page-subtitle">${filterSubtitles[state.activeFilter]}</p>
                    <div class="product-count">
                        총 <span id="productCount">0</span>개 상품
                    </div>
                </div>
            `;
        },

        renderFilterTabs() {
            const tabsElement = document.querySelector('.filter-tabs');
            if (!tabsElement) return;

            const tabs = [
                { id: 'hot', label: '🔥 핫딜', desc: '할인율 높은순' },
                { id: 'save', label: '💰 절약', desc: '가격 낮은순' },
                { id: 'guarantee', label: '🎯 보장', desc: '성지가격' },
                { id: 'all', label: '📱 전체', desc: '모든 상품' }
            ];

            tabsElement.innerHTML = tabs.map(tab => `
                <div class="filter-tab ${state.activeFilter === tab.id ? 'active' : ''}" data-filter="${tab.id}">
                    <div class="tab-label">${tab.label}</div>
                    <div class="tab-desc">${tab.desc}</div>
                </div>
            `).join('');
        },

        applyCustomFilter() {
            let filtered = [...state.products];

            // 커스텀 필터 적용
            switch (state.activeFilter) {
                case 'hot':
                    // 할인율이 있는 상품만 (할인율 높은 순)
                    filtered = filtered
                        .filter(product => {
                            const discount = this.calculateDiscount(product.displayModel, product.principal);
                            return discount.rate > 0;
                        })
                        .sort((a, b) => {
                            const discountA = this.calculateDiscount(a.displayModel, a.principal).rate;
                            const discountB = this.calculateDiscount(b.displayModel, b.principal).rate;
                            return discountB - discountA;
                        });
                    break;
                
                case 'save':
                    // 가격 낮은 순
                    filtered = filtered.sort((a, b) => a.total - b.total);
                    break;
                
                case 'guarantee':
                    // 모든 상품 (노피는 모든 상품이 성지가격 보장)
                    break;
                
                case 'all':
                default:
                    // 할인율 높은 순으로 기본 정렬
                    filtered = filtered.sort((a, b) => {
                        const discountA = this.calculateDiscount(a.displayModel, a.principal).rate;
                        const discountB = this.calculateDiscount(b.displayModel, b.principal).rate;
                        return discountB - discountA;
                    });
                    break;
            }

            state.filteredProducts = filtered;
            state.currentPage = 1;

            console.log(`🔍 필터 적용 완료 (${state.activeFilter}): ${filtered.length}개 상품`);
        },

        renderProducts() {
            const productsGrid = document.querySelector('.products-grid');
            const productCount = document.getElementById('productCount');
            
            if (!productsGrid) return;

            // 상품 개수 업데이트
            if (productCount) {
                productCount.textContent = state.filteredProducts.length;
            }

            // 표시할 상품 수 계산
            const productsToShow = state.filteredProducts.slice(0, state.currentPage * state.pageSize);

            if (state.filteredProducts.length === 0) {
                productsGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h3 class="empty-title">상품이 없습니다</h3>
                        <p class="empty-message">다른 필터를 선택해보세요</p>
                    </div>
                `;
                this.updateLoadMoreButton(false);
                return;
            }

            // 상품 카드 생성
            productsGrid.innerHTML = productsToShow.map((product, index) => {
                const brandInfo = this.getBrandInfo(product);
                const discount = this.calculateDiscount(product.displayModel, product.principal);
                
                return `
                    <div class="product-card" data-product='${JSON.stringify(product)}' style="animation-delay: ${(index % 12) * 0.05}s;">
                        <div class="product-header">
                            <div class="brand-badge">${product.displayCarrier}</div>
                            ${discount.rate > 0 ? `<div class="discount-badge">${discount.rate}% 할인</div>` : ''}
                        </div>
                        <h3 class="product-title">${utils.sanitizeHTML(product.displayModel)}</h3>
                        <div class="product-meta">
                            <span class="meta-info">${product.displayType}</span>
                            <span class="meta-info">${product.contract_period}개월</span>
                        </div>
                        <div class="product-pricing">
                            <div class="price-breakdown">
                                <div class="price-item">
                                    <span>통신료</span>
                                    <span>${utils.formatKRW(product.plan)}</span>
                                </div>
                                <div class="price-item">
                                    <span>할부금</span>
                                    <span>${utils.formatKRW(product.installment)}</span>
                                </div>
                            </div>
                            <div class="total-price">
                                <div class="total-label">월 납부금</div>
                                <div class="total-value">${utils.formatKRW(product.total)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // 더보기 버튼 업데이트
            const hasMore = productsToShow.length < state.filteredProducts.length;
            this.updateLoadMoreButton(hasMore);
        },

        updateLoadMoreButton(hasMore) {
            const loadMoreSection = document.querySelector('.load-more-section');
            if (!loadMoreSection) return;

            if (hasMore) {
                loadMoreSection.innerHTML = `
                    <button class="load-more-btn" id="loadMoreBtn">
                        상품 더 보기
                        <span class="load-more-arrow">↓</span>
                    </button>
                `;
                
                const loadMoreBtn = document.getElementById('loadMoreBtn');
                if (loadMoreBtn) {
                    loadMoreBtn.addEventListener('click', () => {
                        state.currentPage++;
                        this.renderProducts();
                    });
                }
            } else {
                loadMoreSection.innerHTML = `
                    <div class="all-loaded">
                        모든 상품을 확인했습니다 ✨
                    </div>
                `;
            }
        },

        // 헬퍼 메서드들
        getBrandInfo(product) {
            const brand = product.displayModel;
            if (brand.includes('갤럭시') || brand.includes('Galaxy')) {
                return { icon: 'S', class: 'samsung', name: '삼성' };
            }
            if (brand.includes('아이폰') || brand.includes('iPhone')) {
                return { icon: 'A', class: 'apple', name: '애플' };
            }
            return { icon: '📱', class: 'etc', name: '기타' };
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

        initializeInteractions() {
            // 필터 탭 클릭 이벤트
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const newFilter = tab.dataset.filter;
                    if (newFilter !== state.activeFilter) {
                        // URL 업데이트
                        const url = new URL(window.location);
                        url.searchParams.set('filter', newFilter);
                        window.history.pushState({}, '', url);
                        
                        // 상태 업데이트 및 리렌더링
                        state.activeFilter = newFilter;
                        this.renderHeader();
                        this.renderFilterTabs();
                        this.applyCustomFilter();
                        this.renderProducts();
                    }
                });
            });

            // 상품 카드 클릭 이벤트
            document.addEventListener('click', (e) => {
                const productCard = e.target.closest('.product-card');
                if (productCard) {
                    try {
                        const product = JSON.parse(productCard.dataset.product);
                        this.handleProductClick(product);
                    } catch (error) {
                        console.error('Product click error:', error);
                    }
                }
            });
        },

        handleProductClick(product) {
            // AI 상담 페이지로 이동 (모든 데이터 전달)
            const aiUrl = state.config?.urls?.ai || 'https://nofee.team/ai';
            const params = new URLSearchParams();
            
            // 원본 상품 데이터의 모든 필드를 전달
            Object.keys(product).forEach(key => {
                if (product[key] !== null && product[key] !== undefined) {
                    params.append(key, product[key]);
                }
            });
            
            window.open(`${aiUrl}?${params.toString()}`, '_blank');
        },

        hideLoading() {
            const loadingElement = document.querySelector('.loading-screen');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        },

        showError(message) {
            this.hideLoading();
            const errorElement = document.querySelector('.error-screen');
            if (errorElement) {
                errorElement.querySelector('.error-message').textContent = message;
                errorElement.style.display = 'flex';
            }
        }
    };

    // 🚀 메인 초기화 함수
    async function initNofeeMore() {
        try {
            console.log('🚀 노피 더보기 페이지 v4.0 초기화 시작');
            
            await dataLoader.loadAllData();
            
            // 전역 상태 노출
            window.nofeeMoreState = state;
            
            console.log('✅ 노피 더보기 페이지 v4.0 초기화 완료');
            
        } catch (error) {
            console.error('❌ Critical initialization failure:', error);
            dataLoader.showError('시스템 초기화에 실패했습니다');
        }
    }

    // 🎯 DOM 준비 확인 및 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNofeeMore);
    } else {
        setTimeout(initNofeeMore, 0);
    }

})();
