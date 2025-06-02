// 🔍 노피 더보기(상품검색) 페이지 스크립트 - GitHub 관리용
(function() {
    'use strict';

    // 🐛 임시 디버깅 코드 - 배포 전 제거
    (function debugUrls() {
        console.log('🔍 현재 페이지 정보:');
        console.log('  - Origin:', window.location.origin);
        console.log('  - Pathname:', window.location.pathname);
        console.log('  - Host:', window.location.host);
    })();
    
    // 🎯 전역 상태 관리
    const state = {
        // 상품 데이터
        products: [],
        filteredProducts: [],
        
        // 페이지네이션
        currentPage: 1,
        pageSize: 12,
        isLoading: false,
        
        // 필터 상태
        filters: {
            carrier: '',
            brand: '',
            type: '',
            support: '',
            sort: ''
        },
        
        // DOM 요소
        elements: {},
        
        // 디바운스 타이머
        searchTimer: null
    };
    
    // ⚡ URL 설정 - 한 곳에서만 정의
    // 옵션 1: 현재 웹사이트 기준 (권장 - CORS 문제 없음)
    const PRODUCTS_DATA_URL = '/data/products.json';
    const MODELS_DATA_URL = '/data/models.json';

    // 옵션 2: GitHub Raw URLs (백업용)
    const BACKUP_PRODUCTS_URL = 'https://raw.githubusercontent.com/jacob-po/nofee-webflow/main/data/products.json';
    const BACKUP_MODELS_URL = 'https://raw.githubusercontent.com/jacob-po/nofee-webflow/main/data/models.json';

    // 옵션 3: 다른 가능한 GitHub Raw URLs
    const ALTERNATIVE_PRODUCTS_URL = 'https://raw.githubusercontent.com/jacob-po/products-data/main/products.json';
    const ALTERNATIVE_MODELS_URL = 'https://raw.githubusercontent.com/jacob-po/products-data/main/models.json';

    let modelsData = {};

    // URL 접근성 테스트 함수
    const testAllUrls = async () => {
        const urlsToTest = [
            { name: 'Primary Products', url: PRODUCTS_DATA_URL },
            { name: 'Primary Models', url: MODELS_DATA_URL },
            { name: 'Backup Products', url: BACKUP_PRODUCTS_URL },
            { name: 'Backup Models', url: BACKUP_MODELS_URL },
            { name: 'Alternative Products', url: ALTERNATIVE_PRODUCTS_URL },
            { name: 'Alternative Models', url: ALTERNATIVE_MODELS_URL }
        ];

        console.log('🧪 모든 URL 접근성 테스트:');
        for (const item of urlsToTest) {
            try {
                const response = await fetch(item.url, { method: 'HEAD' });
                console.log(`✅ ${item.name}: ${response.status} ${response.statusText}`);
            } catch (error) {
                console.log(`❌ ${item.name}: ${error.message}`);
            }
        }
    };

    // 즉시 URL 테스트 실행
    testAllUrls();
    
    // 설정값
    const CONFIG = {
        ANIMATION_DELAY: 20,
        ANIMATION_DURATION: 50,
        DEBOUNCE_DELAY: 200,
        VIEW_HISTORY_LIMIT: 20,
        CARD_FADE_DELAY: 0.05
    };
    
    // 🎨 유틸리티 함수들
    const utils = {
        formatKRW: (value) => {
            return Math.abs(Number(value)).toLocaleString("ko-KR") + "원";
        },
        
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        getBrandInfo: (brand) => {
            const brandMap = {
                '삼성': { icon: 'S', class: 'samsung', displayName: '삼성' },
                '애플': { icon: 'A', class: 'apple', displayName: '애플' },
                'Samsung': { icon: 'S', class: 'samsung', displayName: '삼성' },
                'Apple': { icon: 'A', class: 'apple', displayName: '애플' }
            };

            return brandMap[brand] || { icon: '📱', class: 'etc', displayName: brand };
        },

        getOriginPrice: (model) => {
            if (modelsData && modelsData[model]) {
                return modelsData[model].originPrice;
            }

            if (modelsData) {
                for (const [key, value] of Object.entries(modelsData)) {
                    if (model.includes(key) || key.includes(model)) {
                        return value.originPrice;
                    }
                }
            }

            const modelLower = model.toLowerCase();

            if (modelLower.includes('galaxy s25 ultra') || model.includes('갤럭시 S25 울트라')) return 1700000;
            if (modelLower.includes('galaxy s25+') || modelLower.includes('galaxy s25 plus') || model.includes('갤럭시 S25 플러스')) return 1400000;
            if (modelLower.includes('galaxy s25') || model.includes('갤럭시 S25')) return 1200000;

            if (modelLower.includes('galaxy s24 ultra') || model.includes('갤럭시 S24 울트라')) return 1600000;
            if (modelLower.includes('galaxy s24+') || modelLower.includes('galaxy s24 plus') || model.includes('갤럭시 S24 플러스')) return 1300000;
            if (modelLower.includes('galaxy s24 fe') || model.includes('갤럭시 S24 FE')) return 900000;
            if (modelLower.includes('galaxy s24') || model.includes('갤럭시 S24')) return 1100000;

            if (modelLower.includes('galaxy z fold') || model.includes('갤럭시 Z 폴드')) return 2200000;
            if (modelLower.includes('galaxy z flip') || model.includes('갤럭시 Z 플립')) return 1400000;

            if (modelLower.includes('iphone 16 pro max') || model.includes('아이폰 16 프로 맥스')) return 1900000;
            if (modelLower.includes('iphone 16 pro') || model.includes('아이폰 16 프로')) return 1550000;
            if (modelLower.includes('iphone 16 plus') || model.includes('아이폰 16 플러스')) return 1350000;
            if (modelLower.includes('iphone 16') || model.includes('아이폰 16')) return 1250000;
            if (modelLower.includes('iphone 15') || model.includes('아이폰 15')) return 1150000;

            return 1000000;
        },

        calculateDiscount: (originalPrice, principal) => {
            const origin = Number(originalPrice) || 0;
            const principalAmount = Number(principal) || 0;
            
            if (origin === 0) return { discount: 0, discountRate: 0 };
            
            const discount = Math.abs(principalAmount);
            const discountRate = Math.round((discount / origin) * 100);
            
            return { discount, discountRate };
        },
        
        normalizeProduct: (product) => {
            // 데이터 정규화
            return {
                ...product,
                brand: utils.normalizeBrand(product.brand),
                originPrice: product['origin price'] || product.originPrice || utils.getOriginPrice(product.model),
                principal: Number(product.principal) || 0,
                total: Number(product.total) || 0,
                installment: Number(product.installment) || 0,
                plan: Number(product.plan) || 0
            };
        },
        
        normalizeBrand: (brand) => {
            if (!brand) return '';
            const brandLower = brand.toLowerCase();
            if (brandLower === 'samsung') return '삼성';
            if (brandLower === 'apple') return '애플';
            return brand;
        },
        
        getFilterLabel: (category, value) => {
            const labels = {
                carrier: { 'KT': 'KT', 'LGU': 'LG유플러스', 'SKT': 'SK텔레콤' },
                brand: { '삼성': '삼성', '애플': '애플' },
                type: { '번호이동': '번호이동', '기기변경': '기기변경', '신규가입': '신규가입' },
                support: { '공시지원': '공시지원', '선택약정': '선택약정', 'O': '지원금O', 'X': '지원금X' },
                sort: { 'asc': '월납부금 낮은순', 'desc': '월납부금 높은순', 'discount': '할인율 높은순' }
            };
            
            return labels[category]?.[value] || value;
        }
    };
    
    // 🏷️ UI 렌더링 함수들
    const ui = {
        createProductCard: (product) => {
            const brandInfo = utils.getBrandInfo(product.brand);
            const { discount, discountRate } = utils.calculateDiscount(product.originPrice, product.principal);
            
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // 할인 정보 표시
            const discountInfo = discountRate > 0 
                ? `<span style="color: var(--error);">-${utils.formatKRW(discount)} (${discountRate}%)</span>`
                : `<span style="color: var(--gray-400);">할인 없음</span>`;
            
            card.innerHTML = `
                <div class="product-header">
                    <div class="brand-icon ${brandInfo.class}">${brandInfo.icon}</div>
                    <div class="product-info">
                        <h3>${product.model}</h3>
                        <div class="product-meta">
                            <span class="meta-tag">${product.carrier}</span>
                            <span class="meta-tag">${product.type}</span>
                            <span class="meta-tag">${product.support === 'O' ? '지원금O' : 
                                                  product.support === 'X' ? '지원금X' : 
                                                  product.support}</span>
                        </div>
                    </div>
                </div>
                
                <div class="price-breakdown">
                    <div class="price-row">
                        <span>출고가</span>
                        <span>${utils.formatKRW(product.originPrice)}</span>
                    </div>
                    <div class="price-row">
                        <span>할인금액</span>
                        ${discountInfo}
                    </div>
                    <div class="price-row">
                        <span>휴대폰 월할부</span>
                        <span>${utils.formatKRW(product.installment)}</span>
                    </div>
                    <div class="price-row">
                        <span>통신요금</span>
                        <span>${utils.formatKRW(product.plan)}</span>
                    </div>
                </div>
                
                <div class="price-total">
                    <div class="price-label">월 납부금 (기기값 + 요금제)</div>
                    <div class="price-value">${utils.formatKRW(product.total)}</div>
                </div>
            `;
            
            card.addEventListener('click', () => eventHandlers.handleProductClick(product));
            return card;
        },
        
        renderProducts: () => {
            state.filteredProducts = filterManager.getFilteredProducts();
            const visibleCount = state.currentPage * state.pageSize;
            const visibleProducts = state.filteredProducts.slice(0, visibleCount);
            
            // 카운트 업데이트
            state.elements.productCount.textContent = state.filteredProducts.length;
            
            // 활성 필터 표시
            ui.renderActiveFilters();
            
            // 상품 리스트 초기화
            state.elements.productList.innerHTML = '';
            
            if (visibleProducts.length === 0) {
                ui.renderNoResults();
                state.elements.loadMore.style.display = 'none';
                return;
            }
            
            // 상품 카드 생성 (애니메이션 효과)
            visibleProducts.forEach((product, index) => {
                setTimeout(() => {
                    const card = ui.createProductCard(product);
                    card.style.animationDelay = `${index * CONFIG.CARD_FADE_DELAY}s`;
                    state.elements.productList.appendChild(card);
                }, index * CONFIG.ANIMATION_DELAY);
            });
            
            // 더보기 버튼 처리
            ui.updateLoadMoreButton(visibleProducts.length);
        },
        
        renderActiveFilters: () => {
            const activeFilters = [];
            
            Object.entries(state.filters).forEach(([key, value]) => {
                if (value) {
                    const label = {
                        carrier: '통신사',
                        brand: '제조사',
                        type: '가입유형',
                        support: '개통옵션',
                        sort: '정렬'
                    }[key];
                    
                    activeFilters.push({
                        key,
                        label,
                        value: utils.getFilterLabel(key, value)
                    });
                }
            });
            
            state.elements.activeFilters.innerHTML = '';
            
            if (activeFilters.length === 0) return;
            
            activeFilters.forEach(filter => {
                const tag = document.createElement('div');
                tag.className = 'filter-tag';
                tag.innerHTML = `
                    <span>${filter.label}: ${filter.value}</span>
                    <span class="remove" data-filter="${filter.key}">×</span>
                `;
                
                tag.querySelector('.remove').addEventListener('click', () => {
                    filterManager.removeFilter(filter.key);
                });
                
                state.elements.activeFilters.appendChild(tag);
            });
        },
        
        renderNoResults: () => {
            state.elements.productList.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <h3>검색 결과가 없습니다</h3>
                    <p>다른 조건으로 검색해보시거나<br>필터를 초기화해보세요.</p>
                </div>
            `;
        },
        
        renderLoading: () => {
            state.elements.productList.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                </div>
            `;
        },
        
        renderError: (message = '데이터를 불러올 수 없습니다') => {
            state.elements.productList.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">⚠️</div>
                    <h3>${message}</h3>
                    <p>잠시 후 다시 시도해주세요.</p>
                </div>
            `;
        },
        
        updateLoadMoreButton: (visibleCount) => {
            const remainingCount = state.filteredProducts.length - visibleCount;
            
            if (remainingCount > 0) {
                state.elements.loadMore.style.display = 'block';
                state.elements.loadMoreText.textContent = `상품 ${remainingCount}개 더 보기`;
                state.elements.loadMoreBtn.disabled = false;
            } else {
                state.elements.loadMore.style.display = 'none';
            }
        },
        
        updateFilterButton: (category, value) => {
            const button = document.querySelector(`.filter-button[data-category="${category}"]`);
            if (!button) return;
            
            const textElement = button.querySelector('.filter-text');
            
            if (value) {
                textElement.textContent = utils.getFilterLabel(category, value);
                button.classList.add('active');
            } else {
                const defaultLabels = {
                    carrier: '통신사',
                    brand: '제조사',
                    type: '가입유형',
                    support: '개통옵션',
                    sort: '정렬'
                };
                textElement.textContent = defaultLabels[category];
                button.classList.remove('active');
            }
        },
        
        closeAllDropdowns: () => {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
            document.querySelectorAll('.filter-button').forEach(button => {
                button.classList.remove('open');
            });
        }
    };
    
    // 🔍 필터 관리
    const filterManager = {
        getFilteredProducts: () => {
            let result = [...state.products];
            
            // 정규화
            result = result.map(utils.normalizeProduct);
            
            // 출고가가 0원이거나 공란인 상품 제외
            result = result.filter(product => {
                return product.originPrice && product.originPrice > 0;
            });
            
            // 필터 적용
            if (state.filters.carrier) {
                result = result.filter(p => p.carrier === state.filters.carrier);
            }
            
            if (state.filters.brand) {
                const filterBrand = utils.normalizeBrand(state.filters.brand);
                result = result.filter(p => utils.normalizeBrand(p.brand) === filterBrand);
            }
            
            if (state.filters.type) {
                result = result.filter(p => p.type === state.filters.type);
            }
            
            if (state.filters.support) {
                result = result.filter(p => {
                    // support 필드 호환성 처리
                    if (state.filters.support === '공시지원') {
                        return p.support === '공시지원' || p.support === 'O';
                    }
                    if (state.filters.support === '선택약정') {
                        return p.support === '선택약정' || p.support === 'X';
                    }
                    return p.support === state.filters.support;
                });
            }
            
            // 정렬 적용
            if (state.filters.sort === 'asc') {
                result.sort((a, b) => a.total - b.total);
            } else if (state.filters.sort === 'desc') {
                result.sort((a, b) => b.total - a.total);
            } else if (state.filters.sort === 'discount') {
                result = result.map(product => {
                    const { discountRate } = utils.calculateDiscount(product.originPrice, product.principal);
                    return { ...product, discountRate };
                }).sort((a, b) => b.discountRate - a.discountRate);
            }
            
            return result;
        },
        
        applyFilter: (category, value) => {
            state.filters[category] = value;
            ui.updateFilterButton(category, value);
            state.currentPage = 1;
            ui.renderProducts();
            urlManager.updateURL();
        },
        
        removeFilter: (filterKey) => {
            state.filters[filterKey] = '';
            ui.updateFilterButton(filterKey, '');
            state.currentPage = 1;
            ui.renderProducts();
            urlManager.updateURL();
        },
        
        clearAllFilters: () => {
            Object.keys(state.filters).forEach(key => {
                state.filters[key] = '';
                ui.updateFilterButton(key, '');
            });
            state.currentPage = 1;
            ui.renderProducts();
            urlManager.updateURL();
        }
    };
    
    // 🌐 URL 관리
    const urlManager = {
        updateURL: () => {
            const url = new URL(window.location.href);
            
            Object.keys(state.filters).forEach(key => {
                if (state.filters[key]) {
                    url.searchParams.set(key, state.filters[key]);
                } else {
                    url.searchParams.delete(key);
                }
            });
            
            window.history.replaceState({}, "", url.toString());
        },
        
        loadFiltersFromURL: () => {
            const params = new URLSearchParams(window.location.search);
            
            Object.keys(state.filters).forEach(key => {
                const value = params.get(key);
                if (value) {
                    state.filters[key] = value;
                    ui.updateFilterButton(key, value);
                }
            });
        }
    };
    
    // 📊 데이터 관리
    const dataManager = {
        loadProducts: async () => {
            try {
                state.isLoading = true;
                ui.renderLoading();

                console.log('🔍 데이터 로딩 시작...');

                // 순차적으로 URL 시도
                const urlSets = [
                    {
                        name: 'Primary (Same Domain)',
                        products: PRODUCTS_DATA_URL,
                        models: MODELS_DATA_URL
                    },
                    {
                        name: 'Backup (GitHub nofee-webflow)',
                        products: BACKUP_PRODUCTS_URL,
                        models: BACKUP_MODELS_URL
                    },
                    {
                        name: 'Alternative (GitHub products-data)',
                        products: ALTERNATIVE_PRODUCTS_URL,
                        models: ALTERNATIVE_MODELS_URL
                    }
                ];

                let productData = null;
                let modelData = {};
                let successfulSet = null;

                // 각 URL 세트를 순서대로 시도
                for (const urlSet of urlSets) {
                    console.log(`⏳ ${urlSet.name} 시도 중...`);

                    try {
                        // Products 데이터 로드
                        console.log(`📡 Products URL: ${urlSet.products}`);
                        const productsResponse = await fetch(urlSet.products);
                        console.log(`📊 Products 응답: ${productsResponse.status} ${productsResponse.statusText}`);

                        if (!productsResponse.ok) {
                            throw new Error(`Products failed: ${productsResponse.status}`);
                        }

                        const tempProductData = await productsResponse.json();
                        console.log(`✅ Products 로드 성공: ${tempProductData.length}개`);

                        // Models 데이터 로드 (선택사항)
                        let tempModelData = {};
                        try {
                            console.log(`📡 Models URL: ${urlSet.models}`);
                            const modelsResponse = await fetch(urlSet.models);
                            console.log(`📊 Models 응답: ${modelsResponse.status} ${modelsResponse.statusText}`);

                            if (modelsResponse.ok) {
                                tempModelData = await modelsResponse.json();
                                console.log(`✅ Models 로드 성공: ${Object.keys(tempModelData).length}개`);
                            }
                        } catch (modelsError) {
                            console.warn('⚠️ Models 로드 실패 (계속 진행):', modelsError.message);
                        }

                        // 성공한 경우 데이터 저장하고 루프 종료
                        productData = tempProductData;
                        modelData = tempModelData;
                        successfulSet = urlSet.name;
                        break;

                    } catch (error) {
                        console.warn(`❌ ${urlSet.name} 실패:`, error.message);
                        continue;
                    }
                }

                // 모든 URL 세트가 실패한 경우
                if (!productData) {
                    throw new Error('모든 데이터 소스에서 로드 실패');
                }

                // 데이터 할당
                state.products = productData;
                modelsData = modelData || {};

                console.log('🎉 데이터 로드 성공!');
                console.log(`📈 최종 결과 (${successfulSet}):`);
                console.log(`  - Products: ${state.products.length}개`);
                console.log(`  - Models: ${Object.keys(modelsData).length}개`);

                // 렌더링
                urlManager.loadFiltersFromURL();
                ui.renderProducts();

                return true;

            } catch (error) {
                console.error('💥 데이터 로드 완전 실패:', error);
                console.error('상세 에러 정보:', {
                    message: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    currentUrl: window.location.href
                });

                ui.renderError(`데이터 로드 실패: ${error.message}`);
                return false;

            } finally {
                state.isLoading = false;
                console.log('🏁 데이터 로딩 프로세스 완료');
            }
        },
        
        addToViewHistory: (product) => {
            try {
                const viewed = {
                    id: `${product.model}_${product.carrier}_${product.type}_${product.support}`,
                    model: product.model,
                    carrier: product.carrier,
                    type: product.type,
                    support: product.support,
                    brand: product.brand,
                    total: product.total,
                    time: Date.now()
                };
                
                let history = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
                
                // 중복 제거
                history = history.filter(item => item.id !== viewed.id);
                
                // 새 항목 추가
                history.unshift(viewed);
                
                // 개수 제한
                if (history.length > CONFIG.VIEW_HISTORY_LIMIT) {
                    history = history.slice(0, CONFIG.VIEW_HISTORY_LIMIT);
                }
                
                localStorage.setItem('viewedProducts', JSON.stringify(history));
                
            } catch (error) {
                console.error('최근 본 상품 저장 실패:', error);
            }
        }
    };
    
    // 🖱️ 이벤트 핸들러
    const eventHandlers = {
        handleProductClick: (product) => {
            // 최근 본 상품에 추가
            dataManager.addToViewHistory(product);
            
            // 노피AI 페이지로 이동
            const params = new URLSearchParams({
                model: product.model || "",
                carrier: product.carrier || "",
                type: product.type || "",
                support: product.support || "",
                brand: product.brand || "",
                principal: product.principal || 0,
                plan_name: product.plan_name || "",
                plan_period: product.plan_period || "",
                plan: product.plan || 0,
                installment: product.installment || 0,
                total: product.total || 0
            });
            
            const aiUrl = '/ai?' + params.toString();
            window.open(aiUrl, '_blank');
        },
        
        handleFilterClick: (e) => {
            e.stopPropagation();
            const button = e.currentTarget;
            const category = button.dataset.category;
            const isOpen = button.classList.contains('open');
            
            // 모든 드롭다운 닫기
            ui.closeAllDropdowns();
            
            if (!isOpen) {
                const menu = document.querySelector(`.dropdown-menu[data-target="${category}"]`);
                if (menu) {
                    menu.classList.add('show');
                    button.classList.add('open');
                }
            }
        },
        
        handleDropdownClick: (e) => {
            e.stopPropagation();
            const button = e.currentTarget;
            const menu = button.closest('.dropdown-menu');
            const category = menu.dataset.target;
            const value = button.dataset[category] || '';
            
            // 필터 적용
            filterManager.applyFilter(category, value);
            
            // 선택된 버튼 표시
            menu.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
            if (value) {
                button.classList.add('selected');
            }
            
            // 드롭다운 닫기
            ui.closeAllDropdowns();
        },
        
        handleLoadMore: () => {
            if (!state.isLoading) {
                state.currentPage++;
                ui.renderProducts();
            }
        },
        
        handleOutsideClick: () => {
            ui.closeAllDropdowns();
        },
        
        handleKeydown: (e) => {
            if (e.key === 'Escape') {
                ui.closeAllDropdowns();
            }
        }
    };
    
    // ⚡ 이벤트 리스너 설정
    function setupEventListeners() {
        // 필터 드롭다운 버튼
        document.querySelectorAll('.filter-button').forEach(button => {
            button.addEventListener('click', eventHandlers.handleFilterClick);
        });
        
        // 드롭다운 메뉴 아이템
        document.querySelectorAll('.dropdown-menu button').forEach(button => {
            button.addEventListener('click', eventHandlers.handleDropdownClick);
        });
        
        // 더보기 버튼
        if (state.elements.loadMoreBtn) {
            state.elements.loadMoreBtn.addEventListener('click', eventHandlers.handleLoadMore);
        }
        
        // 외부 클릭 시 드롭다운 닫기
        document.addEventListener('click', eventHandlers.handleOutsideClick);
        
        // 키보드 이벤트
        document.addEventListener('keydown', eventHandlers.handleKeydown);
        
        // 페이지 가시성 변경 감지
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && state.products.length === 0) {
                // 페이지가 다시 보이고 데이터가 없으면 새로고침
                setTimeout(() => {
                    dataManager.loadProducts();
                }, 500);
            }
        });
        
        // 윈도우 리사이즈 디바운스
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // 필요한 경우 레이아웃 재조정
                console.log('Window resized');
            }, 250);
        });
    }
    
    // 🔧 DOM 요소 캐싱
    function cacheElements() {
        state.elements = {
            productList: document.getElementById('productList'),
            productCount: document.getElementById('productCount'),
            loadMore: document.getElementById('loadMore'),
            loadMoreBtn: document.getElementById('loadMoreBtn'),
            loadMoreText: document.getElementById('loadMoreText'),
            activeFilters: document.getElementById('activeFilters')
        };
        
        // 요소 확인
        const requiredElements = ['productList', 'productCount'];
        for (const elementId of requiredElements) {
            if (!state.elements[elementId]) {
                console.error(`필수 요소를 찾을 수 없습니다: #${elementId}`);
                return false;
            }
        }
        
        return true;
    }
    
    // 🚀 초기화
    async function initProductSearch() {
        try {
            console.log('🚀 노피 상품 검색 초기화 시작...');
            
            // DOM 요소 캐싱
            if (!cacheElements()) {
                throw new Error('필수 DOM 요소를 찾을 수 없습니다');
            }
            
            // URL 접근성 테스트 (개발 단계에서만)
            if (window.location.hostname === 'localhost' || window.location.hostname.includes('webflow')) {
                await testAllUrls();
            }

            // 이벤트 리스너 설정
            setupEventListeners();
            
            // 성능 최적화를 위한 디바운스된 렌더링
            const debouncedRender = utils.debounce(() => {
                ui.renderProducts();
            }, CONFIG.DEBOUNCE_DELAY);
            
            // 데이터 로드 (AI 상담 페이지 방식 적용)
            const success = await dataManager.loadProducts();
            
            if (success) {
                console.log('✅ 노피 상품 검색 초기화 완료');
            } else {
                console.error('❌ 상품 데이터 로드 실패');
            }
            
        } catch (error) {
            console.error('초기화 실패:', error);
            ui.renderError('페이지 초기화에 실패했습니다');
        }
    }
    
    // 에러 핸들링
    function handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        // 사용자에게 표시할 메시지
        if (context === 'Product loading') {
            ui.renderError('상품 데이터를 불러오는 중 문제가 발생했습니다');
        }
    }
    
    // 접근성 개선
    function improveAccessibility() {
        // 포커스 트랩 설정
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            dropdown.setAttribute('role', 'menu');
            dropdown.querySelectorAll('button').forEach(button => {
                button.setAttribute('role', 'menuitem');
            });
        });
        
        // ARIA 라벨 추가
        document.querySelectorAll('.filter-button').forEach(button => {
            const category = button.dataset.category;
            button.setAttribute('aria-label', `${category} 필터 선택`);
            button.setAttribute('aria-expanded', 'false');
        });
    }
    
    // DOM 준비 확인 및 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initProductSearch();
            improveAccessibility();
        });
    } else {
        // DOM이 이미 로드된 경우
        initProductSearch();
        improveAccessibility();
    }
    
    // 전역 에러 핸들러 강화
    window.addEventListener('error', (e) => {
        console.error('전역 에러:', e.error);
        console.error('에러 발생 위치:', e.filename, e.lineno, e.colno);
    });

    window.addEventListener('unhandledrejection', (e) => {
        console.error('Promise 에러:', e.reason);
        e.preventDefault();
    });

    // 네트워크 상태 확인
    window.addEventListener('online', () => {
        console.log('네트워크 연결 복구됨');
        if (state.products.length === 0) {
            dataManager.loadProducts();
        }
    });

    window.addEventListener('offline', () => {
        console.log('네트워크 연결 끊어짐');
    });
    
    // 성능 모니터링
    if (window.performance && window.performance.mark) {
        window.performance.mark('more-page-initialized');
    }
    
})();
