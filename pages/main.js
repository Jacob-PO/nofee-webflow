// 🚀 노피 메인페이지 스크립트 v4.0 - 토스 스타일 적용
(function() {
    'use strict';
    
    // 🎯 전역 상태 관리
    let state = {
        config: null,
        products: [],
        reviews: [],
        banners: [],
        brands: {},
        models: {},
        regions: [],
        isDataLoaded: false,
        loadingErrors: [],
        currentReviewIndex: 0,
        reviewInterval: null
    };

    // GitHub 저장소 설정
    const scriptUrl = new URL(document.currentScript.src);
    const basePath = scriptUrl.pathname.split('/').slice(0, -2).join('/');
    const GITHUB_BASE_URL = scriptUrl.origin + basePath;
    
    // 📂 데이터 URL 설정
    const DATA_URLS = {
        config: `${GITHUB_BASE_URL}/data/config.json`,
        products: `${GITHUB_BASE_URL}/data/products.json`,
        reviews: `${GITHUB_BASE_URL}/data/review.json`,
        banners: `${GITHUB_BASE_URL}/data/banner.json`,
        brands: `${GITHUB_BASE_URL}/data/brands.json`,
        models: `${GITHUB_BASE_URL}/data/models.json`,
        regions: `${GITHUB_BASE_URL}/data/regions.json`
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

        formatDate: (dateString) => {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) return '오늘';
            if (diffDays === 2) return '어제';
            if (diffDays <= 7) return `${diffDays}일 전`;
            return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
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

            const t = { ...item };
            t.carrier = carrierMap[item.carrier] || item.carrier;
            t.type = typeMap[item.contract_type] || item.contract_type;
            t.model = modelMap[item.model_name] || item.model_name;
            t.principal = item.device_principal || 0;
            t.plan = item.plan_effective_monthly_payment || 0;
            t.installment = item.device_monthly_payment || 0;
            t.total = item.total_monthly_payment || 0;
            t.contract_period = item.contract_months || 24;
            return t;
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
                console.log('🚀 노피 데이터 로드 시작...');
                
                // 설정 데이터 로드
                state.config = await this.fetchData(DATA_URLS.config, 'config', true) || this.getDefaultConfig();
                
                // 병렬로 모든 데이터 로드
                const results = await Promise.allSettled([
                    this.fetchData(DATA_URLS.products, 'products', true).then(data => {
                        state.products = utils.transformProducts(data || []);
                    }),
                    this.fetchData(DATA_URLS.reviews, 'reviews', true).then(data => {
                        state.reviews = data || [];
                    }),
                    this.fetchData(DATA_URLS.banners, 'banners', true).then(data => {
                        state.banners = data || [];
                    }),
                    this.fetchData(DATA_URLS.brands, 'brands', true).then(data => {
                        state.brands = data || {};
                    }),
                    this.fetchData(DATA_URLS.models, 'models', true).then(data => {
                        state.models = data || {};
                    }),
                    this.fetchData(DATA_URLS.regions, 'regions', true).then(data => {
                        state.regions = data || [];
                    })
                ]);
                
                const failedLoads = results.filter(result => result.status === 'rejected');
                if (failedLoads.length > 0) {
                    console.warn(`⚠️ ${failedLoads.length}개 데이터 로드 실패, 기본값으로 진행`);
                }
                
                state.isDataLoaded = true;
                console.log('✅ 데이터 로드 완료');
                
                // 로딩 화면 숨기고 메인 화면 표시
                utils.hideElement('.loading-screen');
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
                this.renderHeroSection();
                this.renderQuickActions();
                this.renderBestDeals();
                this.renderMyData();
                this.renderRecentProducts();
                this.renderReviews();
                this.initializeInteractions();
                
                utils.showElement('.main-content');
                console.log('🎉 앱 초기화 완료');
                
            } catch (error) {
                console.error('❌ App initialization failed:', error);
            }
        },

        renderHeroSection() {
            const heroElement = document.querySelector('.hero-section');
            if (!heroElement) return;

            const stats = this.calculateStats();
            
            heroElement.innerHTML = `
                <div class="hero-content">
                    <h1 class="hero-title">
                        <span class="hero-greeting">휴대폰 최저가</span>
                        <span class="hero-name">노피에서 찾아보세요</span>
                    </h1>
                    <div class="hero-stats">
                        <div class="stat-item">
                            <div class="stat-value">${stats.totalProducts}개</div>
                            <div class="stat-label">전체 상품</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.maxDiscount}%</div>
                            <div class="stat-label">최대 할인</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${utils.formatCompactKRW(stats.avgTotal)}</div>
                            <div class="stat-label">평균 월납</div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderQuickActions() {
            const actionsElement = document.querySelector('.quick-actions');
            if (!actionsElement) return;

            actionsElement.innerHTML = `
                <div class="actions-grid">
                    <div class="action-card" data-action="ai">
                        <div class="action-icon">🤖</div>
                        <div class="action-content">
                            <div class="action-title">AI 상담</div>
                            <div class="action-subtitle">맞춤 추천받기</div>
                        </div>
                        <div class="action-arrow">→</div>
                    </div>
                    <div class="action-card" data-action="compare">
                        <div class="action-icon">📊</div>
                        <div class="action-content">
                            <div class="action-title">요금제 비교</div>
                            <div class="action-subtitle">통신사별 비교</div>
                        </div>
                        <div class="action-arrow">→</div>
                    </div>
                    <div class="action-card" data-action="search">
                        <div class="action-icon">🔍</div>
                        <div class="action-content">
                            <div class="action-title">상품 검색</div>
                            <div class="action-subtitle">원하는 기종 찾기</div>
                        </div>
                        <div class="action-arrow">→</div>
                    </div>
                    <div class="action-card" data-action="store">
                        <div class="action-icon">📍</div>
                        <div class="action-content">
                            <div class="action-title">매장 찾기</div>
                            <div class="action-subtitle">근처 매장 위치</div>
                        </div>
                        <div class="action-arrow">→</div>
                    </div>
                </div>
            `;
        },

        renderBestDeals() {
            const dealsElement = document.querySelector('.best-deals');
            if (!dealsElement || !state.products.length) return;

            const bestProducts = this.getBestProducts();
            
            const dealsHTML = bestProducts.map(product => {
                const discount = this.calculateDiscount(product.model, product.principal);
                
                return `
                    <div class="deal-card" data-product='${JSON.stringify(product)}'>
                        <div class="deal-header">
                            <div class="deal-badge">${product.carrier}</div>
                            ${discount.rate > 0 ? `<div class="discount-badge">${discount.rate}% 할인</div>` : ''}
                        </div>
                        <h3 class="deal-title">${utils.sanitizeHTML(product.model)}</h3>
                        <div class="deal-type">${product.type} · ${product.contract_period}개월</div>
                        <div class="deal-price">
                            <div class="monthly-payment">월 ${utils.formatKRW(product.total)}</div>
                            <div class="price-breakdown">
                                통신료 ${utils.formatKRW(product.plan)} + 할부 ${utils.formatKRW(product.installment)}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            dealsElement.innerHTML = `
                <div class="section-header">
                    <h2 class="section-title">오늘의 베스트</h2>
                    <button class="see-all-btn" data-action="seeAll">전체보기</button>
                </div>
                <div class="deals-scroll">
                    ${dealsHTML}
                </div>
            `;
        },

        renderMyData() {
            const myDataElement = document.querySelector('.my-data');
            if (!myDataElement) return;

            const recentCount = this.getRecentViewCount();
            const favoriteCount = this.getFavoriteCount();

            myDataElement.innerHTML = `
                <div class="section-header">
                    <h2 class="section-title">내 활동</h2>
                </div>
                <div class="my-data-grid">
                    <div class="data-card" data-action="recent">
                        <div class="data-icon">👀</div>
                        <div class="data-content">
                            <div class="data-title">최근 본 상품</div>
                            <div class="data-value">${recentCount}개</div>
                        </div>
                    </div>
                    <div class="data-card" data-action="favorites">
                        <div class="data-icon">❤️</div>
                        <div class="data-content">
                            <div class="data-title">관심 상품</div>
                            <div class="data-value">${favoriteCount}개</div>
                        </div>
                    </div>
                    <div class="data-card" data-action="consultation">
                        <div class="data-icon">💬</div>
                        <div class="data-content">
                            <div class="data-title">상담 내역</div>
                            <div class="data-value">확인하기</div>
                        </div>
                    </div>
                </div>
            `;
        },

        renderRecentProducts() {
            const recentElement = document.querySelector('.recent-products');
            if (!recentElement || !state.products.length) return;

            const recentProducts = state.products.slice(0, 3);
            
            const productsHTML = recentProducts.map(product => `
                <div class="recent-card" data-product='${JSON.stringify(product)}'>
                    <div class="recent-info">
                        <h4 class="recent-title">${utils.sanitizeHTML(product.model)}</h4>
                        <div class="recent-carrier">${product.carrier} · ${product.type}</div>
                        <div class="recent-price">월 ${utils.formatKRW(product.total)}</div>
                    </div>
                    <div class="recent-arrow">→</div>
                </div>
            `).join('');

            recentElement.innerHTML = `
                <div class="section-header">
                    <h2 class="section-title">최신 상품</h2>
                    <button class="see-all-btn" data-action="seeAllRecent">더보기</button>
                </div>
                <div class="recent-list">
                    ${productsHTML}
                </div>
            `;
        },

        renderReviews() {
            const reviewsElement = document.querySelector('.reviews-section');
            if (!reviewsElement || !state.reviews.length) return;

            const currentReview = state.reviews[state.currentReviewIndex];
            
            reviewsElement.innerHTML = `
                <div class="section-header">
                    <h2 class="section-title">실시간 후기</h2>
                    <div class="review-live">
                        <div class="live-dot"></div>
                        <span>LIVE</span>
                    </div>
                </div>
                <div class="review-card">
                    <div class="review-header">
                        <div class="reviewer-avatar">${currentReview.initial}</div>
                        <div class="reviewer-info">
                            <div class="reviewer-name">${utils.sanitizeHTML(currentReview.name)}</div>
                            <div class="reviewer-rating">${'⭐'.repeat(Math.floor(currentReview.rating))}</div>
                        </div>
                        <div class="review-date">${utils.formatDate(currentReview.date)}</div>
                    </div>
                    <div class="review-product">${utils.sanitizeHTML(currentReview.product)}</div>
                    <div class="review-content">${utils.sanitizeHTML(currentReview.comment)}</div>
                </div>
            `;

            this.startReviewRotation();
        },

        // 헬퍼 메서드들
        calculateStats() {
            if (!state.products.length) {
                return { totalProducts: 0, maxDiscount: 0, avgTotal: 0 };
            }

            let maxDiscountRate = 0;
            let totalSum = 0;

            state.products.forEach(product => {
                const discount = this.calculateDiscount(product.model, product.principal);
                if (discount.rate > maxDiscountRate) {
                    maxDiscountRate = discount.rate;
                }
                totalSum += product.total;
            });

            return {
                totalProducts: state.products.length,
                maxDiscount: maxDiscountRate,
                avgTotal: Math.round(totalSum / state.products.length)
            };
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

        getBestProducts() {
            return state.products
                .map(product => {
                    const discount = this.calculateDiscount(product.model, product.principal);
                    return { ...product, discountRate: discount.rate };
                })
                .sort((a, b) => b.discountRate - a.discountRate)
                .slice(0, 5);
        },

        getRecentViewCount() {
            try {
                const recent = JSON.parse(localStorage.getItem('nofee_recent_products') || '[]');
                return recent.length;
            } catch {
                return 0;
            }
        },

        getFavoriteCount() {
            try {
                const favorites = JSON.parse(localStorage.getItem('nofee_favorites') || '[]');
                return favorites.length;
            } catch {
                return 0;
            }
        },

        startReviewRotation() {
            if (state.reviewInterval) {
                clearInterval(state.reviewInterval);
            }

            state.reviewInterval = setInterval(() => {
                state.currentReviewIndex = (state.currentReviewIndex + 1) % state.reviews.length;
                this.renderReviews();
            }, 5000);
        },

        initializeInteractions() {
            // 액션 카드 클릭 이벤트
            document.querySelectorAll('[data-action]').forEach(element => {
                element.addEventListener('click', () => {
                    const action = element.dataset.action;
                    this.handleAction(action);
                });
            });

            // 상품 카드 클릭 이벤트
            document.querySelectorAll('[data-product]').forEach(element => {
                element.addEventListener('click', () => {
                    try {
                        const product = JSON.parse(element.dataset.product);
                        this.handleProductClick(product);
                    } catch (error) {
                        console.error('Product click error:', error);
                    }
                });
            });
        },

        handleAction(action) {
            const baseUrl = state.config?.urls?.ai || 'https://nofee.team/ai';
            const productsUrl = state.config?.urls?.products || 'https://nofee.team/more';

            switch (action) {
                case 'ai':
                    window.open(baseUrl, '_blank');
                    break;
                case 'compare':
                case 'search':
                case 'seeAll':
                case 'seeAllRecent':
                    window.open(productsUrl, '_blank');
                    break;
                case 'store':
                    window.open('https://nofee.team/store', '_blank');
                    break;
                case 'recent':
                case 'favorites':
                case 'consultation':
                    window.open(baseUrl, '_blank');
                    break;
                default:
                    console.log('Unhandled action:', action);
            }
        },

        handleProductClick(product) {
            // 최근 본 상품에 추가
            this.addToRecentProducts(product);
            
            // AI 상담 페이지로 이동
            const baseUrl = state.config?.urls?.ai || 'https://nofee.team/ai';
            const params = new URLSearchParams({
                model: product.model,
                carrier: product.carrier,
                type: product.type
            });
            
            window.open(`${baseUrl}?${params.toString()}`, '_blank');
        },

        addToRecentProducts(product) {
            try {
                let recent = JSON.parse(localStorage.getItem('nofee_recent_products') || '[]');
                
                // 중복 제거
                recent = recent.filter(item => item.model !== product.model || item.carrier !== product.carrier);
                
                // 맨 앞에 추가
                recent.unshift({
                    model: product.model,
                    carrier: product.carrier,
                    type: product.type,
                    total: product.total,
                    timestamp: Date.now()
                });
                
                // 최대 10개까지만 보관
                recent = recent.slice(0, 10);
                
                localStorage.setItem('nofee_recent_products', JSON.stringify(recent));
            } catch (error) {
                console.error('Failed to save recent product:', error);
            }
        },

        showError(message) {
            utils.hideElement('.loading-screen');
            const errorElement = document.querySelector('.error-screen');
            if (errorElement) {
                errorElement.querySelector('.error-message').textContent = message;
                errorElement.style.display = 'flex';
            }
        }
    };

    // 🚀 메인 초기화 함수
    async function initNofeeMain() {
        try {
            console.log('🚀 노피 메인페이지 v4.0 초기화 시작 (토스 스타일)');
            
            await dataLoader.loadAllData();
            
            // 전역 상태 노출
            window.nofeeState = state;
            
            console.log('✅ 노피 메인페이지 v4.0 초기화 완료');
            
            // 이벤트 발생
            window.dispatchEvent(new CustomEvent('nofeeMainReady', {
                detail: { 
                    version: '4.0', 
                    timestamp: Date.now(),
                    dataLoaded: state.isDataLoaded
                }
            }));
            
        } catch (error) {
            console.error('❌ Critical initialization failure:', error);
            dataLoader.showError('시스템 초기화에 실패했습니다');
        }
    }

    // 🎯 DOM 준비 확인 및 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNofeeMain);
    } else {
        setTimeout(initNofeeMain, 0);
    }

    // 정리 작업
    window.addEventListener('beforeunload', () => {
        if (state.reviewInterval) {
            clearInterval(state.reviewInterval);
        }
    });

})();
