// 🚀 노피 상품검색 - GitHub 관리용 v3.2
// GitHub: https://github.com/Jacob-PO/nofee-webflow/blob/main/pages/more.js
// HTML+CSS 통합 임베드 + 완전한 상품 데이터 전달

console.log('🔥 more.js v3.2 로드 시작 - 완전한 상품 데이터 전달');

// 🎯 즉시 실행 함수로 전역 오염 방지
(function() {
    'use strict';
    
    // 🔍 디버그 정보
    console.log('🔍 현재 페이지 정보:');
    console.log('  - Origin:', window.location.origin);
    console.log('  - Pathname:', window.location.pathname);
    console.log('  - Host:', window.location.host);
    
    // 🎯 전역 상태
    const appState = {
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
            sort: ''
        }
    };
    
    // 📡 데이터 URLs (로그에서 성공한 URL 사용)
    const DATA_URLS = {
        products: 'https://raw.githubusercontent.com/jacob-po/nofee-webflow/main/data/products.json',
        models: 'https://raw.githubusercontent.com/jacob-po/nofee-webflow/main/data/models.json'
    };
    
    let modelsData = {};
    
    // 🎨 유틸리티 함수들
    const utils = {
        formatKRW: (value) => {
            return Math.abs(Number(value)).toLocaleString("ko-KR") + "원";
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
        
        normalizeBrand: (brand) => {
            if (!brand) return '';
            const brandLower = brand.toLowerCase();
            if (brandLower === 'samsung') return '삼성';
            if (brandLower === 'apple') return '애플';
            return brand;
        },
        
        getOriginPrice: (model) => {
            // Models 데이터에서 찾기
            if (modelsData && modelsData[model]) {
                return modelsData[model].originPrice;
            }
            
            // 기본 가격 매핑
            const modelLower = model.toLowerCase();
            
            if (modelLower.includes('galaxy s25 ultra') || model.includes('갤럭시 S25 울트라')) return 1700000;
            if (modelLower.includes('galaxy s25+') || model.includes('갤럭시 S25 플러스')) return 1400000;
            if (modelLower.includes('galaxy s25')) return 1200000;
            if (modelLower.includes('galaxy s24 ultra')) return 1600000;
            if (modelLower.includes('galaxy s24+')) return 1300000;
            if (modelLower.includes('galaxy s24 fe')) return 900000;
            if (modelLower.includes('galaxy s24')) return 1100000;
            if (modelLower.includes('iphone 16 pro max')) return 1900000;
            if (modelLower.includes('iphone 16 pro')) return 1550000;
            if (modelLower.includes('iphone 16 plus')) return 1350000;
            if (modelLower.includes('iphone 16')) return 1250000;
            if (modelLower.includes('iphone 15')) return 1150000;
            
            return 1000000; // 기본값
        },
        
        calculateDiscount: (originalPrice, principal) => {
            const origin = Number(originalPrice) || 0;
            const principalAmount = Number(principal) || 0;

            if (origin === 0) return { discount: 0, discountRate: 0 };
            
            const discount = Math.abs(principalAmount);
            const discountRate = Math.round((discount / origin) * 100);
            
            return { discount, discountRate };
        },

        transformProduct: (item) => {
            const modelMap = {
                'S25-256': '갤럭시 S25 256GB',
                'S25플러스-256': '갤럭시 S25 플러스 256GB',
                'S25울트라-256': '갤럭시 S25 울트라 256GB',
                'S24FE': '갤럭시 S24 FE',
                '플립6-256': '갤럭시 Z 플립6 256GB',
                '플립5-256': '갤럭시 Z 플립5 256GB',
                '폴드6-256': '갤럭시 Z 폴드6 256GB',
                '와이드7': '갤럭시 와이드7',
                'A16': '갤럭시 A16',
                '아이폰16-128': '아이폰 16 128GB',
                '아이폰16-256': '아이폰 16 256GB',
                '아이폰16프로-128': '아이폰 16 Pro 128GB',
                '아이폰16프로-256': '아이폰 16 Pro 256GB',
                '아이폰16프로맥스-256': '아이폰 16 Pro Max 256GB',
                '아이폰15-128': '아이폰 15 128GB',
                '아이폰15프로-128': '아이폰 15 Pro 128GB',
                '시나모롤 키즈폰': '시나모롤 키즈폰',
                '키즈폰 무너': '키즈폰 무너'
            };
            const carrierMap = { SK: 'SKT', KT: 'KT', LG: 'LGU' };
            const typeMap = { '이동': '번호이동', '기변': '기기변경' };
            const supportMap = { '공시': '공시지원', '선약': '선택약정' };

            const t = { ...item };
            t.carrier = carrierMap[item.carrier] || item.carrier;
            t.type = typeMap[item.contract_type] || item.contract_type;
            t.support = supportMap[item.subsidy_type] || item.subsidy_type;
            t.model = modelMap[item.model_name] || item.model_name;
            t.principal = item.device_principal || 0;
            t.plan_name = item.plan_monthly_payment || 0;
            t.change_plan = item.post_plan_monthly_payment || 0;
            t.contract_period = item.contract_months || 0;
            t.plan_period = item.plan_required_months || 0;
            t.plan = item.plan_effective_monthly_payment || 0;
            t.installment = item.device_monthly_payment || 0;
            t.total = item.total_monthly_payment || 0;
            t.originPrice = item.originPrice || utils.getOriginPrice(modelMap[item.model_name] || item.model_name);
            return t;
        },

        transformProducts: (data) => {
            if (!Array.isArray(data)) return [];
            return data.map(utils.transformProduct);
        }
    };
    
    // 📊 데이터 로더
    const dataLoader = {
        async loadData() {
            try {
                console.log('📡 데이터 로드 시작...');
                appState.isLoading = true;
                
                // UI 업데이트
                ui.showLoading();
                
                // Products 데이터 로드
                console.log('📱 Products 로드 중...');
                const productsResponse = await fetch(DATA_URLS.products + '?v=' + Date.now());
                
                if (!productsResponse.ok) {
                    throw new Error(`Products 로드 실패: ${productsResponse.status}`);
                }
                
                const rawProducts = await productsResponse.json();
                console.log(`✅ Products 로드 성공: ${rawProducts.length}개`);
                
                // Models 데이터 로드 (선택사항)
                try {
                    console.log('📋 Models 로드 중...');
                    const modelsResponse = await fetch(DATA_URLS.models + '?v=' + Date.now());
                    
                    if (modelsResponse.ok) {
                        modelsData = await modelsResponse.json();
                        console.log(`✅ Models 로드 성공: ${Object.keys(modelsData).length}개`);
                    }
                } catch (modelsError) {
                    console.warn('⚠️ Models 로드 실패 (계속 진행):', modelsError.message);
                }
                
                // 데이터 정규화
                appState.products = utils.transformProducts(rawProducts).map(product => ({
                    ...product,
                    brand: utils.normalizeBrand(product.brand),
                    originPrice: product.originPrice || utils.getOriginPrice(product.model)
                }));
                
                console.log('🎉 데이터 로드 완료!');
                
                // 필터 적용 및 렌더링
                filterManager.applyFilters();
                
                return true;
                
            } catch (error) {
                console.error('💥 데이터 로드 실패:', error);
                ui.showError('데이터 로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
                return false;
                
            } finally {
                appState.isLoading = false;
            }
        }
    };
    
    // 🎨 UI 매니저
    const ui = {
        elements: {
            get productList() { return document.getElementById('productList'); },
            get productCount() { return document.getElementById('productCount'); },
            get activeFilters() { return document.getElementById('activeFilters'); },
            get loadMore() { return document.getElementById('loadMore'); },
            get loadMoreBtn() { return document.getElementById('loadMoreBtn'); }
        },
        
        showLoading() {
            const { productList } = this.elements;
            if (!productList) return;
            
            productList.innerHTML = `
                <div class="loading-state" style="grid-column: 1 / -1;">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">상품 데이터를 불러오는 중...</div>
                </div>
            `;
        },
        
        showError(message) {
            const { productList } = this.elements;
            if (!productList) return;
            
            productList.innerHTML = `
                <div class="error-state" style="grid-column: 1 / -1;">
                    <div class="error-icon">⚠️</div>
                    <h3 class="error-title">오류가 발생했습니다</h3>
                    <p class="error-message">${message}</p>
                    <button class="retry-button" onclick="location.reload()">새로고침</button>
                </div>
            `;
        },
        
        renderProducts() {
            const { productList, productCount } = this.elements;
            if (!productList) return;
            
            const productsToShow = appState.filteredProducts.slice(0, appState.currentPage * appState.pageSize);
            
            // 상품 개수 업데이트
            if (productCount) {
                productCount.textContent = appState.filteredProducts.length;
            }
            
            // 상품이 없는 경우
            if (appState.filteredProducts.length === 0) {
                productList.innerHTML = `
                    <div class="error-state" style="grid-column: 1 / -1;">
                        <div class="error-icon">🔍</div>
                        <h3 class="error-title">검색 결과가 없습니다</h3>
                        <p class="error-message">다른 조건으로 검색해보세요</p>
                    </div>
                `;
                this.updateLoadMoreButton(false);
                return;
            }
            
            // 상품 카드 생성 (완전한 데이터 속성 추가)
            productList.innerHTML = productsToShow.map((product, index) => {
                const brandInfo = utils.getBrandInfo(product.brand);
                const originPrice = product.originPrice || utils.getOriginPrice(product.model);
                const { discount, discountRate } = utils.calculateDiscount(originPrice, product.principal);
                
                // AI 페이지로 전달할 완전한 데이터 준비
                const completeData = {
                    date: product.date || '',
                    carrier: product.carrier || '',
                    model_name: product.model_name || '',
                    contract_type: product.contract_type || '',
                    device_price_input: product.device_price_input || 0,
                    subsidy_type: product.subsidy_type || '',
                    plan_name: product.plan_name || '',
                    contract_months: product.contract_months || 0,
                    device_principal: product.device_principal || 0,
                    plan_monthly_payment: product.plan_monthly_payment || 0,
                    post_plan_monthly_payment: product.post_plan_monthly_payment || 0,
                    plan_required_months: product.plan_required_months || 0,
                    optional_discount_ratio: product.optional_discount_ratio || 0,
                    device_monthly_payment: product.device_monthly_payment || 0,
                    plan_effective_monthly_payment: product.plan_effective_monthly_payment || 0,
                    total_monthly_payment: product.total_monthly_payment || 0,
                    brand: product.brand || '',
                    storage: product.storage || '',
                    originPrice: originPrice.toString() || '0',
                    principal: product.principal.toString() || '0',
                    discount: discount.toString() || '0',
                    discountRate: discountRate.toString() || '0',
                    from: 'search',
                    timestamp: Date.now().toString()
                };
                
                // 모든 데이터를 data 속성으로 추가 (안전한 인코딩)
                const dataAttributes = Object.entries(completeData)
                    .map(([key, value]) => {
                        const safeValue = String(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                        return `data-${key}="${safeValue}"`;
                    })
                    .join(' ');
                
                return `
                    <div class="product-card" 
                         style="animation-delay: ${index * 0.05}s;"
                         ${dataAttributes}>
                        <div class="product-header">
                            <div class="brand-icon ${brandInfo.class}">${brandInfo.icon}</div>
                            <div class="product-info">
                                <h3 class="product-title">${product.model}</h3>
                                <div class="product-meta">
                                    <span class="meta-tag">${product.carrier}</span>
                                    <span class="meta-tag">${brandInfo.displayName}</span>
                                    <span class="meta-tag">${product.type}</span>
                                    <span class="meta-tag">${product.support}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="price-section">
                            <div class="price-breakdown">
                                <div class="price-row">
                                    <span>기기값</span>
                                    <span>${utils.formatKRW(originPrice)}</span>
                                </div>
                                <div class="price-row">
                                    <span>할부원금</span>
                                    <span>${utils.formatKRW(product.installment)}</span>
                                </div>
                                <div class="price-row">
                                    <span>요금제</span>
                                    <span>${utils.formatKRW(product.plan)}</span>
                                </div>
                                ${discount > 0 ? `
                                <div class="price-row">
                                    <span>지원금</span>
                                    <span style="color: #e74c3c;">-${utils.formatKRW(discount)} (${discountRate}%)</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            <div class="price-total">
                                <div class="price-label">월 납부금</div>
                                <div class="price-value">${utils.formatKRW(product.total)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // 더보기 버튼 업데이트
            const hasMore = productsToShow.length < appState.filteredProducts.length;
            this.updateLoadMoreButton(hasMore);
            
            console.log(`🎴 상품 카드 ${productsToShow.length}개 렌더링 완료 (data 속성 포함)`);
        },
        
        updateLoadMoreButton(hasMore) {
            const { loadMore, loadMoreBtn } = this.elements;
            if (!loadMore || !loadMoreBtn) return;
            
            if (hasMore) {
                loadMore.style.display = 'block';
                loadMoreBtn.style.display = 'inline-block';
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = '상품 더 보기';
            } else {
                loadMore.style.display = 'none';
            }
        },
        
        updateActiveFilters() {
            const { activeFilters } = this.elements;
            if (!activeFilters) return;
            
            const filterTags = [];
            
            Object.entries(appState.filters).forEach(([key, value]) => {
                if (value && key !== 'sort') {
                    const labels = {
                        carrier: { 'KT': 'KT', 'LGU': 'LG유플러스', 'SKT': 'SK텔레콤' },
                        brand: { '삼성': '삼성', '애플': '애플' },
                        type: { '번호이동': '번호이동', '기기변경': '기기변경', '신규가입': '신규가입' },
                        support: { '공시지원': '공시지원', '선택약정': '선택약정' }
                    };
                    
                    const label = labels[key]?.[value] || value;
                    
                    filterTags.push(`
                        <div class="filter-tag">
                            ${label}
                            <span class="filter-remove" onclick="filterManager.removeFilter('${key}')">&times;</span>
                        </div>
                    `);
                }
            });
            
            activeFilters.innerHTML = filterTags.join('');
        }
    };
    
    // 🔍 필터 매니저
    const filterManager = {
        applyFilters() {
            let filtered = [...appState.products];
            
            // 필터 적용
            Object.entries(appState.filters).forEach(([key, value]) => {
                if (value && key !== 'sort') {
                    filtered = filtered.filter(product => {
                        return product[key] === value;
                    });
                }
            });
            
            // 정렬 적용
            if (appState.filters.sort) {
                filtered.sort((a, b) => {
                    switch (appState.filters.sort) {
                        case 'asc':
                            return a.total - b.total;
                        case 'desc':
                            return b.total - a.total;
                        case 'discount':
                            const discountA = utils.calculateDiscount(a.originPrice, a.principal).discountRate;
                            const discountB = utils.calculateDiscount(b.originPrice, b.principal).discountRate;
                            return discountB - discountA;
                        default:
                            return 0;
                    }
                });
            }
            
            appState.filteredProducts = filtered;
            appState.currentPage = 1;
            
            ui.renderProducts();
            ui.updateActiveFilters();
            
            console.log(`🔍 필터 적용 완료: ${filtered.length}개 상품`);
        },
        
        setFilter(category, value) {
            appState.filters[category] = value;
            this.applyFilters();
            
            console.log(`🔍 필터 설정: ${category} = ${value || '전체'}`);
        },
        
        removeFilter(category) {
            appState.filters[category] = '';
            
            // 해당 Select 요소 초기화
            const selectElement = document.querySelector(`[data-category="${category}"]`);
            if (selectElement) {
                selectElement.value = '';
            }
            
            this.applyFilters();
            
            console.log(`🗑️ 필터 제거: ${category}`);
        },
        
        loadMore() {
            appState.currentPage++;
            ui.renderProducts();
            
            console.log(`📄 페이지 로드: ${appState.currentPage}`);
        }
    };
    
    // 🎯 이벤트 핸들러
    const eventHandlers = {
        init() {
            // 더보기 버튼
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', () => {
                    filterManager.loadMore();
                });
            }
            
            console.log('🎮 이벤트 핸들러 초기화 완료');
        }
    };
    
    // 🚀 메인 초기화 함수
    async function initProductSearch() {
        try {
            console.log('🚀 상품 검색 초기화 시작...');
            
            // 이벤트 핸들러 초기화
            eventHandlers.init();
            
            // 데이터 로드
            const success = await dataLoader.loadData();
            
            if (success) {
                console.log('✅ 상품 검색 초기화 완료!');
            } else {
                console.error('❌ 상품 검색 초기화 실패');
            }
            
            return success;
            
        } catch (error) {
            console.error('💥 초기화 중 오류 발생:', error);
            ui.showError('초기화 중 오류가 발생했습니다.');
            return false;
        }
    }
    
    // 🌍 전역 함수 및 객체 노출
    window.initProductSearch = initProductSearch;
    window.filterManager = filterManager;
    window.appState = appState;
    
    // 🎯 외부에서 호출할 수 있는 필터 함수 (HTML의 Select에서 사용)
    window.applyFilter = function(category, value) {
        filterManager.setFilter(category, value);
    };
    
    console.log('✅ more.js v3.2 모듈 로드 완료 - 완전한 상품 데이터 전달 기능');
    
})();

// 🔄 즉시 실행 (백업)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.initProductSearch) {
            window.initProductSearch();
        }
    });
} else {
    setTimeout(() => {
        if (window.initProductSearch) {
            window.initProductSearch();
        }
    }, 100);
}
