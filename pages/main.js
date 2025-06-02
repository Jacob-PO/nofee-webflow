// 🚀 노피 메인페이지 스크립트 v3.1 - 에러 핸들링 개선
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
        selectedRegion: null,
        currentBannerIndex: 0,
        bannerInterval: null,
        isDataLoaded: false,
        loadingErrors: []
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
        banners: `${GITHUB_BASE_URL}/data/banner.json`, // 수정된 파일명
        brands: `${GITHUB_BASE_URL}/data/brands.json`,
        models: `${GITHUB_BASE_URL}/data/models.json`,
        regions: `${GITHUB_BASE_URL}/data/regions.json`
    };

    // 🔧 유틸리티 함수들
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

        setElementContent: (selector, content, isHTML = false) => {
            const element = document.querySelector(selector);
            if (element) {
                if (isHTML) {
                    element.innerHTML = content;
                } else {
                    element.textContent = content;
                }
            }
        },

        showSection: (sectionId) => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
                setTimeout(() => section.classList.add('visible'), 100);
            }
        },

        hideSection: (sectionId) => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
                section.classList.remove('visible');
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
                console.log(`✅ ${name} loaded successfully:`, data);
                return data;
            } catch (error) {
                if (isOptional) {
                    console.warn(`⚠️ Optional ${name} load failed (continuing):`, error.message);
                    return null;
                } else {
                    console.error(`❌ Failed to load ${name}:`, error.message);
                    state.loadingErrors.push({ name, error: error.message });
                    throw error;
                }
            }
        },

        async loadAllData() {
            const loadingElement = document.getElementById('initialLoading');
            
            try {
                console.log('🚀 노피 데이터 로드 시작...');
                
                // 1단계: 필수 설정 데이터 로드
                console.log('📋 1단계: 기본 설정 로드');
                try {
                    state.config = await this.fetchData(DATA_URLS.config, 'config', true);
                } catch (error) {
                    console.warn('⚠️ Config 로드 실패, 기본값 사용');
                    state.config = this.getDefaultConfig();
                }
                
                // 설정 데이터로 기본 UI 업데이트
                this.updateBasicUI();
                
                // 2단계: 코어 데이터 로드 (선택적)
                console.log('🔧 2단계: 코어 데이터 로드');
                const coreDataResults = await Promise.allSettled([
                    this.fetchData(DATA_URLS.models, 'models', true).then(data => state.models = data || {}),
                    this.fetchData(DATA_URLS.brands, 'brands', true).then(data => state.brands = data || {}),
                    this.fetchData(DATA_URLS.regions, 'regions', true).then(data => state.regions = data || [])
                ]);
                
                // 3단계: 컨텐츠 데이터 로드 (선택적)
                console.log('📱 3단계: 컨텐츠 데이터 로드');
                const contentDataResults = await Promise.allSettled([
                    this.fetchData(DATA_URLS.banners, 'banners', true).then(data => state.banners = data || []),
                    this.fetchData(DATA_URLS.products, 'products', true).then(data => state.products = data || []),
                    this.fetchData(DATA_URLS.reviews, 'reviews', true).then(data => state.reviews = data || [])
                ]);
                
                // 로딩 결과 확인
                const allResults = [...coreDataResults, ...contentDataResults];
                const failedLoads = allResults.filter(result => result.status === 'rejected');
                
                if (failedLoads.length > 0) {
                    console.warn(`⚠️ ${failedLoads.length}개 데이터 로드 실패, 기본값으로 진행`);
                }
                
                state.isDataLoaded = true;
                console.log('✅ 데이터 로드 완료, UI 초기화 시작');
                
                // 로딩 화면 숨기기
                utils.hideSection('initialLoading');
                
                // UI 초기화
                await this.initializeAllSections();
                
            } catch (error) {
                console.error('❌ Critical data loading failed:', error);
                this.showError('데이터를 불러오는데 실패했습니다');
            }
        },

        getDefaultConfig() {
            return {
                site: {
                    name: "노피",
                    title: "노피 - 전국 어디서나 성지 가격으로 휴대폰 최저가"
                },
                hero: {
                    title: "전국 어디서나 <span class=\"highlight\">성지 가격</span>으로<br>휴대폰 최저가를 찾아보세요",
                    subtitle: "AI로 찾아보는 집근처 휴대폰 성지 최저가 노피AI",
                    features: [
                        { emoji: "🎯", text: "전국 성지 가격" },
                        { emoji: "🤖", text: "AI 맞춤 추천" },
                        { emoji: "📞", text: "전화 없이 신청" }
                    ]
                },
                ai: {
                    title: "나에게 딱 맞는 휴대폰 찾기",
                    description: "AI가 당신의 사용패턴을 분석해서<br><strong>최적의 기종과 최저가를 추천</strong>해드려요",
                    features: ["💬 1:1 맞춤 상담", "📊 가격 비교", "⚡ 즉시 견적"],
                    ctaText: "AI 상담 시작"
                },
                products: {
                    title: "지금 가장 인기있는 상품",
                    subtitle: "할인율 높은 순으로 AI가 엄선한 추천 상품"
                },
                reviews: {
                    title: "실시간 고객 후기",
                    subtitle: "실제 구매 고객들의 생생한 경험담"
                },
                brands: {
                    title: "제조사별 상품",
                    subtitle: "원하는 브랜드를 선택해 보세요"
                },
                urls: {
                    ai: "https://nofee.team/ai",
                    products: "https://nofee.team/more",
                    product: "https://nofee.team/ai",
                    brand: "https://nofee.team/more"
                }
            };
        },

        updateBasicUI() {
            if (!state.config) return;
            
            const config = state.config;
            
            // 사이트 제목 업데이트
            if (config.site?.title) {
                document.title = config.site.title;
            }
            
            // CSS 변수 업데이트 (테마 색상)
            if (config.theme) {
                const root = document.documentElement;
                Object.entries(config.theme).forEach(([key, value]) => {
                    root.style.setProperty(`--site-${key}`, value);
                });
            }
        },

        async initializeAllSections() {
            try {
                // 순차적으로 섹션 초기화 (에러가 발생해도 다음 섹션 계속)
                await this.safeInit('Hero', () => this.initHeroSection());
                await this.safeInit('Region', () => this.initRegionSection());
                await this.safeInit('Banner', () => this.initBannerSection());
                await this.safeInit('AI', () => this.initAISection());
                await this.safeInit('Products', () => this.initProductsSection());
                await this.safeInit('PriceInfo', () => this.initPriceInfoSection());
                await this.safeInit('Reviews', () => this.initReviewsSection());
                await this.safeInit('Brand', () => this.initBrandSection());
                
                // 애니메이션 및 인터랙션 초기화
                this.initAnimations();
                this.initEventListeners();
                
                console.log('🎉 All sections initialized successfully');
                
            } catch (error) {
                console.error('❌ Section initialization failed:', error);
                // 에러가 발생해도 계속 진행
            }
        },

        async safeInit(sectionName, initFunction) {
            try {
                await initFunction();
                console.log(`✅ ${sectionName} section initialized`);
            } catch (error) {
                console.error(`❌ ${sectionName} section failed:`, error);
                // 에러가 발생해도 다른 섹션은 계속 초기화
            }
        },

        async initHeroSection() {
            if (!state.config?.hero) return;
            
            const { hero } = state.config;
            
            // Hero 텍스트 업데이트
            utils.setElementContent('#heroTitle', hero.title, true);
            utils.setElementContent('#heroSubtitle', hero.subtitle);
            
            // Hero features 생성
            if (hero.features && Array.isArray(hero.features)) {
                const featuresContainer = document.getElementById('heroFeatures');
                if (featuresContainer) {
                    featuresContainer.innerHTML = '';
                    
                    hero.features.forEach(feature => {
                        const badge = utils.createElement('div', 'feature-badge');
                        badge.innerHTML = `
                            <span class="emoji">${feature.emoji}</span>
                            ${feature.text}
                        `;
                        featuresContainer.appendChild(badge);
                    });
                }
            }
            
            utils.showSection('heroSection');
        },

        async initRegionSection() {
            if (!state.regions || state.regions.length === 0) {
                console.log('⚠️ No regions data, skipping region section');
                return;
            }
            
            const regionGrid = document.getElementById('regionGrid');
            if (!regionGrid) return;
            
            regionGrid.innerHTML = '';
            
            // 지역 데이터 처리
            const regions = Array.isArray(state.regions) ? state.regions : [state.regions];
            
            regions.forEach(region => {
                const regionItem = utils.createElement('div', 'region-item');
                regionItem.textContent = region.name || region;
                regionItem.dataset.regionId = region.id || region.name || region;
                
                regionItem.addEventListener('click', () => {
                    // 이전 선택 제거
                    regionGrid.querySelectorAll('.region-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    // 새로운 선택
                    regionItem.classList.add('selected');
                    state.selectedRegion = region;
                    
                    console.log('📍 Region selected:', region);
                    
                    // 상품 필터링 업데이트 (필요시)
                    if (state.isDataLoaded) {
                        this.updateProductsForRegion();
                    }
                });
                
                regionGrid.appendChild(regionItem);
            });
            
            utils.showSection('regionSection');
        },

        async initBannerSection() {
            if (!state.banners || state.banners.length === 0) {
                console.log('⚠️ No banners data, using default banners');
                // 기본 배너 사용
                state.banners = [
                    {
                        title: "전국 어디서나<br><strong>성지 가격</strong>으로 드립니다",
                        subtitle: "오직 노피 입점 대리점에서만 가능한 특가",
                        emoji: "🎯"
                    },
                    {
                        title: "AI가 찾아주는<br><strong>집근처 휴대폰 성지</strong>",
                        subtitle: "노피AI로 간편하게 최저가 비교하세요",
                        emoji: "🤖"
                    },
                    {
                        title: "부담없는 구매<br><strong>전화없이 견적신청</strong>",
                        subtitle: "신청과 카톡만으로 구매 끝!",
                        emoji: "⚡"
                    }
                ];
            }
            
            const track = document.getElementById('bannerTrack');
            const indicators = document.getElementById('bannerIndicators');
            
            if (!track || !indicators) return;
            
            track.innerHTML = '';
            indicators.innerHTML = '';
            
            state.banners.forEach((banner, index) => {
                // 슬라이드 생성
                const slide = utils.createElement('div', 'banner-slide');
                slide.innerHTML = `
                    <div class="slide-content">
                        <div class="slide-text">
                            <h3>${banner.title}</h3>
                            <p>${banner.subtitle}</p>
                        </div>
                        <div class="slide-visual">${banner.emoji}</div>
                    </div>
                `;
                track.appendChild(slide);
                
                // 인디케이터 생성
                const indicator = utils.createElement('div', index === 0 ? 'indicator active' : 'indicator');
                indicator.addEventListener('click', () => {
                    this.goToBannerSlide(index);
                    this.stopBannerAutoSlide();
                    setTimeout(() => this.startBannerAutoSlide(), 3000);
                });
                indicators.appendChild(indicator);
            });
            
            this.startBannerAutoSlide();
            utils.showSection('bannerSection');
        },

        async initAISection() {
            if (!state.config?.ai) return;
            
            const { ai } = state.config;
            
            // AI 섹션 텍스트 업데이트
            utils.setElementContent('#aiBadgeText', ai.badgeText || '노피 AI');
            utils.setElementContent('#aiTitle', ai.title, true);
            utils.setElementContent('#aiDescription', ai.description, true);
            utils.setElementContent('#aiCtaText', ai.ctaText || 'AI 상담 시작');
            
            // AI features 생성
            if (ai.features && Array.isArray(ai.features)) {
                const featuresContainer = document.getElementById('aiFeatures');
                if (featuresContainer) {
                    featuresContainer.innerHTML = '';
                    
                    ai.features.forEach(feature => {
                        const tag = utils.createElement('span', 'feature-tag', feature);
                        featuresContainer.appendChild(tag);
                    });
                }
            }
            
            // AI CTA 클릭 이벤트
            const aiCard = document.getElementById('aiCtaCard');
            if (aiCard && state.config.urls?.ai) {
                aiCard.addEventListener('click', () => {
                    window.open(state.config.urls.ai, '_blank');
                });
                
                aiCard.setAttribute('tabindex', '0');
                aiCard.setAttribute('role', 'button');
                aiCard.setAttribute('aria-label', ai.ctaText || 'AI 상담 시작');
            }
            
            utils.showSection('aiCtaSection');
        },

        async initProductsSection() {
            if (!state.products || state.products.length === 0) {
                console.log('⚠️ No products data, skipping products section');
                return;
            }
            
            // 섹션 제목 업데이트
            if (state.config?.products) {
                utils.setElementContent('#productsTitle', state.config.products.title || '지금 가장 인기있는 상품');
                utils.setElementContent('#productsSubtitle', state.config.products.subtitle || '할인율 높은 순으로 AI가 엄선한 추천 상품');
                utils.setElementContent('#loadMoreText', state.config.products.loadMoreText || '전체 상품 보기');
            }
            
            // 상품 렌더링
            this.renderProducts();
            
            // 전체 상품 보기 버튼 이벤트
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn && state.config?.urls?.products) {
                loadMoreBtn.addEventListener('click', () => {
                    window.open(state.config.urls.products, '_blank');
                });
            }
            
            utils.showSection('productsSection');
        },

        async initPriceInfoSection() {
            // 기본 가격 정보 표시
            const defaultPriceInfo = {
                title: "💰 상품 카드 가격 정보",
                subtitle: "각 숫자가 의미하는 바를 확인해보세요",
                cards: [
                    {
                        icon: "📱",
                        title: "출고가",
                        description: "제조사에서 정한 기본 판매가격이에요",
                        example: "예: 1,350,000원",
                        highlight: false
                    },
                    {
                        icon: "🎯",
                        title: "할인율",
                        description: "출고가 대비 얼마나 할인되는지 보여줘요",
                        example: "예: 40% 할인",
                        highlight: false
                    },
                    {
                        icon: "💳",
                        title: "월 납부금",
                        description: "기기값 + 요금제를 합친 실제 월 납부 금액",
                        example: "예: 월 65,000원",
                        highlight: true
                    }
                ]
            };
            
            const priceInfo = state.config?.priceInfo || defaultPriceInfo;
            
            // 제목 업데이트
            utils.setElementContent('#priceInfoTitle', priceInfo.title);
            utils.setElementContent('#priceInfoSubtitle', priceInfo.subtitle);
            
            // 정보 카드들 생성
            if (priceInfo.cards && Array.isArray(priceInfo.cards)) {
                const cardsContainer = document.getElementById('infoCards');
                if (cardsContainer) {
                    cardsContainer.innerHTML = '';
                    
                    priceInfo.cards.forEach(card => {
                        const cardElement = utils.createElement('div', 'info-card');
                        cardElement.innerHTML = `
                            <div class="info-icon">${card.icon}</div>
                            <div class="info-content">
                                <h4>${card.title}</h4>
                                <p>${card.description}</p>
                                <div class="info-example ${card.highlight ? 'highlight' : ''}">${card.example}</div>
                            </div>
                        `;
                        cardsContainer.appendChild(cardElement);
                    });
                }
            }
            
            utils.showSection('priceInfoSection');
        },

        async initReviewsSection() {
            if (!state.reviews || state.reviews.length === 0) {
                console.log('⚠️ No reviews data, skipping reviews section');
                return;
            }
            
            // 섹션 제목 업데이트
            if (state.config?.reviews) {
                utils.setElementContent('#reviewsTitle', state.config.reviews.title || '실시간 고객 후기');
                utils.setElementContent('#reviewsSubtitle', state.config.reviews.subtitle || '실제 구매 고객들의 생생한 경험담');
            }
            
            // 평점 통계 계산 및 표시
            this.updateReviewStats();
            
            // 리뷰 렌더링
            this.renderReviews();
            
            utils.showSection('reviewsSection');
        },

        async initBrandSection() {
            if (!state.brands || Object.keys(state.brands).length === 0) {
                console.log('⚠️ No brands data, skipping brand section');
                return;
            }
            
            // 섹션 제목 업데이트
            if (state.config?.brands) {
                utils.setElementContent('#brandTitle', state.config.brands.title || '제조사별 상품');
                utils.setElementContent('#brandSubtitle', state.config.brands.subtitle || '원하는 브랜드를 선택해 보세요');
            }
            
            // 브랜드 렌더링
            this.renderBrands();
            
            utils.showSection('brandSection');
        },

        updateProductsForRegion() {
            console.log('🔄 Updating products for region:', state.selectedRegion);
            this.renderProducts();
        },

        renderProducts() {
            const loadingElement = document.getElementById('productsLoading');
            const gridElement = document.getElementById('productsGrid');
            
            if (!loadingElement || !gridElement) return;
            
            // 상품 필터링 및 정렬
            const filteredProducts = this.filterAndSortProducts();
            
            // 로딩 숨기고 그리드 표시
            loadingElement.style.display = 'none';
            gridElement.style.display = 'grid';
            gridElement.innerHTML = '';
            
            // 상품이 없을 경우
            if (filteredProducts.length === 0) {
                gridElement.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-500);">표시할 상품이 없습니다.</div>';
                return;
            }
            
            // 상품 카드 생성
            filteredProducts.slice(0, 4).forEach((product, index) => {
                const card = this.createProductCard(product);
                gridElement.appendChild(card);
                
                // 스태거드 애니메이션
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 150);
            });
        },

        filterAndSortProducts() {
            return state.products
                .filter(product => {
                    // 기본 필터링
                    if (product.total < 30000) return false;
                    
                    // 지역 필터링 (선택적)
                    if (state.selectedRegion && product.region && product.region !== state.selectedRegion.id) {
                        return false;
                    }
                    
                    return true;
                })
                .map(product => {
                    const { discountRate } = this.calculateDiscount(product.model, product.principal);
                    return { ...product, discountRate };
                })
                .sort((a, b) => {
                    if (a.discountRate === 0 && b.discountRate === 0) {
                        return a.total - b.total;
                    }
                    return b.discountRate - a.discountRate;
                });
        },

        createProductCard(product) {
            const brandInfo = this.getBrandInfo(product.brand);
            const { discount, discountRate, originPrice } = this.calculateDiscount(product.model, product.principal);
            
            const card = utils.createElement('div', 'product-card');
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            
            const supportText = this.getSupportText(product.support);
            
            card.innerHTML = `
                <div class="product-header">
                    <div class="brand-icon ${brandInfo.hasImage ? '' : 'text-icon'}" ${brandInfo.hasImage ? `style="background-image: url(${brandInfo.logo})"` : ''}>${brandInfo.hasImage ? '' : brandInfo.icon}</div>
                    <div class="product-info">
                        <h4>${utils.sanitizeHTML(product.model)}</h4>
                        <div class="product-meta">
                            <span class="meta-tag">${utils.sanitizeHTML(product.carrier)}</span>
                            <span class="meta-tag">${utils.sanitizeHTML(product.type)}</span>
                            <span class="meta-tag">${utils.sanitizeHTML(supportText)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="price-section">
                    <div class="original-price">
                        <span class="price-original">${utils.formatKRW(originPrice)}</span>
                        ${discountRate > 0 ? `<span class="discount-badge">${discountRate}% 할인</span>` : ''}
                    </div>
                    ${discount > 0 ? `<div class="discount-amount">- ${utils.formatKRW(discount)} 할인</div>` : ''}
                </div>
                
                <div class="final-price">
                    <div class="price-label">월 납부금 (기기값 + 요금제)</div>
                    <div class="price-value">${utils.formatKRW(product.total)}</div>
                </div>
            `;
            
            // 클릭 이벤트
            card.addEventListener('click', () => {
                this.handleProductClick(product);
            });
            
            return card;
        },

        renderReviews() {
            const reviewsScroll = document.getElementById('reviewsScroll');
            if (!reviewsScroll) return;
            
            reviewsScroll.innerHTML = '';
            
            state.reviews.forEach((review, index) => {
                const stars = '⭐'.repeat(Math.floor(review.rating));
                
                const reviewCard = utils.createElement('div', 'review-card');
                reviewCard.style.opacity = '0';
                reviewCard.style.transform = 'translateY(20px)';
                
                let comment = review.comment;
                if (review.highlight) {
                    comment = comment.replace(
                        new RegExp(review.highlight, 'gi'),
                        `<span class='review-highlight'>${review.highlight}</span>`
                    );
                }
                
                reviewCard.innerHTML = `
                    <div class="review-header">
                        <div class="reviewer-avatar">${review.initial}</div>
                        <div class="reviewer-info">
                            <h5>${utils.sanitizeHTML(review.name)}</h5>
                            <div class="review-rating">${stars} ${review.rating}</div>
                        </div>
                    </div>
                    <div class="review-product">${utils.sanitizeHTML(review.product)}</div>
                    <div class="review-text">${comment}</div>
                `;
                
                reviewsScroll.appendChild(reviewCard);
                
                // 스태거드 애니메이션
                setTimeout(() => {
                    reviewCard.style.opacity = '1';
                    reviewCard.style.transform = 'translateY(0)';
                    reviewCard.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                }, index * 100);
            });
            
            // 자동 스크롤 시작
            this.startReviewAutoScroll();
        },

        renderBrands() {
            const brandGrid = document.getElementById('brandGrid');
            if (!brandGrid) return;
            
            brandGrid.innerHTML = '';
            
            Object.entries(state.brands).forEach(([brandName, brandData], index) => {
                const stats = this.calculateBrandStats(brandName);
                
                const brandCard = utils.createElement('div', 'brand-card');
                brandCard.style.opacity = '0';
                brandCard.style.transform = 'translateY(20px)';
                
                brandCard.innerHTML = `
                    ${brandData.logo ? `
                        <div class="brand-logo">
                            <img src="${brandData.logo}" alt="${brandName}" loading="lazy">
                        </div>
                    ` : ''}
                    <h4>${utils.sanitizeHTML(brandName)}</h4>
                    <p>${utils.sanitizeHTML(brandData.description || '')}</p>
                    <div class="brand-stats">
                        <div class="stat-row">
                            <span class="stat-label">인기 모델</span>
                            <span class="stat-value">${utils.sanitizeHTML(stats.popularModel.replace('갤럭시 ', ''))}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">최대 할인</span>
                            <span class="stat-value highlight">${stats.maxDiscount}%</span>
                        </div>
                    </div>
                    <div class="brand-arrow">›</div>
                `;
                
                brandCard.addEventListener('click', () => {
                    this.handleBrandClick(brandName);
                });
                
                brandGrid.appendChild(brandCard);
                
                // 스태거드 애니메이션
                setTimeout(() => {
                    brandCard.style.opacity = '1';
                    brandCard.style.transform = 'translateY(0)';
                    brandCard.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                }, index * 200);
            });
        },

        updateReviewStats() {
            const ratingSummary = document.getElementById('ratingSummary');
            if (!ratingSummary || !state.reviews.length) return;
            
            // 평점 통계 계산
            const totalRating = state.reviews.reduce((sum, review) => sum + review.rating, 0);
            const avgRating = (totalRating / state.reviews.length).toFixed(1);
            const starDisplay = '⭐'.repeat(Math.floor(avgRating));
            
            ratingSummary.innerHTML = `
                <span class="rating-score">${avgRating}</span>
                <div>
                    <div class="rating-stars">${starDisplay}</div>
                    <div class="rating-count">${state.reviews.length.toLocaleString()}개 리뷰</div>
                </div>
            `;
        },

        // Helper 메서드들
        getBrandInfo(brand) {
            const brandData = state.brands[brand] || {};
            
            return {
                icon: brandData.icon || brand.charAt(0).toUpperCase(),
                logo: brandData.logo,
                hasImage: !!brandData.logo,
                displayName: brand
            };
        },

        getOriginPrice(model) {
            if (state.models[model]) {
                return state.models[model].originPrice;
            }
            
            // 부분 매칭
            for (const [key, value] of Object.entries(state.models)) {
                if (model.includes(key) || key.includes(model)) {
                    return value.originPrice;
                }
            }
            
            // 기본값
            return 1000000;
        },

        calculateDiscount(model, principal) {
            const originPrice = this.getOriginPrice(model);
            if (principal >= 0) {
                return { discount: 0, discountRate: 0, originPrice };
            }
            
            const discount = Math.abs(principal);
            const discountRate = Math.round((discount / originPrice) * 100);
            return { discount, discountRate, originPrice };
        },

        getSupportText(support) {
            const supportMap = {
                'O': '지원금O',
                'X': '지원금X',
                '공시지원': '공시지원',
                '선택약정': '선택약정'
            };
            return supportMap[support] || support;
        },

        calculateBrandStats(brandName) {
            const brandProducts = state.products.filter(p => 
                p.brand === brandName || p.brand.toLowerCase() === brandName.toLowerCase()
            );
            
            if (brandProducts.length === 0) {
                return {
                    maxDiscount: 0,
                    popularModel: state.brands[brandName]?.defaultModel || 'N/A',
                    count: 0
                };
            }
            
            let maxDiscount = 0;
            let popularModel = brandProducts[0].model;
            
            brandProducts.forEach(product => {
                const { discountRate } = this.calculateDiscount(product.model, product.principal);
                if (discountRate > maxDiscount) {
                    maxDiscount = discountRate;
                    popularModel = product.model;
                }
            });
            
            return {
                maxDiscount,
                popularModel,
                count: brandProducts.length
            };
        },

        // 이벤트 핸들러들
        handleProductClick(product) {
            if (!state.config?.urls?.product) {
                window.open('https://nofee.team/ai', '_blank');
                return;
            }
            
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
            
            window.open(state.config.urls.product + '?' + params.toString(), '_blank');
        },

        handleBrandClick(brandName) {
            const baseUrl = state.config?.urls?.brand || 'https://nofee.team/more';
            
            const url = new URL(baseUrl);
            url.searchParams.set('brand', brandName);
            window.open(url.toString(), '_blank');
        },

        // 배너 슬라이더 메서드들
        goToBannerSlide(index) {
            state.currentBannerIndex = index;
            const track = document.getElementById('bannerTrack');
            const indicators = document.querySelectorAll('#bannerIndicators .indicator');
            
            if (track) {
                track.style.transform = `translateX(-${state.currentBannerIndex * 100}%)`;
            }
            
            indicators.forEach((indicator, i) => {
                indicator.classList.toggle('active', i === state.currentBannerIndex);
            });
        },

        nextBannerSlide() {
            const nextIndex = (state.currentBannerIndex + 1) % state.banners.length;
            this.goToBannerSlide(nextIndex);
        },

        startBannerAutoSlide() {
            if (state.banners.length > 1) {
                state.bannerInterval = setInterval(() => {
                    this.nextBannerSlide();
                }, 5000);
            }
        },

        stopBannerAutoSlide() {
            if (state.bannerInterval) {
                clearInterval(state.bannerInterval);
                state.bannerInterval = null;
            }
        },

        // 리뷰 자동 스크롤
        startReviewAutoScroll() {
            const reviewsScroll = document.getElementById('reviewsScroll');
            if (!reviewsScroll) return;
            
            let scrollPosition = 0;
            const scrollStep = 320;
            let autoScrollInterval;
            let userInteracting = false;
            
            const autoScroll = () => {
                const maxScroll = reviewsScroll.scrollWidth - reviewsScroll.clientWidth;
                
                if (scrollPosition >= maxScroll) {
                    scrollPosition = 0;
                } else {
                    scrollPosition += scrollStep;
                }
                
                reviewsScroll.scrollTo({
                    left: scrollPosition,
                    behavior: 'smooth'
                });
            };
            
            const startAuto = () => {
                autoScrollInterval = setInterval(() => {
                    if (!userInteracting) autoScroll();
                }, 4000);
            };
            
            const stopAuto = () => {
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    autoScrollInterval = null;
                }
            };
            
            // 이벤트 리스너
            ['touchstart', 'mousedown'].forEach(event => {
                reviewsScroll.addEventListener(event, () => {
                    userInteracting = true;
                    stopAuto();
                }, { passive: true });
            });
            
            ['touchend', 'mouseup'].forEach(event => {
                reviewsScroll.addEventListener(event, () => {
                    userInteracting = false;
                    setTimeout(startAuto, 3000);
                }, { passive: true });
            });
            
            reviewsScroll.addEventListener('mouseenter', () => {
                userInteracting = true;
                stopAuto();
            });
            
            reviewsScroll.addEventListener('mouseleave', () => {
                userInteracting = false;
                setTimeout(startAuto, 1000);
            });
            
            startAuto();
        },

        // 애니메이션 초기화
        initAnimations() {
            const sections = document.querySelectorAll('.nofee-section');
            
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                        }
                    });
                }, {
                    threshold: 0.1,
                    rootMargin: '0px 0px -50px 0px'
                });
                
                sections.forEach(section => {
                    observer.observe(section);
                });
            } else {
                sections.forEach(section => {
                    section.classList.add('visible');
                });
            }
        },

        // 이벤트 리스너 초기화
        initEventListeners() {
            // 페이지 가시성 변경 처리
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.stopBannerAutoSlide();
                } else {
                    this.startBannerAutoSlide();
                }
            });

            // 키보드 접근성
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    // 필요시 모달 닫기 등
                }
            });

            // 에러 발생 시 처리
            window.addEventListener('error', (e) => {
                console.error('Runtime error:', e.error);
            });

            window.addEventListener('unhandledrejection', (e) => {
                console.error('Unhandled promise rejection:', e.reason);
            });
        },

        showError(message) {
            utils.hideSection('initialLoading');
            utils.setElementContent('#errorMessage', message);
            utils.showSection('errorSection');
        }
    };

    // 🚀 메인 초기화 함수
    async function initNofeeMain() {
        try {
            console.log('🚀 노피 메인페이지 v3.1 초기화 시작 (에러 핸들링 개선)');
            
            // 모든 데이터 로드 및 UI 초기화
            await dataLoader.loadAllData();
            
            // 전역 함수 등록 (웹플로우 호환성)
            window.nofeeState = state;
            window.selectBrand = (brand) => dataLoader.handleBrandClick(brand);
            
            console.log('✅ 노피 메인페이지 v3.1 초기화 완료');
            
            // 초기화 완료 이벤트
            window.dispatchEvent(new CustomEvent('nofeeMainReady', {
                detail: { 
                    version: '3.1', 
                    timestamp: Date.now(),
                    dataLoaded: state.isDataLoaded,
                    errors: state.loadingErrors
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
        if (state.bannerInterval) {
            clearInterval(state.bannerInterval);
        }
    });

})();
